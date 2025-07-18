using my.db as db from '../db/schema';

service NotaFiscalService {
    entity NotaFiscalServicoMonitor as
        projection on db.NotaFiscalServicoMonitor {
            *,

                @Core.Computed
                virtual criticality : Integer,
                @Core.Computed
                @UI.IsImageURL
                virtual logIcon     : String,

                @Core.Computed           
                virtual logIconVisible   : Boolean,
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

    type CSVImportResult {
    idAlocacaoSAP : String;
    sucesso       : Boolean;
    mensagem      : String;
    }

     action importarCSV ( fileContent : LargeString ) returns array of CSVImportResult;

    }

annotate NotaFiscalService.ConfiguracoesISS with {
    @mandatory mandt;
    @mandatory loc_neg;
    @mandatory loc_fornec;
};
