const nextRoutes = require('next-routes');

const routes = nextRoutes();

/**
 *  Multilangue pattern: /:lang([a-z]{2})?
 */

routes
    .add({ name: 'home', pattern: '/:lang([a-z]{2})?', page: 'static' })
    .add({ name: 'auth', pattern: '/:lang([a-z]{2})?/login', page: 'auth' })
    .add({ name: 'checkEmailValid', pattern: '/:lang([a-z]{2})?/checkemailvalid', page: 'checkEmailValid' })
    .add({ name: 'resetPass', pattern: '/:lang([a-z]{2})?/resetpass', page: 'resetPassword' })
    .add({ name: 'account', pattern: '/:lang([a-z]{2})?/account', page: 'account/account' })
    .add({ name: 'addresses', pattern: '/:lang([a-z]{2})?/account/addresses', page: 'account/addresses' })
    .add({ name: 'orders', pattern: '/:lang([a-z]{2})?/account/orders', page: 'account/orders' })
    .add({ name: 'rgpd', pattern: '/:lang([a-z]{2})?/account/rgpd', page: 'account/rgpd' })
    .add({ name: 'cart', pattern: '/:lang([a-z]{2})?/cart', page: 'cart' })
    .add({ name: 'cartLogin', pattern: '/:lang([a-z]{2})?/cart/login', page: 'cart/login' })
    .add({ name: 'cartAddress', pattern: '/:lang([a-z]{2})?/cart/address', page: 'cart/address' })
    .add({ name: 'cartDelivery', pattern: '/:lang([a-z]{2})?/cart/delivery', page: 'cart/delivery' })
    .add({ name: 'cartPayment', pattern: '/:lang([a-z]{2})?/cart/payment', page: 'cart/payment' })
    .add({ name: 'cartSuccess', pattern: '/:lang([a-z]{2})?/cart/success', page: 'cart/success' })
    .add({ name: 'categoryI18n', pattern: '/:lang([a-z]{2})?/c/:_slug([a-zA-Z0-9-_]+)+/:page([0-9]{1,})?', page: 'category' })
    .add({ name: 'search', pattern: '/:lang([a-z]{2})?/search/:search/:page([0-9]{1,})?', page: 'search' })
    .add({ name: 'staticI18n', pattern: '/:lang([a-z]{2})?/:_slug([a-zA-Z0-9-_]+)', page: 'static' })
    .add({ name: 'blogArticle', pattern: '/:lang([a-z]{2})?/blog/:article', page: 'blog/article' })
    .add({ name: 'product', pattern: '/:lang([a-z]{2})?/:_slug([a-zA-Z0-9-_]+)+/:product([a-zA-Z0-9-_]+)', page: 'product' });

module.exports = routes;
