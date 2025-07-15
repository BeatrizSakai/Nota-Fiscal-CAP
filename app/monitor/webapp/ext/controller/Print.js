sap.ui.define([
    "sap/m/MessageToast",
    "sap/ui/core/mvc/View" // <-- IMPORTANTE: Adicionamos a dependência da View
], function (MessageToast, View) {
    'use strict';

    return {
        onPressPrint: function (oEvent) {
            window.print()
        }        
    }      
});