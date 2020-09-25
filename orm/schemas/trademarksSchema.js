const mongoose  = require('mongoose');
const {slugify} = require('../../utils/utils');

const Schema = mongoose.Schema;

/**
 * @typedef {object} TrademarksSchema
 * @property {string} code
 * @property {string} name.required
 * @property {boolean} active default:true
 * @property {string} creationDate Date - default:Date.now
 */
const TrademarksSchema = new Schema({
    code         : {type: String, unique: true},
    name         : {type: String, required: true, unique: true},
    active       : {type: Boolean, default: true},
    creationDate : {type: Date, default: Date.now}
});

TrademarksSchema.statics.insertIfNotExists = async function ( trademarkName, cb ) {
    const res = await this.find({name: trademarkName});
    if (res.length === 0) {
        const t = {name: trademarkName};
        const ModelTrademarks = mongoose.model('trademarks', TrademarksSchema);
        const tm = new ModelTrademarks(t);
        tm.save();
    }
    cb(trademarkName, res);
};

TrademarksSchema.pre('save', function (next) {
    this.code = slugify(this.name);
    return next();
});

module.exports = TrademarksSchema;