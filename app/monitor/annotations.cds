using NotaFiscalService as service from '../../srv/cat-service';

annotate service.NotaFiscalServicoMonitor with @(
    
    UI.FieldGroup #GeneratedGroup  : {
        $Type: 'UI.FieldGroupType',
        Data : [
            {
                $Type: 'UI.DataField',
                Value: idAlocacaoSAP,
            },
            {
                $Type: 'UI.DataField',
                Value: orderIdPL,
            },
            {
                $Type: 'UI.DataField',
                Value: chaveDocumentoMae,
            },
            {
                $Type: 'UI.DataField',
                Value: chaveDocumentoFilho,
            },
            {
                $Type: 'UI.DataField',
                Value: status,
            },
            {
                $Type: 'UI.DataField',
                Value: numeroNfseServico,
            },
            {
                $Type: 'UI.DataField',
                Value: serieNfseServico,
            },
            {
                $Type: 'UI.DataField',
                Value: dataEmissaoNfseServico,
            },
            {
                $Type: 'UI.DataField',
                Value: chaveAcessoNfseServico,
            },
            {
                $Type: 'UI.DataField',
                Value: codigoVerificacaoNfse,
            },
            {
                $Type: 'UI.DataField',
                Value: cnpjTomador,
            },
            {
                $Type: 'UI.DataField',
                Value: codigoFornecedor,
            },
            {
                $Type: 'UI.DataField',
                Value: nomeFornecedor,
            },
            {
                $Type: 'UI.DataField',
                Value: numeroPedidoCompra,
            },
            {
                $Type: 'UI.DataField',
                Value: itemPedidoCompra,
            },
            {
                $Type: 'UI.DataField',
                Value: numeroDocumentoMIRO,
            },
            {
                $Type: 'UI.DataField',
                Value: anoFiscalMIRO,
            },
            {
                $Type: 'UI.DataField',
                Value: documentoContabilMiroSAP,
            },
            {
                $Type: 'UI.DataField',
                Value: numeroNotaFiscalSAP,
            },
            {
                $Type: 'UI.DataField',
                Value: serieNotaFiscalSAP,
            },

            {
                $Type: 'UI.DataField',
                Value: numeroControleDocumentoSAP,
            },
            {
                $Type: 'UI.DataField',
                Value: documentoVendasMae,
            },

            {
                $Type: 'UI.DataField',
                Value: documentoFaturamentoMae,
            },

            {
                $Type: 'UI.DataField',
                Value: localPrestacaoServico,
            },
            {
                $Type: 'UI.DataField',
                Value: valorEfetivoFrete,
            },
            {
                $Type: 'UI.DataField',
                Value: valorLiquidoFreteNfse,
            },
            {
                $Type: 'UI.DataField',
                Value: valorBrutoNfse,
            },
            {
                $Type: 'UI.DataField',
                Value: issRetido,
            },
            {
                $Type: 'UI.DataField',
                Value: estornado,
            },
            {
                $Type: 'UI.DataField',
                Value: enviadoParaPL,
            },

        ],
    },
    UI.Facets                      : [{
        $Type : 'UI.ReferenceFacet',
        ID    : 'GeneratedFacet1',
        Label : 'Informações Gerais',
        Target: '@UI.FieldGroup#GeneratedGroup',
    }, ],
    UI.LineItem                    : [
        {
            $Type                    : 'UI.DataField',
            Value                    : idAlocacaoSAP,
            Criticality              : criticality,
            CriticalityRepresentation: #WithoutIcon,
            @UI.Importance           : #High,
        },
        {
            $Type                    : 'UI.DataField',
            Value                    : orderIdPL,
            Criticality              : criticality,
            CriticalityRepresentation: #WithoutIcon,
            @UI.Importance           : #High,
        },
        {
            $Type                    : 'UI.DataField',
            Value                    : chaveDocumentoMae,
            Criticality              : criticality,
            CriticalityRepresentation: #WithoutIcon,
            @UI.Importance           : #High,
        },
        {
            $Type                    : 'UI.DataField',
            Value                    : chaveDocumentoFilho,
            Criticality              : criticality,
            CriticalityRepresentation: #WithoutIcon,
            @UI.Importance           : #High,
        },
        {
            $Type                    : 'UI.DataField',
            Value                    : status,
            Criticality              : criticality,
            CriticalityRepresentation: #WithoutIcon,
            @UI.Importance           : #High,
        },
        {
            $Type                    : 'UI.DataField',
            Value                    : numeroNfseServico,
            Criticality              : criticality,
            CriticalityRepresentation: #WithoutIcon,
            @UI.Importance           : #High,
        },
        {
            $Type                    : 'UI.DataField',
            Value                    : serieNfseServico,
            Criticality              : criticality,
            CriticalityRepresentation: #WithoutIcon,
            @UI.Importance           : #High,
        },
        {
            $Type                    : 'UI.DataField',
            Value                    : dataEmissaoNfseServico,
            Criticality              : criticality,
            CriticalityRepresentation: #WithoutIcon,
            @UI.Importance           : #High,
        },
        {
            $Type                    : 'UI.DataField',
            Value                    : chaveAcessoNfseServico,
            Criticality              : criticality,
            CriticalityRepresentation: #WithoutIcon,
            @UI.Importance           : #High,
        },
        {
            $Type                    : 'UI.DataField',
            Value                    : codigoVerificacaoNfse,
            Criticality              : criticality,
            CriticalityRepresentation: #WithoutIcon,
            @UI.Importance           : #High,
        },
        {
            $Type                    : 'UI.DataField',
            Value                    : numeroDocumentoMIRO,
            Criticality              : criticality,
            CriticalityRepresentation: #WithoutIcon,
            @UI.Importance           : #High,
        },
        {
            $Type                    : 'UI.DataField',
            Value                    : valorBrutoNfse,
            Criticality              : criticality,
            CriticalityRepresentation: #WithoutIcon,
            @UI.Importance           : #High,
        },
        {
            $Type                    : 'UI.DataField',
            Value                    : valorLiquidoFreteNfse,
            Criticality              : criticality,
            CriticalityRepresentation: #WithoutIcon,
            @UI.Importance           : #High,
        },
        {
            $Type                    : 'UI.DataField',
            Value                    : valorEfetivoFrete,
            Criticality              : criticality,
            CriticalityRepresentation: #WithoutIcon,
            @UI.Importance           : #High,
        },
        {
            $Type                    : 'UI.DataFieldForAction',
            Action                   : 'NotaFiscalService.rejeitarFrete',
            Criticality              : criticality,
            CriticalityRepresentation: #WithoutIcon,
            Label                    : 'Rejeitar Frete',
        },
        {
            $Type                    : 'UI.DataFieldForAction',
            Action                   : 'NotaFiscalService.avancarStatusNFs',
            Criticality              : criticality,
            CriticalityRepresentation: #WithoutIcon,
            Label                    : 'Próxima Etapa',
        },
        {
            $Type: 'UI.DataField',
            Value: tipoMensagemErro,
        },
    ],
    UI.HeaderInfo : {
        TypeName : '',
        TypeNamePlural : '',
        Title : {
            $Type : 'UI.DataField',
            Value : idAlocacaoSAP,
        },
        Description : {
            $Type : 'UI.DataField',
            Value : 'Nota Fiscal',
        },
    },
);
