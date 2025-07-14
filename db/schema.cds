namespace my.db;

using { cuid, managed } from '@sap/cds/common';

type StatusNfseMonitor : String enum {
    NAO_ATRIBUIDA @(title: 'Nota Fiscal Não Atribuída', description: 'A nota fiscal ainda não foi associada a um número de Pedido de Frete.') = '01'; 
    ATRIBUIDA @(title: 'NF Atribuída', description: 'A Nota Fiscal foi associada com sucesso a um número de Pedido de Frete.') = '05';
    CUSTO_ABSORCAO_CALCULADO @(title: 'Porcentagem do Custo de Absorção Calculada', description: 'O sistema calculou a porcentagem do custo de absorção.') = '15'; 
    PEDIDO_COMPRA_CRIADO @(title: 'Pedido de Compra Criado', description: 'Pedido de compra criado.') = '30'; 
    FATURA_E_NF_CRIADAS @(title: 'Fatura Criada (Miro) e Nota Fiscal Criada (Nota)', description: 'Criação da fatura de recebimento (MIRO) e nota fiscal de entrada (J1B).') = '35'; 
    PROCESSO_FINALIZADO_PL @(title: 'Processo Finalizado - Retorno PL', description: 'O processo de frete foi completado com sucesso e o retorno foi enviado ao sistema PL.') = '50'; 
    REJEITADO @(title: 'Rejeitado', description: 'Nota Fiscal Rejeitada ou processo rejeitado durante as etapas.') = '55'; 
    ERRO @(title: 'Erro no Processamento', description: 'Ocorreu um erro durante o processamento da nota fiscal.') = '99';
}

entity NotaFiscalServicoMonitor : cuid, managed {
    // --- Campos de Identificação e Chaves Principais ---
    // Baseados na tabela ZTMM_ALLOCAT [cite: 72] e mapeamento de payload [cite: 96]
    idAlocacaoSAP              : String(13) @title : 'ID Alocação SAP';         // Corresponde a ZDEMM_ID_SAP_ALLOCT (ID_SAP) [cite: 72]
    orderIdPL                  : String(20) @title : 'Order ID da PL';        // Corresponde a ZDEMM_ORDER_ID_PL2 (ORDER_ID_PL) / payload: orderId [cite: 72, 96]
    chaveDocumentoMae          : String(44) @title : 'Chave Documento Mãe';   // Corresponde a ZDEMM_ORIGINAL_KEY (ORIGINAL_KEY) / payload: originalKey [cite: 72, 96]
    chaveDocumentoFilho        : String(44) @title : 'Chave Documento Filho'; // Corresponde a ZDEMM_IDAGRNF (IDAGRNF) / payload: actualKey [cite: 72, 96]

    // --- Informações de Status ---
    status                     : StatusNfseMonitor @title : 'Status Processamento'; // Corresponde a ZDEMM_STATUS_ALLOC (STATUS) [cite: 72]
    // A criticidade/cor do status é geralmente tratada na camada de serviço ou UI com base no valor do enum 'status'.

    // --- Detalhes da NFS-e (Filha/Serviço) ---
    // Baseados na tabela ZTMM_ALLOCAT [cite: 72] e mapeamento de payload [cite: 96]
    numeroNfseServico          : String(12) @title : 'Nº NFS-e Serviço';        // Corresponde a ZDEMM_CTE_NUMBER (CTE_NUM) / payload: IDUnico (parcial) [cite: 72, 96]
    serieNfseServico           : String(3) @title : 'Série NFS-e Serviço';    // Corresponde a ZDEMM_CTE_SERIE (CTE_SERIE) [cite: 72]
    dataEmissaoNfseServico     : Date @title : 'Data Emissão NFS-e Serviço';// Corresponde a ZDEMM_CTE_DOCDAT (CTE_DOCDAT) / payload: issuanceDate [cite: 72, 96]
    chaveAcessoNfseServico     : String(44) @title : 'Chave Acesso NFS-e Serviço';// Corresponde a ZDEMM_ACCESS_NF (ACCESS_NFE) / payload: invoiceKey [cite: 72, 96]
    codigoVerificacaoNfse      : String(20) @title : 'Cód. Verificação NFS-e'; // Corresponde a ZDEMM_CODVERIF (CODVERIF) / payload: protocol [cite: 72, 96]

    // --- Detalhes do Tomador e Fornecedor ---
    // Baseados na tabela ZTMM_ALLOCAT [cite: 72] e mapeamento de payload [cite: 96]
    cnpjTomador                : String(14) @title : 'CNPJ Tomador';            // Corresponde a ZDEMM_CNPJ (CNPJ) / payload: TomaCNPJ [cite: 72, 96]
    codigoFornecedor           : String(14) @title : 'Código Fornecedor';       // Corresponde a ZDEMM_ZTDLNR_P (CTE_TDLNR) / payload: CNPJ_prest [cite: 72, 96]
    nomeFornecedor             : String(35) @title : 'Nome Fornecedor';         // Corresponde a NAME1_GP (NAME1) [cite: 72, 96]

    // --- Números de Documentos SAP Gerados ---
    // Baseados na tabela ZTMM_ALLOCAT [cite: 72]
    numeroPedidoCompra         : String(10) @title : 'Nº Pedido Compra SAP';    // Corresponde a ZDEMM_EBELN (EBELN) [cite: 72]
    itemPedidoCompra           : String(5) @title : 'Item Pedido Compra SAP'; // Corresponde a EBELP [cite: 72]
    numeroDocumentoMIRO        : String(10) @title : 'Nº Documento MIRO';       // Corresponde a ZDEMM_BELNR_D (CTE_BELNR referente à MIRO) [cite: 72]
    anoFiscalMIRO              : String(4) @title : 'Ano Fiscal MIRO';        // Corresponde a GJAHR (CTE_GJAHR referente à MIRO) [cite: 72]
    documentoContabilMiroSAP   : String(10) @title : 'Doc. Contábil MIRO SAP';  // Corresponde a FATCOMPFI (que é ZDEMM_BELNR_D) [cite: 72]
    numeroNotaFiscalSAP        : String(9) @title : 'Nº Nota Fiscal SAP (J1B)';// Corresponde a ZDEMM_J_1BNFNUM9 (NFENUM) [cite: 72]
    serieNotaFiscalSAP         : String(3) @title : 'Série Nota Fiscal SAP (J1B)';// Corresponde a ZDEMM_J_1BSERIES (SERIES) [cite: 72]
    numeroControleDocumentoSAP : String(10) @title : 'Nº Controle Doc. SAP (NF)';// Corresponde a J_1BDOCNUM (CTE_DOCNUM) [cite: 72]

    // --- Identificadores de Documentos Pai Relacionados (para contexto) ---
    // Baseados na tabela ZTMM_ALLOCAT [cite: 72]
    documentoVendasMae         : String(10) @title : 'Doc. Vendas Mãe (OV)';    // Corresponde a VBELN_VA [cite: 72]
    documentoFaturamentoMae    : String(10) @title : 'Doc. Faturamento Mãe (Fat.)';// Corresponde a VBELN_VF [cite: 72]

    // --- Detalhes Financeiros e do Serviço ---
    // Baseados na tabela ZTMM_ALLOCAT [cite: 72] e mapeamento de payload [cite: 96]
    localPrestacaoServico      : String(15) @title : 'Local Prestação Serviço'; // Corresponde a ZDEMM_LOC_PRESTAC_SERV / payload: SerEndcMun [cite: 72, 96]
    valorEfetivoFrete          : Decimal(15,2) @title : 'Valor Efetivo Frete';   // Corresponde a ZDEMM_DOCVALUE (DOC_VALUE) / payload: documentValue [cite: 72, 96]
    valorLiquidoFreteNfse      : Decimal(15,2) @title : 'Valor Líquido Frete NFS-e';// Corresponde a ZDEMM_NETFREI_FINB (NETFREI) / payload: ItemVlrLiquido [cite: 72, 96]
    valorBrutoNfse             : Decimal(15,2) @title : 'Valor Bruto NFS-e';     // Corresponde a ZDEMM_VALBRUTO (VALBRUTO) / payload: ItemvUnit (para VALBRUTO) [cite: 72, 96]
    issRetido                  : String(1) @title : 'ISS Retido';             // Corresponde a ZDEMM_ISSRETIDO (ISSREDIDO) / payload: ItemIssRetido ('1'-Sim, '2'-Não) [cite: 72, 96]

    // --- Flags e Informações de Auditoria/Controle ---
    // Baseados na tabela ZTMM_ALLOCAT [cite: 72]
    estornado                  : Boolean @title : 'Estornado';                  // Corresponde a J_1BCANCEL (NF_CANCEL), 'X' ou true para estornado [cite: 72]
    enviadoParaPL              : String(2) @title : 'Enviado para PL';        // Corresponde a ZDEMM_SENDTOPL (SENDTOPL) [cite: 72]
    // Os campos createdAt, createdBy, modifiedAt, modifiedBy são fornecidos pelo aspecto 'managed'.

    // --- Informações de Erro ---
    // Baseadas na tabela ZTMM_ALLOCAT [cite: 72]
    logErroFlag                : Boolean @title : 'Log de Erro (Flag)';        // Corresponde a ZDEMM_ERROR_LOG (ERROR_LOG), 'X' ou true se houver erro [cite: 72]
    mensagemErro               : String(120) @title : 'Mensagem de Erro';      // Corresponde a ZDEMM_MSG (MSG_TEXT) [cite: 72]
    tipoMensagemErro           : String(1) @title : 'Tipo Mensagem Erro';     // Corresponde a SYMSGTY [cite: 72]
    classeMensagemErro         : String(20) @title : 'Classe Mensagem Erro';   // Corresponde a SYMSGID [cite: 72]
    numeroMensagemErro         : String(3) @title : 'Número Mensagem Erro';   // Corresponde a SYMSGNO [cite: 72]
}

entity NotaFiscalServicoLog : managed {
    key ID              : UUID;
    nota_ID             : Association to NotaFiscalServicoMonitor
                          on nota_ID.idAlocacaoSAP = $self.idAlocacaoSAP;

    idAlocacaoSAP       : String(13);   // mesmo comprimento do principal
    mensagemErro        : String(120);
    tipoMensagemErro    : String(1);
    classeMensagemErro  : String(20);
    numeroMensagemErro  : String(3);
    origem              : String(30);   // 'avancarStatusNFs', 'BAPI_XYZ', e tals
}

//lista de empresas
entity Empresas {
    key ID   : String(4); // O código de 4 caracteres
        nome : String(100);
}
entity ZTMM_ISS_CFG : cuid, managed {
    @title: 'Mandante'
    @Core.Immutable mandt        : String(3) not null;
    empresa      : Association to Empresas not null; 
    loc_neg      : String(4) not null;
    loc_fornec   : String(15);
    prestac_serv : String(15);
    prestad_serv : String(10);
    serv_prest   : String(4);
    serv_type    : String(16);
    verif        : String(1);
    val_de       : Date;
    val_ate      : Date;
}