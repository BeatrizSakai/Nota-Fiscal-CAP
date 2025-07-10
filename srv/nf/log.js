// srv/nf/log.js
const cds = require('@sap/cds');

function sucesso(ids, proximoStatus, extra = {}, msg = `NF avançada ou retrocedida para ${proximoStatus}.`) {
  return ids.map(id => ({ idAlocacaoSAP: id, success: true, message: msg, novoStatus: proximoStatus, ...extra }));
}

function falha(ids, statusAtual, motivo) {
  return ids.map(id => ({ idAlocacaoSAP: id, success: false, message: motivo, novoStatus: statusAtual }));
}

async function gravarLog(
  tx, id, msg,
  tipo = 'E',
  classe = 'TRANSICAO',
  num = '001',
  origem = 'avancarStatusNFs'
) {
  const { NotaFiscalServicoLog, NotaFiscalServicoMonitor } = tx.model.entities;

  /* 1. Insere o registro de log --------------------------- */
  await tx.run(INSERT.into(NotaFiscalServicoLog).entries({
    ID: cds.utils.uuid(),
    idAlocacaoSAP: id,
    mensagemErro: msg,
    tipoMensagemErro: tipo,      // 'S' | 'E' | 'R'
    classeMensagemErro: classe,
    numeroMensagemErro: num,
    origem
  }));

  /* 2. Atualiza os campos de erro na NF ------------------- */
  await tx.update(NotaFiscalServicoMonitor)
    .set({
      logErroFlag: tipo !== 'S',      // true p/ E ou R
      mensagemErro: msg,
      tipoMensagemErro: tipo,
      classeMensagemErro: classe,
      numeroMensagemErro: num
    })
    .where({ idAlocacaoSAP: id });
}

module.exports = { sucesso, falha, gravarLog };
