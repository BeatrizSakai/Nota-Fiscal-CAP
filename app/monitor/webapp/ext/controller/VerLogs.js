sap.ui.define([
  "sap/ui/core/Fragment",
  "sap/m/MessageToast"
], function (Fragment, MessageToast) {
  "use strict";

  const FRAG_ID  = "UploadCsvDlg";   // prefixo do fragmento
  const FILE_ID  = "fileUploader";   // id do FileUploader

  return {

    /* Botão da barra de ações (“Importar CSV”) --------------------------- */
    onUploadCSV: async function () {

      /* 1️⃣  Carrega o fragmento apenas na primeira vez */
      if (!this.oUploadDialog) {
        this.oUploadDialog = await this.loadFragment({
          id   : FRAG_ID,
          name : "monitoramento.monitor.ext.fragment.UploadCSVDialog"
        });

        /* 2️⃣  Botão Cancelar */
        Fragment.byId(FRAG_ID, "btnCancelUpload")
                .attachPress(() => this.oUploadDialog.close());

        /* 3️⃣  Botão Enviar */
        Fragment.byId(FRAG_ID, "btnSendUpload")
                .attachPress(async () => {

          /* ---- leitura do arquivo -------------------------------------- */
          const oUploader = Fragment.byId(FRAG_ID, FILE_ID);
          const file      = oUploader.getFocusDomRef()?.files[0];

          if (!file) {
            MessageToast.show("Escolha um arquivo CSV primeiro.");
            return;
          }
          const csvText = await file.text();

          /* ---- chamada da action CAP ----------------------------------- */
          const oModel = this.getView().getModel();          // OData V4
          const oCtx   = oModel.bindContext("/importarCSV(...)", null, {
            $$groupId : "csvImport"
          });
          oCtx.setParameter("fileContent", csvText);

          try {
            await oCtx.execute();                // POST na action
            const aRes = oCtx.getObject();       // array de resultados

            MessageToast.show(
              `Importação concluída: ${aRes.length} linhas.`);

            await oModel.refresh();              // recarrega a tabela

          } catch (e) {
            MessageToast.show("Erro: " + e.message);
            console.error(e);
          } finally {
            oUploader.clear();
            this.oUploadDialog.close();
          }
        });
      }

      /* 4️⃣  Abre o diálogo (os handlers já estão ligados) */
      this.oUploadDialog.open();
    }
  };
});
