const mongoose = require('mongoose');
const Schema   = mongoose.Schema;

/**
 * @typedef {object} SuppliersSchema
 * @property {string} code.required
 * @property {string} name.required
 * @property {string} type
 * @property {string} contactPrenom
 * @property {string} contactNom
 * @property {string} addr_1
 * @property {string} addr_2
 * @property {string} cpostal
 * @property {string} city
 * @property {string} mail
 * @property {number} phone
 * @property {string} purchasing_manager
 * @property {boolean} active default:true
 * @property {string} creationDate Date - default:Date.now
 */
const SuppliersSchema = new Schema({
    code               : {type: String, required: true, unique: true},
    name               : {type: String, required: true},
    type               : {type: String},
    contactPrenom      : {type: String},
    contactNom         : {type: String},
    addr_1             : String,
    addr_2             : String,
    cpostal            : String,
    city               : String,
    mail               : String,
    phone              : Number,
    purchasing_manager : String,
    active             : {type: Boolean, default: true},
    creationDate       : {type: Date, default: Date.now}
});

SuppliersSchema.statics.insertIfNotExists = async function (supplierName, cb) {
    const res = await this.find({name: supplierName});
    if (res.length === 0) {
        const s = {name: supplierName};
        const Model = mongoose.model('suppliers', SuppliersSchema);
        const sp = new Model(s);
        sp.save();
        cb(sp._id, res);
    }
};

module.exports = SuppliersSchema;