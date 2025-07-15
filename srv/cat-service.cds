using my.db as db from '../db/schema';

service NotaFiscalService {
    entity NotaFiscalServicoMonitor as
        projection on db.NotaFiscalServicoMonitor {
            key ID,
                idAlocacaoSAP,
                orderIdPL,
                chaveDocumentoMae,
                chaveDocumentoFilho,
                status,
                numeroNfseServico,
                serieNfseServico,
                dataEmissaoNfseServico,
                chaveAcessoNfseServico,
                codigoVerificacaoNfse,
                numeroDocumentoMIRO,
                valorBrutoNfse,
                valorLiquidoFreteNfse,
                valorEfetivoFrete,
                issRetido,
                cnpjTomador,
                codigoFornecedor,
                nomeFornecedor,
                numeroPedidoCompra,
                itemPedidoCompra,
                anoFiscalMIRO,
                documentoContabilMiroSAP,
                numeroNotaFiscalSAP,
                serieNotaFiscalSAP,
                numeroControleDocumentoSAP,
                documentoVendasMae,
                documentoFaturamentoMae,
                localPrestacaoServico,
                estornado,
                enviadoParaPL,
                logErroFlag,
                mensagemErro,
                classeMensagemErro,
                numeroMensagemErro,


                tipoMensagemErro,

                @Core.Computed
               virtual logIconVisibility:cds.Integer,

                @Core.Computed
                virtual criticality : Integer,
                @Core.Computed
                @UI.IsImageURL
                @Common.FieldControl: logIconVisibility
                virtual logIcon     : String
        }
        actions {
            @cds.odata.bindingparameter.name: '_it'
            action avancarStatusNFs() returns array of NotaFiscalServicoMonitor;

            @cds.odata.bindingparameter.name: '_it'
            action rejeitarFrete() returns array of NotaFiscalServicoMonitor;
        }


    entity NotaFiscalServicoLog     as projection on db.NotaFiscalServicoLog;

    @odata.draft.enabled
    entity ConfiguracoesISS         as projection on db.ZTMM_ISS_CFG;

    @readonly
    entity Empresas                 as projection on db.Empresas;

    action uploadArquivoFrete(data : LargeBinary)                  returns Boolean;

    action voltarStatusNFs(grpFilho : String, grpStatus : Integer) returns array of {
        idAlocacaoSAP : String;
        success       : Boolean;
        message       : String;
        novoStatus    : String;
    };

}

annotate NotaFiscalService.ConfiguracoesISS with {
    @mandatory mandt;
    @mandatory loc_neg;
    @mandatory loc_fornec;
};
