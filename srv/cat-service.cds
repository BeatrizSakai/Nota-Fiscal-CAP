using my.db as db from '../db/schema';

service NotaFiscalService {
    entity NotaFiscalServicoMonitor as projection on db.NotaFiscalServicoMonitor;

    entity NotaFiscalServicoLog     as projection on db.NotaFiscalServicoLog;

    @odata.draft.enabled
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
    action avancarStatusNFs(
        grpFilho      : String     
    ) returns array of {
        idAlocacaoSAP     : String;
        success           : Boolean;
        message           : String;
        novoStatus        : String;
        numeroNfseServico : String;
    };
    action rejeitarFrete(
        grpFilho      : String
    ) returns array of {
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