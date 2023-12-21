const auth        = require('./auth.json');
const cart        = require('./cart.json');
const category    = require('./category.json');
const cmsBlocks   = require('./cmsBlocks.json');
const common      = require('./common.json');
const component   = require('./component.json');
const config      = require('./config.json');
const discount    = require('./discount.json');
const language    = require('./language.json');
const newsletter  = require('./newsletter.json');
const products    = require('./products.json');
const shipments   = require('./shipments.json');
const news        = require('./news.json');
const statics     = require('./statics.json');
const statistics  = require('./statistics.json');
const suppliers   = require('./suppliers.json');
const territories = require('./territories.json');
const trademarks  = require('./trademarks.json');
const themeConfig = require('./themeConfig.json');
const users       = require('./users.json');

module.exports = {
    ...auth,
    ...cart,
    ...category,
    ...cmsBlocks,
    ...common,
    ...component,
    ...config,
    ...discount,
    ...language,
    ...news,
    ...newsletter,
    ...products,
    ...shipments,
    ...statics,
    ...statistics,
    ...suppliers,
    ...territories,
    ...trademarks,
    ...themeConfig,
    ...users
};