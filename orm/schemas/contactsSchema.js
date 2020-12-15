const mongoose     = require('mongoose');
const aquilaEvents = require('../../utils/aquilaEvents');
const Schema       = mongoose.Schema;

const ContactsSchema = new Schema({
    data : {}
}, {timestamps: true});

aquilaEvents.emit('contactSchemaInit', ContactsSchema);

module.exports = ContactsSchema;