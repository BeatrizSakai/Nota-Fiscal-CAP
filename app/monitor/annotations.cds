using NotaFiscalService as service from '../../srv/cat-service';
annotate service.NotaFiscalServicoMonitor with @(
    UI.FieldGroup #GeneratedGroup : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Value : idAlocacaoSAP,
            },
            {
                $Type : 'UI.DataField',
                Value : orderIdPL,
            },
            {
                $Type : 'UI.DataField',
                Value : chaveDocumentoMae,
            },
            {
                $Type : 'UI.DataField',
                Value : chaveDocumentoFilho,
            },
            {
                $Type : 'UI.DataField',
                Value : status,
            },
            {
                $Type : 'UI.DataField',
                Value : numeroNfseServico,
            },
            {
                $Type : 'UI.DataField',
                Value : serieNfseServico,
            },
            {
                $Type : 'UI.DataField',
                Value : dataEmissaoNfseServico,
            },
            {
                $Type : 'UI.DataField',
                Value : chaveAcessoNfseServico,
            },
            {
                $Type : 'UI.DataField',
                Value : codigoVerificacaoNfse,
            },
            {
                $Type : 'UI.DataField',
                Value : cnpjTomador,
            },
            {
                $Type : 'UI.DataField',
                Value : codigoFornecedor,
            },
            {
                $Type : 'UI.DataField',
                Value : nomeFornecedor,
            },
            {
                $Type : 'UI.DataField',
                Value : numeroPedidoCompra,
            },
            {
                $Type : 'UI.DataField',
                Value : itemPedidoCompra,
            },
            {
                $Type : 'UI.DataField',
                Value : numeroDocumentoMIRO,
            },
            {
                $Type : 'UI.DataField',
                Value : anoFiscalMIRO,
            },
            {
                $Type : 'UI.DataField',
                Value : documentoContabilMiroSAP,
            },
            {
                $Type : 'UI.DataField',
                Value : numeroNotaFiscalSAP,
            },
            {
                $Type : 'UI.DataField',
                Value : serieNotaFiscalSAP,
            },
            {
                $Type : 'UI.DataField',
                Value : numeroControleDocumentoSAP,
            },
            {
                $Type : 'UI.DataField',
                Value : documentoVendasMae,
            },
            {
                $Type : 'UI.DataField',
                Value : documentoFaturamentoMae,
            },
            {
                $Type : 'UI.DataField',
                Value : localPrestacaoServico,
            },
            {
                $Type : 'UI.DataField',
                Value : valorEfetivoFrete,
            },
            {
                $Type : 'UI.DataField',
                Value : valorLiquidoFreteNfse,
            },
            {
                $Type : 'UI.DataField',
                Value : valorBrutoNfse,
            },
            {
                $Type : 'UI.DataField',
                Value : issRetido,
            },
            {
                $Type : 'UI.DataField',
                Value : estornado,
            },
            {
                $Type : 'UI.DataField',
                Value : enviadoParaPL,
            },
            {
                $Type : 'UI.DataField',
                Value : logErroFlag,
            },
            {
                $Type : 'UI.DataField',
                Value : mensagemErro,
            },
            {
                $Type : 'UI.DataField',
                Value : tipoMensagemErro,
            },
            {
                $Type : 'UI.DataField',
                Value : classeMensagemErro,
            },
            {
                $Type : 'UI.DataField',
                Value : numeroMensagemErro,
            },
        ],
    },
    UI.Facets : [
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'GeneratedFacet1',
            Label : 'General Information',
            Target : '@UI.FieldGroup#GeneratedGroup',
        },
    ],
    UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Value : logErroFlag,
            @UI.Importance : #High,
        },
        {
            $Type : 'UI.DataField',
            Value : idAlocacaoSAP,
            @UI.Importance : #High,
        },
        {
            $Type : 'UI.DataField',
            Value : orderIdPL,
            @UI.Importance : #High,
        },
        {
            $Type : 'UI.DataField',
            Value : chaveDocumentoMae,
            @UI.Importance : #High,
        },
        {
            $Type : 'UI.DataField',
            Value : chaveDocumentoFilho,
            @UI.Importance : #High,
        },
        {
            $Type : 'UI.DataField',
            Value : status,
            @UI.Importance : #High,
        },
        {
            $Type : 'UI.DataField',
            Value : numeroNfseServico,
            @UI.Importance : #High,
        },
        {
            $Type : 'UI.DataField',
            Value : serieNfseServico,
            @UI.Importance : #High,
        },
        {
            $Type : 'UI.DataField',
            Value : dataEmissaoNfseServico,
            @UI.Importance : #High,
        },
        {
            $Type : 'UI.DataField',
            Value : chaveAcessoNfseServico,
            @UI.Importance : #High,
        },
        {
            $Type : 'UI.DataField',
            Value : codigoVerificacaoNfse,
            @UI.Importance : #High,
        },
        {
            $Type : 'UI.DataField',
            Value : numeroDocumentoMIRO,
            @UI.Importance : #High,
        },
        {
            $Type : 'UI.DataField',
            Value : valorBrutoNfse,
            @UI.Importance : #High,
        },
        {
            $Type : 'UI.DataField',
            Value : valorLiquidoFreteNfse,
            @UI.Importance : #High,
        },
        {
            $Type : 'UI.DataField',
            Value : valorEfetivoFrete,
            @UI.Importance : #High,
        },
    ],
);