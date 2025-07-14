sap.ui.define(["sap/ui/core/Fragment"], function (Fragment) {
    "use strict";
  
    const FRAG_ID  = "LogDlg";      // id prefixado do fragment
    const TABLE_ID = "logTable";    // id da <Table> no XML
  
    return {
  
      /* Botão “Ver Logs” ‒ abre o diálogo e força refresh ---------------- */
      onVerLogs: async function () {
  
        if (!this.oLogDialog) {
          /* 1️  Carrega o fragmento só na 1ª vez */
          this.oLogDialog = await this.loadFragment({
            id   : FRAG_ID,
            name : "monitoramento.monitor.ext.fragment.NotaFiscalServicoLogDialog"
          });
  
          /* 2️  Botão “Fechar” */
          Fragment.byId(FRAG_ID, "btnCloseLog")
                  .attachPress(() => this.oLogDialog.close());
  
          /* 3️  Função inline para refresh sempre que abrir */
          const refreshLogs = () => {
            const oTable   = Fragment.byId(FRAG_ID, TABLE_ID);
            if (!oTable)   { console.log("[LOG] tabela não encontrada"); return; }
  
            const oBinding = oTable.getBinding("items");
            if (!oBinding) { console.log("[LOG] binding inexistente");  return; }
  
            oTable.setBusy(true);
            Promise.resolve(oBinding.refresh())        // OData V4 → força leitura
              .then(() =>
                console.log(`[LOG] refresh OK – linhas: ${oBinding.getLength()}`))
              .catch(err =>
                console.error("[LOG] erro durante refresh:", err))
              .finally(() => oTable.setBusy(false));
          };
  
          /* 4️  Liga o refresh ao evento AfterOpen */
          this.oLogDialog.attachAfterOpen(refreshLogs);
        }
  
        /* 5️  Abre (o AfterOpen já executa refreshLogs) */
        this.oLogDialog.open();
      }
    };
  });
  