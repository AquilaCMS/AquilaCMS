const mongoose = require('mongoose');
const Schema   = mongoose.Schema;

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
    phone              : String,
    purchasing_manager : String,
    active             : {type: Boolean, default: true},
    creationDate       : {type: Date, default: Date.now}
});

SuppliersSchema.statics.insertIfNotExists = async function (supplierName, cb) {
    const res = await this.find({name: supplierName});
    if (res.length === 0) {
        const s     = {name: supplierName};
        const Model = mongoose.model('suppliers', SuppliersSchema);
        const sp    = new Model(s);
        sp.save();
        cb(sp._id, res);
    }
};

module.exports = SuppliersSchema;