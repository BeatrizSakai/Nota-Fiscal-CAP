using my.db as db from '../db/schema';

service NotaFiscalService {
     entity NotaFiscalServicoMonitor as projection on db.NotaFiscalServicoMonitor;
}
