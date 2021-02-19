/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

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
    const themes = await mongoose.connection.collection('themeConfigs').find({});
    for await (const theme of themes) {
        for (const lang of Object.keys(theme.config.translation)) {
            if (theme && Array.isArray(theme.config.translation[lang].values) === false) {
                const values           = [];
                const tabThemeKeyValue = {values};
                for (const [key, value] of Object.entries(theme.config.translation[lang])) {
                    values.push({
                        key,
                        value,
                        name        : key,
                        description : '',
                        group       : ''
                    });
                }
                await mongoose.connection.collection('themeConfigs').updateOne({_id: theme._id}, {$set: {[`config.translation.${lang}`]: tabThemeKeyValue}});
            }
        }
    }
};

const migration_5_isActive = async () => {
    console.log('Applying migration script "migration_5_isActive"...');
    const user = await mongoose.connection.collection('users').findOne({});
    if (user && !user.isActive) {
        const test = await mongoose.connection.collection('users').updateMany({}, {$set: {isActive: 'true'}});
        console.log(test);
    }
};

const migration_6_contentSecurityPolicy = async () => {
    // Not use anymore
};

// Scripts must be in order: put the new scripts at the bottom
const migrationScripts = [
    migration_1_ModulesNewPackageDependencies,
    migration_2_Metrics,
    migration_3_CreatedAt,
    migration_4_Themes,
    migration_5_isActive,
    migration_6_contentSecurityPolicy
    // sample
];

module.exports = {
    migrationScripts
};