const {DownloadHistory}        = require("../orm/models");
const QueryBuilder             = require('../utils/QueryBuilder');
const NSErrors                 = require("../utils/errors/NSErrors");

const restrictedFields         = [];
const defaultFields            = ['user', 'product'];
const queryBuilder             = new QueryBuilder(DownloadHistory, restrictedFields, defaultFields);

const getHistory = async (PostBody) => {
    return queryBuilder.find(PostBody);
};

const addToHistory = async (user, product) => {
    if (!user || !product) throw NSErrors.InvalidParameters;
    const existingHistory = await DownloadHistory.findOne({$and: [{"user.email": user.email}, {"product.code": product.code}]});
    if (existingHistory) {
        return DownloadHistory.findOneAndUpdate({$and: [{"user.email": user.email}, {"product.code": product.code}]}, {$inc: {countDownloads: 1}, lastDownloadDate: new Date()});
    }
    return DownloadHistory.create({
        user,
        product,
        firstDownloadDate : new Date(),
        lastDownloadDate  : new Date(),
        countDownloads    : 1
    });
};

module.exports = {
    getHistory,
    addToHistory
};