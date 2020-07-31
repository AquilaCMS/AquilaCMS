const mongoose    = require('mongoose');
const Schema      = mongoose.Schema;

const ItemVirtual = new Schema({}, {
    discriminatorKey : 'type'
});

ItemVirtual.methods.populateItem = async function () {
    const {Products} = require('../models');
    const self = this;
    if (self.id._id === undefined) self.id = await Products.findById(self.id);
};

module.exports = ItemVirtual;