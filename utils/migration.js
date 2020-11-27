const mongoose = require('mongoose');

/* const migration_N_Sample = async () => {
    console.log('Applying migration script "samigration_N_Samplemple"...');
}; */

const migration_1_ModulesNewPackageDependencies = async () => {
    console.log('Applying migration script "migration_1_ModulesNewPackageDependencies"...');
    for (const mod of (await mongoose.connection.collection('modules').find({}))) {
        const packageDependencies = {
            api   : {},
            theme : {}
        };
        if (mod.packageDependencies) {
            for (const apiOrTheme of Object.keys(mod.packageDependencies)) {
                if (Array.isArray(mod.packageDependencies[apiOrTheme])) {
                    for (const value of mod.packageDependencies[apiOrTheme]) {
                        const dependencyValue = value.split('@');
                        if (dependencyValue[0] === '') {
                            dependencyValue.splice(0, 1);
                            dependencyValue[0] = `@${dependencyValue[0]}`;
                        }
                        packageDependencies[apiOrTheme][dependencyValue[0]] = dependencyValue[1] || 'latest';
                    }
                } else {
                    packageDependencies[apiOrTheme] = mod.packageDependencies[apiOrTheme];
                }
            }
            await mongoose.connection.collection('modules').updateOne({_id: mod._id}, {
                $set : {
                    packageDependencies
                }
            });
        }
    }
};

const migration_2_Metrics = async () => {
    console.log('Applying migration script "migration_2_Metrics"...');
    const config = await mongoose.connection.collection('configurations').findOne({});
    if (config && config.environment) {
        await mongoose.connection.collection('configuration').updateOne({}, {$unset: {'environment.sendMetrics': {}}});
    }
};

const migration_3_CreatedAt = async () => {
    console.log('Applying migration script "migration_3_CreatedAt"...');
    const category        = await mongoose.connection.collection('categories').findOne({});
    const contact         = await mongoose.connection.collection('contacts').find({});
    const familie         = await mongoose.connection.collection('families').find({});
    const gallery         = await mongoose.connection.collection('gallery').find({});
    const mail            = await mongoose.connection.collection('mail').find({});
    const mailType        = await mongoose.connection.collection('mailType').find({});
    const news            = await mongoose.connection.collection('news').find({});
    const orders          = await mongoose.connection.collection('orders').find({});
    const products        = await mongoose.connection.collection('products').find({});
    const productsPreview = await mongoose.connection.collection('productsPreview').find({});
    const shortcodes      = await mongoose.connection.collection('shortcodes').find({});
    const statics         = await mongoose.connection.collection('statics').find({});
    const staticsPreview  = await mongoose.connection.collection('staticsPreview').find({});
    const trademarks      = await mongoose.connection.collection('trademarks').find({});
    const users           = await mongoose.connection.collection('users').find({});
    const bills           = await mongoose.connection.collection('bills').find({});
    const cart            = await mongoose.connection.collection('cart').find({});
    const promo           = await mongoose.connection.collection('promo').find({});

    if (category && category.creationDate) {
        await mongoose.connection.collection('categories').updateMany({}, {$rename: {creationDate: 'createdAt'}}, false, true);
    }
    if (contact && contact.creationDate) {
        await mongoose.connection.collection('contacts').updateMany({}, {$rename: {creationDate: 'createdAt'}}, false, true);
    }
    if (familie && familie.creationDate) {
        await mongoose.connection.collection('families').updateMany({}, {$rename: {creationDate: 'createdAt'}}, false, true);
    }
    if (gallery && gallery.creationDate) {
        await mongoose.connection.collection('gallery').updateMany({}, {$rename: {creationDate: 'createdAt'}}, false, true);
    }
    if (mail && mail.creationDate) {
        await mongoose.connection.collection('mail').updateMany({}, {$rename: {creationDate: 'createdAt'}}, false, true);
    }
    if (mailType && mailType.creationDate) {
        await mongoose.connection.collection('mailType').updateMany({}, {$rename: {creationDate: 'createdAt'}}, false, true);
    }
    if (news && news.creationDate) {
        await mongoose.connection.collection('news').updateMany({}, {$rename: {creationDate: 'createdAt'}}, false, true);
    }
    if (orders && orders.creationDate) {
        await mongoose.connection.collection('orders').updateMany({}, {$rename: {creationDate: 'createdAt'}}, false, true);
    }
    if (products && products.creationDate) {
        await mongoose.connection.collection('products').updateMany({}, {$rename: {creationDate: 'createdAt'}}, false, true);
    }
    if (productsPreview && productsPreview.creationDate) {
        await mongoose.connection.collection('productsPreview').updateMany({}, {$rename: {creationDate: 'createdAt'}}, false, true);
    }
    if (shortcodes && shortcodes.creationDate) {
        await mongoose.connection.collection('shortcodes').updateMany({}, {$rename: {creationDate: 'createdAt'}}, false, true);
    }
    if (statics && statics.creationDate) {
        await mongoose.connection.collection('statics').updateMany({}, {$rename: {creationDate: 'createdAt'}}, false, true);
    }
    if (staticsPreview && staticsPreview.creationDate) {
        await mongoose.connection.collection('staticsPreview').updateMany({}, {$rename: {creationDate: 'createdAt'}}, false, true);
    }
    if (trademarks && trademarks.creationDate) {
        await mongoose.connection.collection('trademarks').updateMany({}, {$rename: {creationDate: 'createdAt'}}, false, true);
    }
    if (users && users.creationDate) {
        await mongoose.connection.collection('users').updateMany({}, {$rename: {creationDate: 'createdAt'}}, false, true);
    }
    if (bills && bills.creationDate) {
        await mongoose.connection.collection('bills').updateMany({}, {$rename: {creationDate: 'createdAt'}}, false, true);
    }
    if (cart && cart.creationDate) {
        await mongoose.connection.collection('cart').updateMany({}, {$rename: {creationDate: 'createdAt'}}, false, true);
    }
    if (promo && promo.creationDate) {
        await mongoose.connection.collection('promo').updateMany({}, {$rename: {creationDate: 'createdAt'}}, false, true);
    }
};

// Scripts must be in order: put the new scripts at the bottom
const migrationScripts = [
    migration_1_ModulesNewPackageDependencies,
    migration_2_Metrics,
    migration_3_CreatedAt
    // sample
];

module.exports = {
    migrationScripts
};