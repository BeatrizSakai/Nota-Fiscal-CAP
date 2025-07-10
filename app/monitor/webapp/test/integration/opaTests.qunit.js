sap.ui.require(
    [
        'sap/fe/test/JourneyRunner',
        'monitoramento/monitor/test/integration/FirstJourney',
		'monitoramento/monitor/test/integration/pages/NotaFiscalServicoMonitorList',
		'monitoramento/monitor/test/integration/pages/NotaFiscalServicoMonitorObjectPage'
    ],
    function(JourneyRunner, opaJourney, NotaFiscalServicoMonitorList, NotaFiscalServicoMonitorObjectPage) {
        'use strict';
        var JourneyRunner = new JourneyRunner({
            // start index.html in web folder
            launchUrl: sap.ui.require.toUrl('monitoramento/monitor') + '/index.html'
        });

       
        JourneyRunner.run(
            {
                pages: { 
					onTheNotaFiscalServicoMonitorList: NotaFiscalServicoMonitorList,
					onTheNotaFiscalServicoMonitorObjectPage: NotaFiscalServicoMonitorObjectPage
                }
            },
            opaJourney.run
        );
    }
);