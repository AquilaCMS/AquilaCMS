const faker        = require('faker');
const {Trademarks} = require('../../orm/models');

const createTrademarks = (params = {name: null}) => {
    const {name}     = params;
    const trademarks = new Trademarks();
    trademarks.name  = name || faker.name.title();
    return trademarks.save();
};

const deleteAllTrademarks = async () => {
    await Trademarks.deleteMany({});
};

module.exports = {
    createTrademarks,
    deleteAllTrademarks
};