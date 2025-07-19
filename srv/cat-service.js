const cds = require('@sap/cds');
const csv = require('csv-parser');
const { Readable } = require('stream');
const validation = require('./lib/validation');

require('dotenv').config();

module.exports = cds.service.impl(function (srv) {
  const etapas = require('./nf/etapas')(srv);
  const { sucesso, falha, gravarLog } = require('./nf/log');


  const { NotaFiscalServicoMonitor } = srv.entities;

  console.log("✅ CAP Service inicializado");

  srv.before('SAVE', NotaFiscalServicoMonitor, async (req) => {
    console.log("✅ [BACKEND] Recebido 'before SAVE' para NotaFiscalServicoMonitor. Iniciando validações...");

    // Pega apenas os dados que não são nulos para validar, 
    // pois o Fiori Elements pode enviar muitos campos nulos no rascunho.
    const dadosParaValidar = req.data;

    let todosOsErros = [];

    // --- Bloco 1: Validação de Campos ---
    const validacaoCampos = validation.validarCampos(dadosParaValidar);
    if (!validacaoCampos.isValid) {
      todosOsErros.push(...validacaoCampos.errors);
    }

    // --- Bloco 2: Validação de Consistência no Banco de Dados ---
    // Só executa se os campos básicos estiverem ok.
    if (validacaoCampos.isValid) {
      const errosDeConsistencia = await validation.validarConsistenciaMaeFilhoNoBanco(
        dadosParaValidar,
        this, // Passa o contexto do serviço (this)
        NotaFiscalServicoMonitor // Passa a entidade
      );
      if (errosDeConsistencia.length > 0) {
        todosOsErros.push(...errosDeConsistencia);
      }
    }

    // --- Conclusão da Validação ---
    if (todosOsErros.length > 0) {
      const mensagemDeErro = todosOsErros.join(' \n ');
      console.error("❌ [BACKEND] Validação no SAVE falhou. Erros:", mensagemDeErro);
      // Rejeita a operação 'SAVE'. A mensagem vai para a UI.
      return req.error(400, mensagemDeErro);
    }

    console.log("✅ [BACKEND] Todas as validações no SAVE passaram. Prosseguindo para o CREATE/UPDATE.");
  });


  // --- SEU BLOCO 'CREATE' ANTIGO, AGORA SIMPLIFICADO ---
  // Este handler agora só roda se o 'SAVE' passar.
  // Você pode usá-lo para lógicas finais, como preencher um campo de log,
  // mas a validação principal já aconteceu.
  srv.before('CREATE', NotaFiscalServicoMonitor, async (req) => {
    console.log("✅ [BACKEND] Recebido 'before CREATE'. A validação já foi aprovada no 'SAVE'.");
    // Lógica de enriquecimento final, se necessário.
    // Ex: req.data.campoLog = 'CRIADO_COM_SUCESSO';
  });

  // Apenas para debug, para você ver o fluxo completo
  srv.after('NEW', NotaFiscalServicoMonitor, (data) => {
    console.log("➡️ [BACKEND] Recebido 'after NEW'. Um rascunho foi criado na interface.");
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
    const grupos = new Set(rowsSelecionadas.map(r => r.chaveDocumentoFilho));
    const statuses = new Set(rowsSelecionadas.map(r => r.status));

    if (grupos.size > 1)
      return req.error(400, 'Seleção contém NFs de grupos (chaveDocumentoFilho) diferentes.');

    if (statuses.size > 1)
      return req.error(400, 'Seleção contém NFs com status diferentes. Avanço bloqueado.');

    const [grupoFilho] = grupos;     // único valor que restou
    const [grpStatus] = statuses;

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
      case '05': return etapas.avancar.trans05para15(tx, idsGrupo, req);
      case '15': return etapas.avancar.trans15para30(tx, rowsGrupo, req);
      case '30': return etapas.avancar.trans30para35(tx, rowsGrupo, req);
      case '35': return etapas.avancar.trans35para50(tx, idsGrupo, req);
      default: return req.error(400, `Status ${grpStatus} não suportado para avanço.`);
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

  this.after('READ', 'NotaFiscalServicoMonitor', (rows) => {
    rows = Array.isArray(rows) ? rows : [rows];
    const basePath = '/monitor/webapp/images/';

    for (const row of rows) {
      // criticality 
      row.criticality = row.status === '50' ? 3
        : row.status === '55' ? 1
          : 0;

      // icone
      if (row.tipoMensagemErro === 'S') row.logIcon = basePath + 'log-square-green.png';
      else if (row.tipoMensagemErro === 'E') row.logIcon = basePath + 'log-triangle-yellow.png';
      else if (row.tipoMensagemErro === 'R') row.logIcon = basePath + 'log-circle-red.png';
      else row.logIcon = basePath + 'default.png';

      /* visibilidade: mostra sempre (inclusive quando tipoMensagemErro = '') */
      row.logIconVisible = true;          // <-- é aqui que você troca!
      // se quisesse esconder só quando for null/undefined:
    }
  });

  srv.on('importarCSV', async (req) => {
    console.log('\n[Upload Fiori Elements] 🚀 Início do processamento.');
    const { fileContent } = req.data || {};

    if (!fileContent) {
      return req.error(400, 'fileContent vazio – envie o conteúdo do CSV.');
    }

    const csvString = /^[A-Za-z0-9+/]+=*$/.test(fileContent.trim())
      ? Buffer.from(fileContent, 'base64').toString('utf8')
      : fileContent;

    // --- ETAPA 1: PARSING DO CSV PARA UM LOTE (BATCH) EM MEMÓRIA ---
    const batch = [];
    try {
      await new Promise((resolve, reject) => {
        Readable.from(csvString)
          .pipe(csv({ separator: ',', mapHeaders: ({ header }) => header.trim() }))
          .on('data', data => batch.push(data))
          .on('end', resolve)
          .on('error', (err) => reject(new Error(`Erro ao ler o arquivo CSV: ${err.message}`)));
      });
      if (batch.length === 0) throw new Error("O arquivo está vazio ou em um formato inválido.");
      console.log(`[Processador] Arquivo lido com sucesso. ${batch.length} registros encontrados.`);
    } catch (error) {
      console.error(`[Processador] ❌ FALHA no parsing. Motivo: ${error.message}`);
      return req.error(400, error.message);
    }

    // --- ETAPA 2: VALIDAÇÃO E INSERÇÃO DENTRO DE UMA TRANSAÇÃO ---
    const resultados = [];
    try {
      await cds.tx(async (tx) => {
        console.log("  [Orquestrador] Transação iniciada. Iniciando validações...");

        // 2.1 Validação de campos em cada linha (lógica do processarStream)
        console.log("  [Validação] Validando campos de cada registro...");
        for (const [index, registro] of batch.entries()) {
          const validacao = validation.validarCampos(registro, index + 1);
          if (!validacao.isValid) {
            const erroMsg = `O arquivo foi rejeitado, erros encontrados no item ${index + 2}:\n- ${validacao.errors.join('\n- ')}`;
            throw new Error(erroMsg);
          }
        }
        console.log("    ✅ Validação de campos individuais concluída.");

        // 2.2 Validações no lote completo (lógica do validarLoteCompleto)
        console.log("  [Validação] Validando consistência do lote completo...");

        // 2.2.1 - Consistência Mãe-Filho no lote
        validation.validarConsistenciaMaeFilhoNoLote(batch);

        // 2.2.2 - Duplicados no banco
        const todosOsIdsDoArquivo = batch.map(r => r.idAlocacaoSAP).filter(Boolean);
        const idsExistentes = await tx.run(
          SELECT.from(NotaFiscalServicoMonitor, ['idAlocacaoSAP']).where({ idAlocacaoSAP: { in: todosOsIdsDoArquivo } })
        );
        if (idsExistentes.length > 0) {
          const listaIds = idsExistentes.map(nf => nf.idAlocacaoSAP).join(', ');
          throw new Error(`O arquivo foi rejeitado. As seguintes alocações SAP já existem no sistema: ${listaIds}`);
        }
        console.log("    ✅ Validação de lote concluída. Nenhum duplicado encontrado.");

        // 2.3 Insere os registros no banco (lógica do inserirRegistros)
        console.log(`  [Banco de Dados] Inserindo ${batch.length} novos registros...`);
        await tx.run(INSERT.into(NotaFiscalServicoMonitor).entries(batch));
        console.log("    ✅ Registros inseridos com sucesso.");

        // Prepara a resposta de sucesso para o frontend
        batch.forEach(linha => {
          resultados.push({
            idAlocacaoSAP: linha.idAlocacaoSAP,
            sucesso: true,
            mensagem: 'Importado'
          });
        });

      }); // Fim do cds.tx

      console.log('[Upload Fiori Elements] ✅ Processo finalizado com sucesso.');
      return resultados; // Retorna o array de sucesso

    } catch (error) {
      // O erro pode vir de qualquer uma das validações ou da inserção
      console.error(`\n[Upload Fiori Elements] ❌ FALHA! Rollback automático. Motivo: ${error.message}\n`);

      // Retorna o erro de forma amigável para o MessageToast no Fiori Elements
      return req.error(400, error.message);
    }
  });


});
