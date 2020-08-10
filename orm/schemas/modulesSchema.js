const mongoose = require('mongoose');
const Schema   = mongoose.Schema;

const ModulesSchema = new Schema({
    name                 : {type: String, index: true},
    description          : {type: String},
    version              : {type: String},
    path                 : {type: String},
    url                  : {type: String},
    cronNames            : [String],
    mailTypeCode         : [{type: String}],
    loadApp              : {type: Boolean, default: true},
    loadTranslationBack  : {type: Boolean, default: false},
    loadTranslationFront : {type: Boolean, default: false},
    files                : [String],
    active               : {type: Boolean, default: false},
    config               : {type: Object, default: {}},
    packageDependencies  : {
        theme : {type: Array, default: []},
        api   : {type: Array, default: []}
    },
    type                     : {type: String},
    moduleDependencies       : [String],
    component_template_front : {type: String, default: null}
});

module.exports = ModulesSchema;