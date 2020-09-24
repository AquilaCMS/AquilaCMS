const mongoose     = require('mongoose');
const aquilaEvents = require('../../utils/aquilaEvents');
const Schema       = mongoose.Schema;

/**
 * @typedef {object} ContactsSchema
 * @property {object} data
 * @property {string} creationDate Date
 */

const ContactsSchema = new Schema({
    data         : {},
    creationDate : {type: Date}
});

aquilaEvents.emit('contactSchemaInit', ContactsSchema);

module.exports = ContactsSchema;