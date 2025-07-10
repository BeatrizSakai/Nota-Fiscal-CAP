sap.ui.define([
    "sap/ui/test/opaQunit"
], function (opaTest) {
    "use strict";

    var Journey = {
        run: function() {
            QUnit.module("First journey");

            opaTest("Start application", function (Given, When, Then) {
                Given.iStartMyApp();

                Then.onTheNotaFiscalServicoMonitorList.iSeeThisPage();

            });


            opaTest("Navigate to ObjectPage", function (Given, When, Then) {
                // Note: this test will fail if the ListReport page doesn't show any data
                
                When.onTheNotaFiscalServicoMonitorList.onFilterBar().iExecuteSearch();
                
                Then.onTheNotaFiscalServicoMonitorList.onTable().iCheckRows();

                When.onTheNotaFiscalServicoMonitorList.onTable().iPressRow(0);
                Then.onTheNotaFiscalServicoMonitorObjectPage.iSeeThisPage();

            });

            opaTest("Teardown", function (Given, When, Then) { 
                // Cleanup
                Given.iTearDownMyApp();
            });
        }
    }

    return Journey;
});