const mongooseLeanVirtuals = require('mongoose-lean-virtuals');
const mongoose             = require('mongoose');
const reviewService        = require('../../services/reviews');
const Schema               = mongoose.Schema;
const NSErrors             = require("../../utils/errors/NSErrors");

const ProductSimpleSchema = new Schema({
    stock : {
        qty          : {type: Number, default: 0},
        qty_booked   : {type: Number, default: 0},
        date_selling : Date,
        date_supply  : Date,
        orderable    : {type: Boolean, default: false},
        status       : {type: String, default: "liv", enum: ["liv", "dif", "epu"]},
        label        : String,
        translation  : {}
    }
}, {
    discriminatorKey : 'kind',
    toObject         : {virtuals: true},
    toJSON           : {virtuals: true}
});

ProductSimpleSchema.virtual("stock.qty_real").get(function () {
    return this.stock.qty - this.stock.qty_booked;
});

ProductSimpleSchema.methods.updateData = async function (data, cb) {
    data.price.priceSort = data.price.et.special === undefined || data.price.et.special === null ? data.price.et.normal : data.price.et.special;
    reviewService.computeAverageRateAndCountReviews(data);
    try {
        const updPrd = await this.model('SimpleProduct').findOneAndUpdate({_id: this._id}, {$set: data}, {new: true});
        return cb(null, updPrd);
    } catch (err) {
        return cb(err);
    }
};

ProductSimpleSchema.methods.addToCart = async function (cart, item, user, lang) {
    const prdServices = require('../../services/products');
    // On gère le stock
    // Commandable et on gère la reservation du stock
    if (global.envConfig.stockOrder.bookingStock === "panier") {
        if (!prdServices.checkProductOrderable(this.stock, item.quantity).ordering.orderable) throw NSErrors.ProductNotInStock;
        // Reza de la qte
        await prdServices.updateStock(this._id, -item.quantity);
    }
    item.type = "simple";
    const _cart = await this.basicAddToCart(cart, item, user, lang);
    return _cart;
};
// Permet de récupérer les champs virtuel après un lean
ProductSimpleSchema.plugin(mongooseLeanVirtuals);

module.exports = ProductSimpleSchema;