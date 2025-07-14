const cds = require('@sap/cds');
const csv = require('csv-parser');
const { Readable } = require('stream');
const validation = require('./lib/validation');
const processor = require('./lib/uploadProcessor');

require('dotenv').config();


module.exports = cds.service.impl(function (srv) {
    const etapas = require('./nf/etapas')(srv);    
    const { sucesso, falha, gravarLog } = require('./nf/log');
    
  
    const { NotaFiscalServicoMonitor} = srv.entities;
  
    console.log("✅ CAP Service inicializado");
    
srv.before('CREATE', 'NotaFiscalServicoMonitor', async (req) => {
    console.log("✅ [BACKEND] Recebido 'before CREATE' para NotaFiscalServicoMonitor.");
    
    let todosOsErros = [];
  
    // --- Bloco 1: Validação de Campos ---
    const validacaoCampos = validation.validarCampos(req.data);
    if (!validacaoCampos.isValid) {
        todosOsErros.push(...validacaoCampos.errors);
    }
  
    // --- Bloco 2: Validação de Consistência no Banco de Dados ---
    // Só executa se os campos básicos estiverem ok para evitar erros desnecessários.
    if (validacaoCampos.isValid) {
        const errosDeConsistencia = await validation.validarConsistenciaMaeFilhoNoBanco(
            req.data,
            this, // Passa o contexto do serviço (this)
            NotaFiscalServicoMonitor // Passa a entidade
        );
        if (errosDeConsistencia.length > 0) {
            todosOsErros.push(...errosDeConsistencia);
        }
    }
  
    // --- Conclusão da Validação ---
    if (todosOsErros.length > 0) {
        const mensagemDeErro = todosOsErros.join(' | ');
        console.error("❌ [BACKEND] Validação falhou. Erros:", mensagemDeErro);
        return req.error(400, mensagemDeErro);
    }
  
    console.log("✅ [BACKEND] Todas as validações passaram. Prosseguindo com a criação.");
  });
  
  this.on('avancarStatusNFs', async req => {
    const tx = cds.transaction(req);
  
    /* 1️⃣  Quais IDs foram enviados? (single-select ou multi-select) */
    let idsSelecionados = [];
    if (req.params?.length) {                           // múltiplas linhas
      idsSelecionados = req.params.map(p => p.ID);      // [{ID:'…'}] → ['…']
    } else if (req.data?.ID) {                          // bound em 1 linha
      idsSelecionados = [req.data.ID];
    } else {
      return req.error(400, 'Nenhum ID recebido na requisição.');
    }
  
    /* 2️⃣  Uma ÚNICA query traz tudo que precisamos p/ validar */
    const rowsSelecionadas = await tx.run(
      SELECT.from(NotaFiscalServicoMonitor).columns(
        'ID',                   // chave primária
        'idAlocacaoSAP',        // você ainda usa depois
        'chaveDocumentoFilho',
        'status',
        'issRetido',
        'valorBrutoNfse',
        'valorEfetivoFrete',
        'valorLiquidoFreteNfse'
      ).where({ ID: { in: idsSelecionados } })
    );
  
    if (!rowsSelecionadas.length) {
      return req.error(404, 'Nenhuma NF encontrada para os IDs enviados.');
    }
  
    /* 3️⃣  Validações em memória (0 chamadas extras) */
    const grupos   = new Set(rowsSelecionadas.map(r => r.chaveDocumentoFilho));
    const statuses = new Set(rowsSelecionadas.map(r => r.status));
  
    if (grupos.size   > 1)
      return req.error(400, 'Seleção contém NFs de grupos (chaveDocumentoFilho) diferentes.');
  
    if (statuses.size > 1)
      return req.error(400, 'Seleção contém NFs com status diferentes. Avanço bloqueado.');
  
    const [grupoFilho] = grupos;     // único valor que restou
    const [grpStatus]  = statuses;
  
    /* 4️⃣  Se suas etapas atuam no GRUPO COMPLETO, carrega-o agora   */
    const rowsGrupo = await tx.run(
      SELECT.from(NotaFiscalServicoMonitor).columns(
        'ID', 'idAlocacaoSAP', 'status',
        'issRetido', 'valorBrutoNfse',
        'valorEfetivoFrete', 'valorLiquidoFreteNfse'
      ).where({ chaveDocumentoFilho: grupoFilho })
    );
    const idsGrupo = rowsGrupo.map(r => r.idAlocacaoSAP);
  
    /* 5️⃣  Roteia para a etapa correta */
    switch (grpStatus) {
      case '01': return etapas.avancar.trans01para05(tx, rowsGrupo, req);
      case '05': return etapas.avancar.trans05para15(tx, idsGrupo,  req);
      case '15': return etapas.avancar.trans15para30(tx, rowsGrupo, req);
      case '30': return etapas.avancar.trans30para35(tx, rowsGrupo, req);
      case '35': return etapas.avancar.trans35para50(tx, idsGrupo,  req);
      default :  return req.error(400, `Status ${grpStatus} não suportado para avanço.`);
    }
  });
  
  

  
    this.on('voltarStatusNFs', async req => {
      const { grpFilho, grpStatus } = req.data;
      if (!grpFilho || grpStatus === undefined)
        return req.error(400, 'grpFilho e grpStatus são obrigatórios');
  
      const tx = cds.transaction(req);
      const nfs = await tx.read(NotaFiscalServicoMonitor).where({
        chaveDocumentoFilho: grpFilho, status: grpStatus
      });
  
      if (!nfs.length) return [];
  
      switch (grpStatus) {
        case '50': return etapas.voltar.trans50para35_reverso(tx, nfs);
        case '35': return etapas.voltar.trans35para30_reverso(tx, nfs);
        case '30': return etapas.voltar.trans30para15_reverso(tx, nfs);
        case '15': return etapas.voltar.trans15para05_reverso(tx, nfs);
        case '05': return etapas.voltar.trans05para01_reverso(tx, nfs);
        default: return req.error(400, `Reversão não permitida para ${grpStatus}`);
      }
    });
  
  
    this.on('rejeitarFrete', NotaFiscalServicoMonitor, async req => {
      const tx = cds.transaction(req);
      const { NotaFiscalServicoMonitor } = this.entities;
  
      // 2️ Descobre a chave da NF selecionada
      if (!req.params || req.params.length === 0) {
          return req.error(400, 'Nenhuma nota fiscal foi selecionada para a rejeição.');
      }
      const key = req.params[0]; // Pega a primeira (e única) nota selecionada
      console.log(`[HANDLER] - Ação "rejeitarFrete" chamada para a NF com chave:`, key);
  
      //  Busca a chave do grupo a partir da NF selecionada
      const nf = await tx.run(SELECT.one.from(NotaFiscalServicoMonitor).columns('chaveDocumentoFilho').where(key));
      if (!nf || !nf.chaveDocumentoFilho) {
          return req.error(404, 'Não foi possível encontrar o grupo de frete para a nota selecionada.');
      }
      const { chaveDocumentoFilho } = nf;
      console.log(`[HANDLER] - Grupo de frete a ser rejeitado: ${chaveDocumentoFilho}`);
  
      //  Busca todos os IDs do grupo para a operação em lote
      const linhas = await tx.run(SELECT.from(NotaFiscalServicoMonitor).columns('idAlocacaoSAP').where({ chaveDocumentoFilho }));
      if (!linhas.length) {
          return req.error(404, `Nenhuma NF encontrada para o grupo "${chaveDocumentoFilho}".`);
      }
      const ids = linhas.map(l => l.idAlocacaoSAP);
  
      /* 5️⃣ Atualiza status para 55 e grava o log */
      try {
          await tx.update(NotaFiscalServicoMonitor).set({ status: '55' }).where({ chaveDocumentoFilho });
          
          await Promise.all(
              ids.map(id =>
                  gravarLog(tx, id, 'Frete rejeitado – status movido para 55.', 'R', 'REJ_FRETE', '055', 'rejeitarFrete')
              )
          );
  
          //  RESUMO DE SUCESSO PARA A UI 
          req.info({
              code: 'REJ_FRETE_OK',
              message: `${ids.length} NF(s) do grupo foram rejeitadas com sucesso (status 55).`,
              numericSeverity: 2
          });
  
          return sucesso(ids, '55', {}, 'Frete rejeitado com sucesso.');
  
      } catch (e) {
          console.error(`[HANDLER] - Erro ao rejeitar o grupo ${chaveDocumentoFilho}:`, e);
          await Promise.all(
              ids.map(id =>
                  gravarLog(tx, id, e.message, 'E', 'REJ_FRETE_FAIL', '997', 'rejeitarFrete')
              )
          );
          req.error(500, `Ocorreu um erro técnico ao tentar rejeitar as notas: ${e.message}`);
          return falha(ids, 'ERRO', 'Falha ao rejeitar: ' + e.message);
      }
  });
  
  
    // =======================================================
    // ==                  FUNÇÕES HELPER                   ==
    // =======================================================
  
    this.on('uploadArquivoFrete', async (req) => {
      console.log('\n[Upload de Arquivo] 🚀 Início do processamento.');
      const { data } = req.data;
      if (!data) return req.error(400, 'Nenhum arquivo recebido.');
  
      const buffer = Buffer.from(data.split(';base64,')[1], 'base64');
      const stream = Readable.from(buffer).pipe(csv({ mapHeaders: ({ header }) => header.trim() }));
  
      try {
        await cds.tx(async (tx) => {
          tx.req = req;
          console.log("  [Orquestrador] Transação iniciada. Delegando para o processador...");
  
            // 1. Processa o stream e valida linhas individuais
            const batch = await processor.processarStream(stream);
  
          // 2. Executa validações no lote completo (consistência, duplicados)
          await processor.validarLoteCompleto(batch, tx, NotaFiscalServicoMonitor);
  
          // 3. Insere os registros no banco
          await processor.inserirRegistros(batch, tx, NotaFiscalServicoMonitor);
  
          console.log("  [Orquestrador] ✨ Processo concluído. Notificando o usuário.");
          req.notify(`Arquivo processado e ${batch.length} registros importados com sucesso!`);
        });
  
        console.log('[Upload de Arquivo] ✅ Processo finalizado com sucesso.');
        return true;
  
      } catch (error) {
        // O erro pode vir de qualquer uma das etapas do processador
        console.error(`\n[Upload de Arquivo] ❌ FALHA! Rollback executado. Motivo: ${error.message}\n`);
        return req.error(400, error.message);
      }
    });
  
  });
  