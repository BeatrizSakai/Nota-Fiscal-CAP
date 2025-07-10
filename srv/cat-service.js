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
      const { grpFilho } = req.data || {};
      if (!grpFilho) return req.error(400, 'grpFilho é obrigatório');
  
      const tx = cds.transaction(req);
      const rows = await tx.run(
        SELECT.from(NotaFiscalServicoMonitor).columns(
          'idAlocacaoSAP', 'status', 'issRetido', 'valorBrutoNfse',
          'valorEfetivoFrete', 'valorLiquidoFreteNfse'
        ).where({ chaveDocumentoFilho: grpFilho })
      );
      if (!rows.length) return req.error(404, 'Nenhuma NF encontrada');
  
      const grpStatus = rows[0].status;
      const ids = rows.map(r => r.idAlocacaoSAP);
  
      switch (grpStatus) {
        case '01': return etapas.avancar.trans01para05(tx, rows);
        case '05': return etapas.avancar.trans05para15(tx, ids);
        case '15': return etapas.avancar.trans15para30(tx, rows);
        case '30': return etapas.avancar.trans30para35(tx, rows);
        case '35': return etapas.avancar.trans35para50(tx, ids);
        default: return req.error(400, `Status ${grpStatus} não suportado`);
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
  
  
    this.on('rejeitarFrete', async req => {
      const { grpFilho } = req.data || {};
      if (!grpFilho) return req.error(400, 'grpFilho é obrigatório');
  
      const tx = cds.transaction(req);
  
      /* 1️⃣  Pega todos os IDs do grupo ------------------------- */
      const linhas = await tx.run(
        SELECT.from(NotaFiscalServicoMonitor)
          .columns('idAlocacaoSAP')
          .where({ chaveDocumentoFilho: grpFilho })
      );
      if (!linhas.length) return req.error(404, 'Nenhuma NF no grupo');
  
      const ids = linhas.map(l => l.idAlocacaoSAP);
  
      /* 2️⃣  Atualiza status para 55 + grava LOG "R" ------------ */
      try {
        await tx.update(NotaFiscalServicoMonitor)
          .set({ status: '55' })
          .where({ chaveDocumentoFilho: grpFilho });
  
        // um log "R" para cada NF  ➜ gravarLog já propaga campos na tabela
        await Promise.all(
          ids.map(id =>
            gravarLog(
              tx,
              id,
              'Frete rejeitado – status 55',
              'R',                       // tipoMensagemErro = Rejeitado
              'REJ_FRETE',               // classe
              '055',                     // número
              'rejeitarFrete'            // origem
            )
          )
        );
  
        return sucesso(ids, '55');       // helper padrão
  
      } catch (e) {
        // Se algo falhar, gera um log de erro por NF
        await Promise.all(
          ids.map(id =>
            gravarLog(
              tx,
              id,
              e.message,
              'E', 'REJ_FRETE', '055', 'rejeitarFrete'
            )
          )
        );
        return falha(ids, '55', 'Falha ao rejeitar: ' + e.message);
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
  