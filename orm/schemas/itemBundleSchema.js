const mongoose      = require('mongoose');
const Schema        = mongoose.Schema;
const ObjectId      = Schema.ObjectId;

const ItemBundle = new Schema({
    selections : [{
        bundle_section_ref : {type: String, required: true},
        products           : [{type: ObjectId, ref: 'products'}]
    }]
}, {
    discriminatorKey : 'type'
});

ItemBundle.methods.decreaseStock = async function (cartId, cb) {
    const BundleProduct = require('../models/productBundle');
    try {
        const _product = await BundleProduct.findOneAndUpdate(
            {
                _id : this.id,
                qty : {$gt: this.quantity}
            },
            {
                $inc  : -this.quantity,
                $push : {
                    carted : {
                        id_cart : cartId,
                        qty     : this.quantity
                    }
                }
            }
        );
        if (!_product) return cb({code: 'INADEQUATE_INVENTORY', message: 'Inventaire inadéquat.'});
        return cb();
    } catch (err) {
        return cb(err);
    }
};

ItemBundle.methods.rollbackStock = async function (cb) {
    const BundleProduct = require('../models/productBundle');
    try {
        await BundleProduct.updateOne({_id: this.id}, {$inc: this.quantity});
        return cb();
    } catch (err) {
        return cb(err);
    }
};

ItemBundle.methods.populateItem = async function () {
    const {Products} = require('../models');
    const self = this;
    for (const selection of self.selections) {
        for (const [index, _product] of Object.entries(selection.products)) {
            if (selection.products[index]._id === undefined) {
                selection.products[index] = await Products.findById(_product);
            }
        }
    }
    if (self.id._id === undefined) self.id = await Products.findById(self.id);
};

module.exports = ItemBundle;