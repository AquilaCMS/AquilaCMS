const mongoose       = require('mongoose');
const {aquilaEvents} = require('../../utils');

const Schema  = mongoose.Schema;
const {Mixed} = Schema.Types;

const ProductAttributeTranslationSchema = new Schema({
    name  : {type: String},
    value : {type: Mixed}
}, {
    _id : false,
    id  : false
});

const ProductTranslationSchema = new Schema({
    name         : {type: String},
    slug         : {type: String},
    description1 : {
        title : {type: String},
        text  : {type: String}
    },
    description2 : {
        title : {type: String},
        text  : {type: String}
    },
    canonical : {type: String},
    metaDesc  : {type: String}
}, {
    _id : false
});

aquilaEvents.emit('productAttributeTranslationSchemaInit', ProductAttributeTranslationSchema);
aquilaEvents.emit('productTranslationSchemaInit', ProductTranslationSchema);

module.exports = {
    ProductAttributeTranslationSchema,
    ProductTranslationSchema
};