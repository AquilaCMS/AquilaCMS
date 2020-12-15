const mongoose = require('mongoose');

/* const migration_N_Sample = async () => {
    console.log('Applying migration script "samigration_N_Samplemple"...');
}; */

const migration_1_ModulesNewPackageDependencies = async () => {
    console.log('Applying migration script "migration_1_ModulesNewPackageDependencies"...');
    const modules = (await mongoose.connection.collection('modules').find({})) || [];
    modules.forEach(async (mod) => {
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
    });
};

const migration_2_Metrics = async () => {
    console.log('Applying migration script "migration_2_Metrics"...');
    const config = await mongoose.connection.collection('configurations').findOne({});
    if (config && config.environment) {
        await mongoose.connection.collection('configurations').updateOne({}, {$unset: {'environment.sendMetrics': {}}});
    }
};

const migration_3_CreatedAt = async () => {
    console.log('Applying migration script "migration_3_CreatedAt"...');

    const collectionsList = ['categories', 'contacts', 'families', 'gallery', 'mail', 'mailType', 'news', 'orders', 'products', 'productsPreview', 'shortcodes', 'statics', 'staticsPreview', 'trademarks', 'users', 'bills', 'cart', 'promo'];

    const changeCreateDateToCreatedAt = async (collection) => {
        try {
            const OneCollection = await mongoose.connection.collection(collection).findOne({});
            if (OneCollection && OneCollection.creationDate) {
                await mongoose.connection.collection(collection).updateMany({}, {$rename: {creationDate: 'createdAt'}}, false, true);
            }
        } catch (e) {console.error(e);}
    };

    for (let index = 0; index < collectionsList.length; index++) {
        await changeCreateDateToCreatedAt(collectionsList[index]);
    }
};

const migration_4_Themes = async () => {
    console.log('Applying migration script "migration_4_Themes"...');
    const theme = await mongoose.connection.collection('themeConfigs').findOne({});
    console.log(Array.isArray(theme.config.translation.fr));
    if (theme && Array.isArray(theme.config.translation.fr) === false) {
        const tabThemeKeyValueFR = [];
        for (const [key, value] of Object.entries(theme.config.translation.fr)) {
            tabThemeKeyValueFR.push({
                key,
                value,
                name        : key,
                description : '',
                group       : ''
            });
        }
        await mongoose.connection.collection('themeConfigs').updateOne({}, {$set: {'config.translation.fr': tabThemeKeyValueFR}});
        const tabThemeKeyValueEN = [];
        for (const [key, value] of Object.entries(theme.config.translation.en)) {
            tabThemeKeyValueEN.push({
                key,
                value,
                name        : key,
                description : '',
                group       : ''
            });
        }
        await mongoose.connection.collection('themeConfigs').updateOne({}, {$set: {'config.translation.en': tabThemeKeyValueEN}});
    }

    // TODO
};

const migration_5_isActive = async () => {
    console.log('Applying migration script "migration_5_isActive"...');
    const user = await mongoose.connection.collection('users').findOne({});
    if (user && !user.isActive) {
        const test = await mongoose.connection.collection('users').updateMany({}, {$set: {isActive: 'true'}});
        console.log(test);
    }
};

// Scripts must be in order: put the new scripts at the bottom
const migrationScripts = [
    migration_1_ModulesNewPackageDependencies,
    migration_2_Metrics,
    migration_3_CreatedAt,
    migration_4_Themes,
    migration_5_isActive
    // sample
];

module.exports = {
    migrationScripts
};