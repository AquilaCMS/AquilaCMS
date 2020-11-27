const {Modules,
    Configuration,
    Categories,
    Contacts,
    Families,
    Gallery,
    Mail,
    MailType,
    News,
    Orders,
    Products,
    ProductsPreview,
    Shortcodes,
    Statics,
    StaticsPreview,
    Trademarks,
    Users,
    Bills,
    Cart,
    Promo} = require('../orm/models');

/* const migration_N_Sample = async () => {
    console.log('Applying migration script "samigration_N_Samplemple"...');
}; */

const migration_1_ModulesNewPackageDependencies = async () => {
    console.log('Applying migration script "migration_1_ModulesNewPackageDependencies"...');

    (await Modules.find({})).forEach((mod) => {
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
            Modules.updateOne({_id: mod._id}, {
                $set : {
                    packageDependencies
                }
            });
        }
    });
};

const migration_2_Metrics = async () => {
    console.log('Applying migration script "migration_2_Metrics"...');
    const config = await Configuration.findOne({});
    if (config && config.environment) {
        await Configuration.updateOne({}, {$unset: {'environment.sendMetrics': {}}});
    }
};

const migration_3_CreatedAt = async () => {
    console.log('Applying migration script "migration_3_CreatedAt"...');
    const categories      = await Categories.find({});
    const contacts        = await Contacts.find({});
    const families        = await Families.find({});
    const gallery         = await Gallery.find({});
    const mail            = await Mail.find({});
    const mailType        = await MailType.find({});
    const news            = await News.find({});
    const orders          = await Orders.find({});
    const products        = await Products.find({});
    const productsPreview = await ProductsPreview.find({});
    const shortcodes      = await Shortcodes.find({});
    const statics         = await Statics.find({});
    const staticsPreview  = await StaticsPreview.find({});
    const trademarks      = await Trademarks.find({});
    const users           = await Users.find({});
    const bills           = await Bills.find({});
    const cart            = await Cart.find({});
    const promo           = await Promo.find({});

    if (categories[0] && categories[0].creationDate) {
        await Categories.update({}, {$rename: {creationDate: 'createdAt'}}, false, true);
    }
    if (contacts[0] && contacts[0].creationDate) {
        await Contacts.update({}, {$rename: {creationDate: 'createdAt'}}, false, true);
    }
    if (families[0] && families[0].creationDate) {
        await Families.update({}, {$rename: {creationDate: 'createdAt'}}, false, true);
    }
    if (gallery[0] && gallery[0].creationDate) {
        await Gallery.update({}, {$rename: {creationDate: 'createdAt'}}, false, true);
    }
    if (mail[0] && mail[0].creationDate) {
        await Mail.update({}, {$rename: {creationDate: 'createdAt'}}, false, true);
    }
    if (mailType[0] && mailType[0].creationDate) {
        await MailType.update({}, {$rename: {creationDate: 'createdAt'}}, false, true);
    }
    if (news[0] && categories[0].creationDate) {
        await Categories.update({}, {$rename: {creationDate: 'createdAt'}}, false, true);
    }
    if (orders[0] && orders[0].creationDate) {
        await Orders.update({}, {$rename: {creationDate: 'createdAt'}}, false, true);
    }
    if (products[0] && products[0].creationDate) {
        await Products.update({}, {$rename: {creationDate: 'createdAt'}}, false, true);
    }
    if (productsPreview[0] && productsPreview[0].creationDate) {
        await ProductsPreview.update({}, {$rename: {creationDate: 'createdAt'}}, false, true);
    }
    if (shortcodes[0] && shortcodes[0].creationDate) {
        await Shortcodes.update({}, {$rename: {creationDate: 'createdAt'}}, false, true);
    }
    if (statics[0] && statics[0].creationDate) {
        await Statics.update({}, {$rename: {creationDate: 'createdAt'}}, false, true);
    }
    if (staticsPreview[0] && staticsPreview[0].creationDate) {
        await StaticsPreview.update({}, {$rename: {creationDate: 'createdAt'}}, false, true);
    }
    if (trademarks[0] && trademarks[0].creationDate) {
        await Trademarks.update({}, {$rename: {creationDate: 'createdAt'}}, false, true);
    }
    if (users[0] && users[0].creationDate) {
        await Users.update({}, {$rename: {creationDate: 'createdAt'}}, false, true);
    }
    if (bills[0] && bills[0].creationDate) {
        await Bills.update({}, {$rename: {creationDate: 'createdAt'}}, false, true);
    }
    if (cart[0] && cart[0].creationDate) {
        await Cart.update({}, {$rename: {creationDate: 'createdAt'}}, false, true);
    }
    if (promo[0] && promo[0].creationDate) {
        await Promo.update({}, {$rename: {creationDate: 'createdAt'}}, false, true);
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