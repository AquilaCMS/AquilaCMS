const mongoose       = require('mongoose');
const {aquilaEvents} = require('../../utils');

const Schema = mongoose.Schema;

const ProductDeclinaisonSchema = new Schema({
    active      : {type: Boolean},
    name        : {type: String},
    default     : {type: Boolean},
    code        : {type: String},
    type        : {type: String, enum: ['list', 'radio', 'checkbox']},
    translation : {
        /**
         *  lang: {
         *      display: Boolean,
         *      value: []
         *  }
         */
    }
});

aquilaEvents.emit('ProductDeclinaisonSchemaInit', ProductDeclinaisonSchema);

module.exports = ProductDeclinaisonSchema;