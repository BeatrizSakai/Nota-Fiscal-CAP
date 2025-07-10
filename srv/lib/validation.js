const cds = require('@sap/cds');

/**
 * Valida os dados de um registro de Nota Fiscal de Serviço com mensagens de erro detalhadas.
 * @param {object} data - Os dados do registro a serem validados.
 * @param {number} indice - O índice da linha de dados no CSV (começando em 1).
 * @returns {{isValid: boolean, errors: string[]}} - Retorna se é válido e uma lista de mensagens de erro.
 */
function validarCampos(data, indice = 0) {
    const errors = [];
    // A linha real no arquivo é o índice da linha de dados + 1 (para o cabeçalho)
    const linha = `Item ${indice + 1} do arquivo:`;

    console.log(`[VALIDATION] Validando dados do Item ${indice} do arquivo (ID: ${data.idAlocacaoSAP || 'N/A'})`);

    // --- Validações de Campos Obrigatórios ---
    if (!data.idAlocacaoSAP) {
        errors.push(`${linha} O campo 'idAlocacaoSAP' é obrigatório e não foi encontrado.`);
    }
    if (!data.orderIdPL) {
        errors.push(`${linha} O campo 'orderIdPL' é obrigatório e não foi encontrado.`);
    }
    if (!data.chaveDocumentoMae) {
        errors.push(`${linha} O campo 'chaveDocumentoMae' é obrigatório e não foi encontrado.`);
    }
    if (!data.chaveDocumentoFilho) {
        errors.push(`${linha} O campo 'chaveDocumentoFilho' é obrigatório e não foi encontrado.`);
    }
    if (!data.numeroNfseServico) {
        errors.push(`${linha} O campo 'numeroNfseServico' é obrigatório e não foi encontrado.`);
    }
    if (!data.serieNfseServico) {
        errors.push(`${linha} O campo 'serieNfseServico' é obrigatório e não foi encontrado.`);
    }
    if (!data.dataEmissaoNfseServico) {
        errors.push(`${linha} O campo 'dataEmissaoNfseServico' é obrigatório e não foi encontrado.`);
    }

    // --- Validações de Formato e Tamanho ---
    if (data.idAlocacaoSAP && data.idAlocacaoSAP.length > 13) {
        errors.push(`${linha} O campo 'idAlocacaoSAP' com valor "${data.idAlocacaoSAP}" excedeu o limite de 13 caracteres.`);
    }
    if (data.orderIdPL && data.orderIdPL.length > 20) {
        errors.push(`${linha} O campo 'orderIdPL' com valor "${data.orderIdPL}" excedeu o limite de 20 caracteres.`);
    }
    if (data.chaveDocumentoMae && data.chaveDocumentoMae.length > 44) {
        errors.push(`${linha} O campo 'chaveDocumentoMae' com valor "${data.chaveDocumentoMae}" excedeu o limite de 44 caracteres.`);
    }
    if (data.chaveDocumentoFilho && data.chaveDocumentoFilho.length > 44) {
        errors.push(`${linha} O campo 'chaveDocumentoFilho' com valor "${data.chaveDocumentoFilho}" excedeu o limite de 44 caracteres.`);
    }
    if (data.dataEmissaoNfseServico && isNaN(new Date(data.dataEmissaoNfseServico).getTime())) { 
        errors.push(`${linha} A data no campo 'dataEmissaoNfseServico' ("${data.dataEmissaoNfseServico}") é inválida.`);
    }

    // --- Validações de Valores ---
    const valorBruto = parseFloat(data.valorBrutoNfse);
    if (!isNaN(valorBruto) && valorBruto < 0) {
        errors.push(`${linha} O campo 'valorBrutoNfse' não pode ser negativo. Valor encontrado: "${data.valorBrutoNfse}".`);
    }

    return {
        isValid: errors.length === 0,
        errors: errors
    };
}
/**
 * Valida a consistência da relação Mãe-Filho de um registro contra o banco de dados.
 * REQUER ACESSO AO BANCO, por isso é assíncrona.
 * @param {object} data - Os dados do registro contendo { chaveDocumentoFilho, chaveDocumentoMae }.
 * @param {object} srv - O objeto de serviço do CAP, para poder usar o SELECT.
 * @param {object} NotaFiscalServicoMonitor - A entidade CDS para consulta.
 * @returns {Promise<string[]>} - Retorna uma lista de mensagens de erro. Vazia se for válido.
 */
async function validarConsistenciaMaeFilhoNoBanco(data, srv, NotaFiscalServicoMonitor) {
    const { chaveDocumentoFilho, chaveDocumentoMae } = data;
    const errors = [];

    if (!chaveDocumentoFilho) {
        return errors; // Se não há filho, não há o que validar.
    }
    
    console.log(`[VALIDATION-DB] Verificando consistência no BD para Filho: ${chaveDocumentoFilho}`);

    // Procura por qualquer registro no banco que já tenha essa chave de filho
    
    const query = cds.ql.SELECT.from(NotaFiscalServicoMonitor)
    .where({ chaveDocumentoFilho: chaveDocumentoFilho });
    
    const filhosExistentes = await srv.run(query); // <-- MUDANÇA PRINCIPAL

    if (filhosExistentes.length > 0) {
        const maeExistente = filhosExistentes[0].chaveDocumentoMae;

        // Se a mãe existente for diferente da mãe que estamos tentando inserir, é um erro.
        if (maeExistente !== chaveDocumentoMae) {
            const erroMsg = `Inconsistência de dados: A chave de filho "${chaveDocumentoFilho}" já está associada à chave mãe "${maeExistente}" no sistema. Não é possível associá-la à nova mãe "${chaveDocumentoMae}".`;
            errors.push(erroMsg);
        }
    }
    return errors;
}


/**
 * Valida a consistência da relação Mãe-Filho DENTRO de um lote de registros.
 * NÃO REQUER ACESSO AO BANCO. Lança um erro na primeira inconsistência encontrada.
 * @param {Array<object>} registros - O lote de registros do arquivo.
 */
function validarConsistenciaMaeFilhoNoLote(registros) {
    console.log("  [VALIDATION-BATCH] Verificando consistência Mãe-Filho no arquivo completo...");
    const filhoParaMaeMap = new Map();

    registros.forEach((registro, index) => {
        const linhaDoArquivo = index + 2; // +1 para índice base 1, +1 para cabeçalho
        const { chaveDocumentoFilho, chaveDocumentoMae } = registro;

        if (chaveDocumentoFilho && chaveDocumentoMae) {
            if (filhoParaMaeMap.has(chaveDocumentoFilho)) {
                const primeiraOcorrencia = filhoParaMaeMap.get(chaveDocumentoFilho);
                if (primeiraOcorrencia.mae !== chaveDocumentoMae) {
                    const erroMsg = `O arquivo foi rejeitado por inconsistência nos dados:\n\n- Inconsistência na linha ${linhaDoArquivo}: A chave de filho "${chaveDocumentoFilho}" está ligada à mãe "${chaveDocumentoMae}", mas na linha ${primeiraOcorrencia.linha} ela já estava ligada à mãe "${primeiraOcorrencia.mae}".`;
                    throw new Error(erroMsg);
                }
            } else {
                filhoParaMaeMap.set(chaveDocumentoFilho, { mae: chaveDocumentoMae, linha: linhaDoArquivo });
            }
        }
    });
    console.log("    [VALIDATION-BATCH] ✅ Consistência Mãe-Filho no lote validada.");
}


module.exports = {
    validarCampos, // Antiga validarNotaFiscal
    validarConsistenciaMaeFilhoNoBanco,
    validarConsistenciaMaeFilhoNoLote
};