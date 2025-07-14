using NotaFiscalService as service from '../../srv/cat-service';

annotate service.ConfiguracoesISS with @(
    // Bloco principal de anotações da UI
    UI : {
        HeaderInfo : {
            TypeName : 'Configuração de ISS',
            TypeNamePlural : 'Configurações de ISS',
            Title : {
                Value : empresa.nome
            }
        },
        FieldGroup #GeneratedGroup : {
            $Type : 'UI.FieldGroupType',
            Data : [
                { $Type : 'UI.DataField', Label : 'Mandante',             Value : mandt, },
                { $Type : 'UI.DataField', Label : 'Empresa',              Value : empresa_ID, },
                { $Type : 'UI.DataField', Label : 'Local de Negócio',     Value : loc_neg, },
                { $Type : 'UI.DataField', Label : 'Local do Fornecedor',  Value : loc_fornec, },
                { $Type : 'UI.DataField', Label : 'Prestação de Serviço', Value : prestac_serv, },
                { $Type : 'UI.DataField', Label : 'Prestador de Serviço', Value : prestad_serv, },
                { $Type : 'UI.DataField', Label : 'Serviço Prestado',     Value : serv_prest, },
                { $Type : 'UI.DataField', Label : 'Tipo de Serviço',      Value : serv_type, },
                { $Type : 'UI.DataField', Label : 'Verificação',          Value : verif, },
                { $Type : 'UI.DataField', Label : 'Válido De',            Value : val_de, },
                { $Type : 'UI.DataField', Label : 'Válido Até',           Value : val_ate, },
            ]
        },
        Facets : [
            {
                $Type : 'UI.ReferenceFacet',
                ID : 'GeneratedFacet1',
                Label : 'Informações Gerais',
                Target : '@UI.FieldGroup#GeneratedGroup',
            }
        ],
        LineItem : [
            { Value: empresa.nome,   Label: 'Empresa' },
            { Value: loc_neg,        Label: 'Local de Negócio' },
            { Value: prestac_serv,   Label: 'Prestação de Serviço' },
            { Value: val_de,         Label: 'Válido De' },
            { Value: val_ate,        Label: 'Válido Até' },
        ],
        FieldGroup #Main : {
            Data : [
                { Value: empresa_ID,   Label: 'Empresa' },
                { Value: loc_neg,      Label: 'Local de Negócio' },
                { Value: loc_fornec,   Label: 'Local do Fornecedor' },
                { Value: prestac_serv, Label: 'Prestação de Serviço' },
                { Value: prestad_serv, Label: 'Prestador de Serviço' },
                { Value: serv_prest,   Label: 'Serviço Prestado' },
                { Value: serv_type,    Label: 'Tipo de Serviço' },
                { Value: verif,        Label: 'Verificação' },
                { Value: val_de,       Label: 'Válido De' },
                { Value: val_ate,      Label: 'Válido Até' }
            ]
        }
    }
) {
    // Anotação para o Value Help do campo "empresa"
    @Common.Label : 'Empresa'
    empresa @(Common : {
        Text              : empresa.nome,
        TextArrangement : #TextOnly,
        ValueList       : {
            CollectionPath : 'Empresas',
            Parameters     : [
                {
                    $Type             : 'Common.ValueListParameterInOut',
                    LocalDataProperty : empresa_ID,
                    ValueListProperty : 'ID'
                },
                {
                    $Type             : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty : 'nome'
                }
            ]
        }
    });
};