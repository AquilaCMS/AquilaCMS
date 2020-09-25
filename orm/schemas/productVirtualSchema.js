const mongooseLeanVirtuals = require('mongoose-lean-virtuals');
const mongoose             = require('mongoose');
const reviewService        = require('../../services/reviews');
const Schema               = mongoose.Schema;

/**
 * @typedef {object} ProductVirtualSchema
 * @property {string} downloadLink default:null
 * @property {string} downloadInfos default:null
 */
const ProductVirtualSchema = new Schema({
    downloadLink  : {type: String, default: null},
    downloadInfos : {type: String, default: null}
}, {
    discriminatorKey : 'kind',
    toObject         : {virtuals: true},
    toJSON           : {virtuals: true}
});

ProductVirtualSchema.methods.updateData = async function (data, cb) {
    data.price.priceSort = data.price.et.special === undefined || data.price.et.special === null ? data.price.et.normal : data.price.et.special;
    reviewService.computeAverageRateAndCountReviews(data);
    try {
        const updPrd = await this.model('VirtualProduct').findOneAndUpdate({_id: this._id}, {$set: data}, {new: true});
        return cb(null, updPrd);
    } catch (err) {
        return cb(err);
    }
};

ProductVirtualSchema.methods.addToCart = async function (cart, item, user, lang) {
    item.type   = 'virtual';
    const _cart = await this.basicAddToCart(cart, item, user, lang);
    return _cart;
};
// Permet de récupérer les champs virtuel après un lean
ProductVirtualSchema.plugin(mongooseLeanVirtuals);

module.exports = ProductVirtualSchema;