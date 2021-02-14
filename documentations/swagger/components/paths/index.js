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
const site        = require('./site.json');
const statics     = require('./statics.json');
const statistics  = require('./statistics.json');
const territories = require('./territories.json');
const theme       = require('./theme.json');
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
    ...newsletter,
    ...products,
    ...shipments,
    ...site,
    ...statics,
    ...statistics,
    ...territories,
    ...theme,
    ...users
};