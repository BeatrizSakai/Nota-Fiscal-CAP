using my.db as db from '../db/schema';

service NotaFiscalService {
    entity NotaFiscalServicoMonitor as projection on db.NotaFiscalServicoMonitor{
        *,
        @Core.Computed
        virtual criticality: Integer
    }actions{
    @cds.odata.bindingparameter.name : '_it'
    action avancarStatusNFs()            // ← sem parâmetro! (ver caminho C se quiser)
    returns array of {
      idAlocacaoSAP     : String;
      success           : Boolean;
      message           : String;
      novoStatus        : String;
      numeroNfseServico : String;
    };
    @cds.odata.bindingparameter.name : '_it'
    action rejeitarFrete() 
    returns array of {
        idAlocacaoSAP : String;
        success       : Boolean;
        message       : String;
        novoStatus    : String;
    };
    }

    entity NotaFiscalServicoLog     as projection on db.NotaFiscalServicoLog;

    entity ConfiguracoesISS as projection on db.ZTMM_ISS_CFG;
    @readonly
    entity Empresas as projection on db.Empresas;

    action uploadArquivoFrete(data: LargeBinary) returns Boolean;

     action voltarStatusNFs(grpFilho: String, grpStatus: Integer) returns array of {
        idAlocacaoSAP : String;
        success       : Boolean;
        message       : String;
        novoStatus    : String;
    };

    };
