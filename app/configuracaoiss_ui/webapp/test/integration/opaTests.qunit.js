sap.ui.require(
    [
        'sap/fe/test/JourneyRunner',
        'configuracaoissui/test/integration/FirstJourney',
		'configuracaoissui/test/integration/pages/ConfiguracoesISSList',
		'configuracaoissui/test/integration/pages/ConfiguracoesISSObjectPage'
    ],
    function(JourneyRunner, opaJourney, ConfiguracoesISSList, ConfiguracoesISSObjectPage) {
        'use strict';
        var JourneyRunner = new JourneyRunner({
            // start index.html in web folder
            launchUrl: sap.ui.require.toUrl('configuracaoissui') + '/index.html'
        });

       
        JourneyRunner.run(
            {
                pages: { 
					onTheConfiguracoesISSList: ConfiguracoesISSList,
					onTheConfiguracoesISSObjectPage: ConfiguracoesISSObjectPage
                }
            },
            opaJourney.run
        );
    }
);