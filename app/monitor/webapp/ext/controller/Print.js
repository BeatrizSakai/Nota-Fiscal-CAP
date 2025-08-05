sap.ui.define([], function () {
    "use strict";
  
    return {
      onPressPrint: async function (_oCtx, _aSel, _oLB) {
  
        /* 1. Localiza a tabela MDC */
        const TABLE_ID =
          "monitoramento.monitor::NotaFiscalServicoMonitorList--fe::table::NotaFiscalServicoMonitor::LineItem";
        const oTable     = sap.ui.getCore().byId(TABLE_ID);
        if (!oTable) { console.error("Tabela não encontrada"); return; }
  
        /* 2. Garante que todos os registros filtrados estão em memória */
        const oRowBind   = oTable.getRowBinding();
        await oRowBind.requestContexts(0, oRowBind.getLength());
  
        /* 3. Constrói array de objetos JS */
        const aData      = oRowBind.getCurrentContexts().map(ctx => ctx.getObject());
  
        /* 4. Cabeçalhos (lê do metadata da tabela) ------------------- */
        const aColumns = oTable.getColumns().map(col => ({
          width  : col.getWidth() || "auto",
          prop   : col.getPropertyKey()           // gerado pelo MDC
        }));
  
        /* 5. Monta HTML ---------------------------------------------- */
        const sHtml = /* html */`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Relatório NF – ${new Date().toLocaleDateString("pt-BR")}</title>
            <style>
            @page { size:A4 landscape; margin:10mm; }
            body  { font:12px "72",Arial,sans-serif; margin:0; }
            h1    { text-align:center; margin:0 0 12px 0; }
            table { width:100%; border-collapse:collapse; }
            th    { background:#0a6ed1; color:#fff; padding:6px; text-align:left; }
            td    { border-bottom:1px solid #ddd; padding:6px; }
            tr:nth-child(even){ background:#f8f9fa; }
            </style>
        </head>
        <body>
            <h1>Monitoramento NF – ${new Date().toLocaleDateString("pt-BR")}</h1>
            <table>
            <thead>
                <tr>
                ${aColumns.map(c => `<th style="width:${c.width}">${c.header}</th>`).join("")}
                </tr>
            </thead>
            <tbody>
                ${aData.map(row => `
                <tr>
                    ${aColumns.map(c => `<td>${row[c.prop] ?? ""}</td>`).join("")}
                </tr>`).join("")}
            </tbody>
            </table>
        </body>
        </html>`;
        
        /* 6. Abre nova janela e imprime ------------------------------- */
        const win = window.open("", "_blank", "width=1024,height=768");
        win.document.write(sHtml);
        win.document.close();
        setTimeout(() => win.print(), 300);   // pequeno delay p/ CSS carregar
      }
    };
  });
  