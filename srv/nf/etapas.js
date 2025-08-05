// srv/nf/etapas.js
const cds = require('@sap/cds');
const { sucesso, falha, gravarLog } = require('./log');

function gerarNumeroNF() {
  return Math.floor(1_000_000_000 + Math.random() * 900_000_000).toString();
}

module.exports = function buildEtapas(srv) {
  const { NotaFiscalServicoMonitor } = srv.entities;

  /* --------------------------------------------------------- *
   *            Funções de AVANÇAR (01->05->15…)               *
   * --------------------------------------------------------- */
  async function trans01para05(tx, notas, req) { 

    console.log('[ETAPAS] - Iniciando transição 01 para 05.');
    const resultados = [];
    const ids = notas.map(n => n.idAlocacaoSAP);

    /* 1. Validação ISS Retido */
    const notasComRetencao = notas.filter(n => n.issRetido === '1');
    if (notasComRetencao.length > 0) {
        console.warn(`[ETAPAS] - Validação falhou: ${notasComRetencao.length} NF(s) com ISS Retido. Abortando.`);

        // Monta a mensagem detalhada para a UI
        const idsComRetencao = notasComRetencao.map(n => n.idAlocacaoSAP);
        const uiMessage = `Avanço bloqueado: As seguintes NFs possuem ISS Retido:\n- ${idsComRetencao.join('\n- ')}`;

        req.warn({ code: 'VALID_ISS_RETIDO_FAIL', message: uiMessage, numericSeverity: 3 });

        // Gera o log e o resultado para cada nota do grupo
        for (const nota of notas) {
            const id = nota.idAlocacaoSAP;
            const ehRetida = idsComRetencao.includes(id); // Verifica se esta nota é uma das que falhou
            const msg = ehRetida ? 'NF bloqueada — ISS Retido = Sim.' : 'Processo abortado — outra NF do grupo tem ISS Retido.';
            
            // Loga como 'E' (Erro) só para a retida, e 'S' (Sucesso/Info) para as outras, para não setar a flag de erro nelas.
            await gravarLog(tx, id, msg, ehRetida ? 'E' : 'S', 'VALID_ISS_RETIDO', ehRetida ? '901' : '902');
            
            resultados.push({ idAlocacaoSAP: id, success: !ehRetida, message: msg, novoStatus: '01' });
        }
        
        return resultados; // Ninguém avança
    }

    /* 2. Nenhum retido → fluxo original */
    console.log('[ETAPAS] - Validação de ISS Retido OK. Prosseguindo com a atualização.');
    try {
      const numeroNF = gerarNumeroNF();
      await tx.update(NotaFiscalServicoMonitor).set({ status: '05', numeroNfseServico: numeroNF }).where({ idAlocacaoSAP: { in: ids } });
      for (const id of ids) {
          await gravarLog(tx, id, `Status 01→05 gerado – NF ${numeroNF}.`, 'S', 'TRANS_01_05', '000');
          resultados.push({ idAlocacaoSAP: id, success: true, message: `Status 01→05 gerado – NF ${numeroNF}.`, novoStatus: '05', numeroNfseServico: numeroNF });
      }

      //  RESUMO PARA A UI 
      req.info({ code: 'TRANS_01_05_OK', message: `${resultados.length} NF(s) avançada(s) com sucesso para o status 05. NFSe gerada: ${numeroNF}.`, numericSeverity: 2 });
      return resultados;

    } catch (e) {
        console.error('[ETAPAS] - Erro catastrófico na transição 01->05:', e);
        for (const id of ids) {
            await gravarLog(tx, id, e.message, 'E', 'TRANS_01_05', '002');
            resultados.push({ idAlocacaoSAP: id, success: false, message: 'Erro 01→05: ' + e.message, novoStatus: '01' });
        }
        
        req.error(500, 'Ocorreu um erro técnico ao tentar avançar o status para 05.');
        
        return resultados;
    }
}

  /* --------------------------------------------------- *
   * 05 → 15                                              *
   * --------------------------------------------------- */
  async function trans05para15(tx, ids, req) {
    console.log('[ETAPAS] - Iniciando transição 05 para 15.');
    const resultados = [];
    try {
      await tx.update(NotaFiscalServicoMonitor).set({ status: '15' }).where({ idAlocacaoSAP: { in: ids } });
      await Promise.all(ids.map(id => gravarLog(tx, id, 'Status 05→15 confirmado.', 'S', 'TRANS_05_15', '000')));

      //  RESUMO PARA A UI 
      req.info({ code: 'TRANS_05_15_OK', message: `${ids.length} NF(s) avançada(s) para o status 15 com sucesso.`, numericSeverity: 2 });
      return sucesso(ids, '15');
    } catch (e) {
        console.error('[ETAPAS] - Erro catastrófico na transição 05->15:', e);
        for (const id of ids) {
            await gravarLog(tx, id, e.message, 'E', 'TRANS_05_15', '003');
            resultados.push({ idAlocacaoSAP: id, success: false, message: 'Erro ao avançar para status 15: ' + e.message, novoStatus: '05' });
        }
        req.error(500, 'Ocorreu um erro técnico ao tentar avançar o status para 15.');
        return resultados;
    }
}

  /* --------------------------------------------------- *
   * 15 → 30  (all-or-nothing)                            *
   * --------------------------------------------------- */
  async function trans15para30(tx, notas, req) {
    console.log('[ETAPAS] - Iniciando transição 15 para 30 (All-or-Nothing).');
    const resultados = [];
    const valoresPorNota = new Map();
    const erros = new Map();

    /* Validação BAPI */
    for (const nota of notas) {
        const id = nota.idAlocacaoSAP;
        const resp = await BAPI_PO_CREATE1(nota);

        if (!resp.ok) {
            erros.set(id, resp.msg);
            await gravarLog(tx, id, resp.msg, 'E', 'BAPI_PO_CREATE1', '100');
            continue; 
        }
        valoresPorNota.set(id, resp.valores);
    }
    /* 2️⃣  Houve erro → ninguém avança, mas agora com a flag de erro correta */
    if (erros.size) {
      console.warn(`[ETAPAS] - ${erros.size} erro(s) na validação BAPI. Rollback da transição.`);
      
      for (const nota of notas) {
          const id = nota.idAlocacaoSAP;
          const falhou = erros.has(id); // Identifica quem realmente falhou

          if (falhou) {
              // Para as notas que falharam, a gente já loga o erro na validação BAPI.
              // Não precisa fazer nada aqui.
          } else {
              // Para as que foram PARADAS por consequência de outra...
              await gravarLog(
                  tx, id,
                  'Processo abortado — erro em outra NF do grupo.',
                  'S', // <== A MUDANÇA ESTÁ AQUI!
                  'BAPI_PO_CREATE1', '101'
              );
          }
          // 'success' é 'false' apenas para quem falhou.
          resultados.push({
              idAlocacaoSAP: id,
              success: !falhou,
              message: falhou ? erros.get(id) : 'Processo abortado — erro em outra NF do grupo.',
              novoStatus: '15'
          });
      }

      // A mensagem para a UI continua perfeita.
      const errorDetails = [];
      for (const [id, msg] of erros.entries()) {
          errorDetails.push(`- NF ${id}: ${msg}`);
      }
      const uiMessage = `Avanço bloqueado: ${erros.size} erro(s) na validação BAPI.\n\nDetalhes:\n${errorDetails.join('\n')}`;

      req.warn({
          code: 'TRANS_15_30_VALID',
          message: uiMessage,
          numericSeverity: 3
      });

      return resultados;
  }
    /* 3️⃣  Nenhum erro → atualiza, loga sucessos */
    console.log('[ETAPAS] - Validação BAPI OK. Atualizando todas as notas para o status 30.');
    for (const nota of notas) {
        const id = nota.idAlocacaoSAP;
        const valores = valoresPorNota.get(id);

        await tx.update(NotaFiscalServicoMonitor)
            .set({ status: '30', ...valores })
            .where({ idAlocacaoSAP: id });

        await gravarLog(tx, id, 'Status 15→30 e valores gravados.', 'S', 'TRANS_15_30', '000');
        resultados.push({ idAlocacaoSAP: id, success: true, message: 'Status 15→30 e valores gravados.', novoStatus: '30' });
    }

    /*  Mensagem de sucesso para o usuário */
    req.info({ code: 'TRANS_15_30_OK', message: `${notas.length} NF(s) avançada(s) para o status 30 com sucesso.`, numericSeverity: 2 });
    return resultados;
}


  /* --------------------------------------------------- *
   * 30 → 35                                              *
   * --------------------------------------------------- */
  async function trans30para35(tx, notas, req) {
      console.log('[ETAPAS] - Iniciando transição 30 para 35.');
      const resultados = [];
      let sucessos = 0;
      let falhas = 0;

      for (const nota of notas) {
          const id = nota.idAlocacaoSAP;
          console.log(`[ETAPAS] - Processando MIRO e NF para a nota: ${id}`);

          try {
              /* MIRO */
              const respMiro = await BAPI_INCOMINGINVOICE_CREATE1(nota);
              if (!respMiro.ok) throw new Error(`Erro na MIRO: ${respMiro.msg}`);

              /* NF */
              const respNF = await BAPI_J_1B_NF_CREATEFROMDATA(nota, respMiro.valores.numeroDocumentoMIRO);
              if (!respNF.ok) throw new Error(`Erro na criação da NF: ${respNF.msg}`);

              /* Sucesso */
              await tx.update(NotaFiscalServicoMonitor).set({
                  status: '35',
                  numeroDocumentoMIRO: respMiro.valores.numeroDocumentoMIRO
              }).where({ idAlocacaoSAP: id });

              await gravarLog(tx, id, 'Status 30→35 concluído com sucesso.', 'S', 'TRANS_30_35', '000');
              
              resultados.push({
                  idAlocacaoSAP: id,
                  success: true,
                  message: 'Fatura e Nota Fiscal criadas com sucesso.',
                  novoStatus: '35'
              });
              sucessos++; // Incrementa o contador de sucesso

          } catch (error) {
              console.error(`[ETAPAS] - Erro na transição 30->35 para a NF ${id}:`, error.message);
              falhas++; // Incrementa o contador de falha

              await tx.update(NotaFiscalServicoMonitor)
                  .set({ status: '99', MSG_TEXT: error.message.substring(0, 120) })
                  .where({ idAlocacaoSAP: id });

              await gravarLog(tx, id, error.message, 'E', 'TRANS_30_35', '999');
              
              resultados.push({
                  idAlocacaoSAP: id,
                  success: false,
                  message: error.message,
                  novoStatus: '99'
              });
          }
      }
      // 3.  RESUMO FINAL PARA A UI 
      if (falhas > 0) {
          req.warn({
              code: 'TRANS_30_35_PARTIAL',
              message: `Processo finalizado. Sucesso: ${sucessos} | Falhas: ${falhas}. Verifique o status individual das notas.`,
              numericSeverity: 3 // 3=warning
          });
      } else {
          req.info({
              code: 'TRANS_30_35_OK',
              message: `Todas as ${sucessos} NF(s) foram processadas e avançadas para o status 35 com sucesso.`,
              numericSeverity: 2 // 2=success
          });
      }

      return resultados; // Retorna o array de resultados como sempre
  }

  /* --------------------------------------------------- *
   * 35 → 50                                              *
   * --------------------------------------------------- */
  async function trans35para50(tx, ids, req) {
    await tx.update(NotaFiscalServicoMonitor)
      .set({ status: '50' })
      .where({ idAlocacaoSAP: { in: ids } });

    await Promise.all(
      ids.map(id =>
        gravarLog(tx, id, 'Status 35→50 confirmado.', 'S', 'TRANS_35_50', '000')
      )
    );

    req.info({ code: 'TRANS_35_50_OK', message: `${ids.length} NF(s) finalizada(s) com sucesso (status 50).`, numericSeverity: 2 });
    return sucesso(ids, '50');  
  }

  /* --------------------------------------------------------- *
   *            Funções de REVERTER (50->35->30…)              *
   * --------------------------------------------------------- */
  /** Reverte 50 → 35 */
  async function trans50para35_reverso(tx, notas, req) { // <-- Aceita o req
    const ids = notas.map(n => n.idAlocacaoSAP);
    const criterio = { chaveDocumentoFilho: notas[0].chaveDocumentoFilho, status: notas[0].status };
    await tx.update(NotaFiscalServicoMonitor).set({ status: '35' }).where(criterio);
    await Promise.all(ids.map(id => gravarLog(tx, id, "Status revertido para 'Fatura Criada' (35).", 'S', 'REV_50_35', '000')));

    // Notificação para a UI, igual à função de avançar
    req.info({ code: 'REV_50_35_OK', message: `${ids.length} NF(s) revertida(s) para o status 35.`, numericSeverity: 2 });

    return sucesso(ids, '35', {}, "Status revertido para 'Fatura Criada'.");
  }

  /** Reverte 35 → 30 */
  async function trans35para30_reverso(tx, notas, req) { // <-- Aceita o req
    const ids = notas.map(n => n.idAlocacaoSAP);
    const criterio = { chaveDocumentoFilho: notas[0].chaveDocumentoFilho, status: notas[0].status };
    await tx.update(NotaFiscalServicoMonitor).set({ status: '30', numeroDocumentoMIRO: null }).where(criterio);
    await Promise.all(ids.map(id => gravarLog(tx, id, "Status revertido para 'Pedido Criado' (30). Dados da MIRO removidos.", 'S', 'REV_35_30', '000')));

    req.info({ code: 'REV_35_30_OK', message: `${ids.length} NF(s) revertida(s) para o status 30.`, numericSeverity: 2 });

    return sucesso(ids, '30', {}, "Status revertido. Dados da Fatura/MIRO removidos.");
  }

  /** Reverte 30 → 15 */
  async function trans30para15_reverso(tx, notas, req) { // <-- Aceita o req
    const ids = notas.map(n => n.idAlocacaoSAP);
    const criterio = { chaveDocumentoFilho: notas[0].chaveDocumentoFilho, status: notas[0].status };
    await tx.update(NotaFiscalServicoMonitor)
      .set({ status: '15', valorBrutoNfse: 0.00, valorEfetivoFrete: 0.00, valorLiquidoFreteNfse: 0.00 })
      .where(criterio);
    await Promise.all(ids.map(id => gravarLog(tx, id, "Status revertido para 'NF Confirmada' (15). Valores zerados.", 'S', 'REV_30_15', '000')));

    req.info({ code: 'REV_30_15_OK', message: `${ids.length} NF(s) revertida(s) para o status 15 e valores zerados.`, numericSeverity: 2 });

    return sucesso(ids, '15', {}, "Status revertido. Dados do Pedido de Compra removidos.");
  }

  /** Reverte 15 → 05 */
  async function trans15para05_reverso(tx, notas, req) { // <-- Aceita o req
    const ids = notas.map(n => n.idAlocacaoSAP);
    const criterio = { chaveDocumentoFilho: notas[0].chaveDocumentoFilho, status: notas[0].status };
    await tx.update(NotaFiscalServicoMonitor).set({ status: '05' }).where(criterio);
    await Promise.all(ids.map(id => gravarLog(tx, id, "Status revertido para 'NF Atribuída' (05).", 'S', 'REV_15_05', '000')));

    req.info({ code: 'REV_15_05_OK', message: `${ids.length} NF(s) revertida(s) para o status 05.`, numericSeverity: 2 });

    return sucesso(ids, '05', {}, "Status revertido para 'NF Atribuída'.");
  }

  /** Reverte 05 → 01 */
  async function trans05para01_reverso(tx, notas, req) { // <-- Aceita o req
    const ids = notas.map(n => n.idAlocacaoSAP);
    const criterio = { chaveDocumentoFilho: notas[0].chaveDocumentoFilho, status: notas[0].status };
    await tx.update(NotaFiscalServicoMonitor).set({ status: '01', numeroNfseServico: null }).where(criterio);
    await Promise.all(ids.map(id => gravarLog(tx, id, "Status revertido para 'Não Atribuída' (01). Número da NF removido.", 'S', 'REV_05_01', '000')));

    req.info({ code: 'REV_05_01_OK', message: `${ids.length} NF(s) revertida(s) para o status 01.`, numericSeverity: 2 });

    return sucesso(ids, '01', {}, "Status revertido para 'Não Atribuída'.");
  }
  async function BAPI_PO_CREATE1(nota) {
    const { valorBrutoNfse, valorEfetivoFrete, valorLiquidoFreteNfse } = nota;
    const temValor = (valorBrutoNfse && valorBrutoNfse > 0) ||
      (valorEfetivoFrete && valorEfetivoFrete > 0) ||
      (valorLiquidoFreteNfse && valorLiquidoFreteNfse > 0);

    if (temValor) return { ok: false, msg: 'Campos de valores já preenchidos.' };

    const bruto = Math.floor(10_000 + Math.random() * 90_000);
    const efetivo = +(bruto * 0.10).toFixed(2);
    const liquido = +(efetivo * 0.80).toFixed(2);

    return {
      ok: true,
      valores: {
        valorBrutoNfse: bruto,
        valorEfetivoFrete: efetivo,
        valorLiquidoFreteNfse: liquido
      }
    };
  }

  async function BAPI_INCOMINGINVOICE_CREATE1(nota) {
    console.log(`[BAPI_SIMULATION] Criando MIRO para NF ${nota.idAlocacaoSAP}...`);
    // Aqui você pode adicionar lógicas de falha para teste, se quiser
    // if (nota.algumaCondicaoDeErro) {
    //    return { ok: false, msg: "Erro simulado na criação da MIRO." };
    // }
    return {
      ok: true,
      valores: {
        // Gera um número de documento de MIRO simulado
        numeroDocumentoMIRO: `510${Math.floor(1000000 + Math.random() * 9000000)}`
      }
    };
  }
  async function BAPI_J_1B_NF_CREATEFROMDATA(nota, miroDocNumber) {
    console.log(`[BAPI_SIMULATION] Criando NF de Serviço para MIRO ${miroDocNumber}...`);
    // if (miroDocNumber.endsWith('7')) { // Exemplo de condição de erro
    //    return { ok: false, msg: "Erro simulado: dados fiscais inválidos." };
    // }
    return { ok: true }; // Apenas confirma o sucesso
  }

  /* Exporta tudo que o service.js precisa */
  return {
    avancar: { trans01para05, trans05para15, trans15para30, trans30para35, trans35para50 },
    voltar: {
      trans50para35_reverso, trans35para30_reverso, trans30para15_reverso,
      trans15para05_reverso, trans05para01_reverso
    }
  };
};
