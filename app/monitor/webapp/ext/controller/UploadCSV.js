sap.ui.define([
  "sap/ui/core/Fragment",
  "sap/m/MessageToast",
  "sap/m/MessageBox"
], function (Fragment, MessageToast, MessageBox) {
  "use strict";

  const FRAG_ID = "UploadCsvDlg";   // prefixo do fragmento
  const FILE_ID = "fileUploader";   // id do FileUploader

  return {

    /* Botão da barra de ações (“Importar CSV”) --------------------------- */
    onUploadCSV: async function () {

      /* 1️⃣  Carrega o fragmento apenas na primeira vez */
      if (!this.oUploadDialog) {
        this.oUploadDialog = await this.loadFragment({
          id: FRAG_ID,
          name: "monitoramento.monitor.ext.fragment.UploadCSVDialog"
        });

        /* 2️⃣  Botão Cancelar */
        Fragment.byId(FRAG_ID, "ala13go123124")
          .attachPress(() => this.oUploadDialog.close());

        /* 3️⃣  Botão Enviar */
        Fragment.byId(FRAG_ID, "algoa13123124")
          .attachPress(async () => {

            /* ---- leitura do arquivo -------------------------------------- */
            const oUploader = Fragment.byId(FRAG_ID, FILE_ID);
            console.log("[UPLOAD] oUploader:", oUploader);

            // 1. input[type=file] real → id termina em "-fu"
            const oInput = oUploader.getDomRef("fu");
            console.log("[UPLOAD] file input:", oInput, oInput?.files);

            if (!oInput || !oInput.files || !oInput.files.length) {
              MessageToast.show("Escolha um arquivo CSV primeiro.");
              return;
            }

            const file = oInput.files[0];
            console.log("[UPLOAD] file:", file);
            const csvText = await file.text();

            /* ---- chamada da action CAP ----------------------------------- */
            const oComponent = sap.ui.core.Component.getOwnerComponentFor(oUploader);
            const oModel = oComponent && oComponent.getModel();   // ""

            console.log("[UPLOAD] Componente:", oComponent);
            console.log("[UPLOAD] Modelo:", oModel);

            if (!oModel) {
              MessageToast.show("Modelo OData não encontrado.");
              return;
            }

            const oCtx = oModel.bindContext(
              "/importarCSV(...)",          // caminho certo (veio do $metadata)
              null,
              { $$groupId: "$direct" }     // ⬅️ dispara imediatamente
            );
            oCtx.setParameter("fileContent", csvText);
            try {
              await oCtx.execute();
              const oResult = await oCtx.getBoundContext().requestObject();
              console.log("Resultado da action:", oResult);
              const aRes = oResult.value
              MessageBox.success(`Importação concluída: ${aRes.length} itens adicionados!`);
              await oModel.refresh();                    // recarrega tabela
            } catch (e) {
              MessageBox.error("Erro: " + e.message);
              console.error(e);
            } finally {
              oUploader.clear();
              this.oUploadDialog.close();
            }
          });
      }

      /* 4️⃣  Abre o diálogo (os handlers já estão ligados) */
      this.oUploadDialog.open();
    },
  };
});
