/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
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
        if (!theme.config.translation) {
            continue;
        }
        const transaltionsKeys = Object.keys(theme.config.translation);
        for (const lang of transaltionsKeys) {
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
        await mongoose.connection.collection('users').updateMany({}, {$set: {isActive: 'true'}});
    }
};

const migration_6_contentSecurityPolicy = async () => {
    // Not use anymore
};

const migration_7_Job_Translations = async () => {
    await mongoose.connection.db.collection('agendaJobs').findOneAndUpdate({name: 'Clean cache'}, {$set : {'data.comment' : {
        fr : 'Vide le cache des images', en : 'Clears the images cache'
    }}});
    await mongoose.connection.db.collection('agendaJobs').findOneAndUpdate({name: 'Remove temp file'}, {$set : {'data.comment' : {
        fr : 'Suppression des fichiers temporaires', en : 'Remove temporary files'
    }}});
    await mongoose.connection.db.collection('agendaJobs').findOneAndUpdate({name: 'Remove previews'}, {$set : {'data.comment' : {
        fr : 'Suppression des aperçus', en : 'Remove previews'
    }}});
    await mongoose.connection.db.collection('agendaJobs').findOneAndUpdate({name: 'Sitemap'}, {$set : {'data.comment' : {
        fr : 'Génération Sitemap', en : 'Sitemap Generation'
    }}});
    await mongoose.connection.db.collection('agendaJobs').findOneAndUpdate({name: 'Segmentation picto'}, {$set : {'data.comment' : {
        fr : 'Segmentation automatique des pictogrammes', en : 'Automatic pictogram segmentation'
    }}});
    await mongoose.connection.db.collection('agendaJobs').findOneAndUpdate({name: 'Canonicalisation'}, {$set : {'data.comment' : {
        fr : 'Génère les canonicals de chaque produit', en : 'Generates the canonicals of each product'
    }}});
    await mongoose.connection.db.collection('agendaJobs').findOneAndUpdate({name: 'Remove old carts'}, {$set : {'data.comment' : {
        fr : 'Suppression des anciens panier', en : 'Deleting old carts'
    }}});
    await mongoose.connection.db.collection('agendaJobs').findOneAndUpdate({name: 'Remove pending payment orders'}, {$set : {'data.comment' : {
        fr : 'Annulation des commandes en attente de paiement', en : 'Cancellation of orders awaiting payment'
    }}});
    await mongoose.connection.db.collection('agendaJobs').findOneAndUpdate({name: 'Cohérence produits'}, {$set : {'data.comment' : {
        fr : 'Script de cohérence des produits', en : 'Product consistency script'
    }}});
    await mongoose.connection.db.collection('agendaJobs').findOneAndUpdate({name: 'Build stats'}, {$set : {'data.comment' : {
        fr : 'Construction des statistiques de la veille', en : 'Construction of the statistics of the previous day'
    }}});
    await mongoose.connection.db.collection('agendaJobs').findOneAndUpdate({name: 'Cache requests clean'}, {$set : {'data.comment' : {
        fr : 'Vide le cache des requêtes', en : 'Clears the requests cache'
    }}});
    await mongoose.connection.db.collection('agendaJobs').findOneAndUpdate({name: 'Segmentation cat'}, {$set : {'data.comment' : {
        fr : 'Catégorisation automatique', en : 'Automatic categorization'
    }}});
    await mongoose.connection.db.collection('agendaJobs').findOneAndUpdate({name: 'Send metrics'}, {$set : {'data.comment' : {
        fr : 'Envoie les statistiques de ce site vers Aquila', en : 'Send statistics from this site to Aquila'
    }}});
};

const migration_8_CmsBlocks = async () => {
    console.log('Applying migration script "migration_8_CmsBlocks"...');
    await mongoose.connection.collection('cmsblocks').updateMany({}, {$set: {active: true}});
};

const migration_9_adminRights = async () => {
    // Deprecated
};

const migration_10_clearSetAttributesIndexes = async () => {
    console.log('Applying migration script "migration_10_clearSetAttributesIndexes"...');
    await mongoose.connection.collection('setattributes').dropIndex('code_1');
    console.log('End migration script "migration_10_clearSetAttributesIndexes"...');
};

const migration_11_clearAttributesIndexes = async () => {
    console.log('Applying migration script "migration_11_clearAttributesIndexes"...');
    await mongoose.connection.collection('attributes').dropIndex('code_1');
    console.log('End migration script "migration_11_clearAttributesIndexes"...');
};

const searchSettingsKeys = [
    {
        name        : 'code',
        weight      : 20,
        translation : {
            fr : {
                label : 'Code'
            },
            en : {
                label : 'Code'
            }
        }
    },
    {
        name        : 'translation.{lang}.name',
        weight      : 10,
        translation : {
            fr : {
                label : 'Nom'
            },
            en : {
                label : 'Name'
            }
        }
    },
    {
        name        : 'translation.{lang}.description1.title',
        weight      : 3,
        translation : {
            fr : {
                label : 'Titre description 1'
            },
            en : {
                label : 'Title description 1'
            }
        }
    },
    {
        name        : 'translation.{lang}.description1.text',
        weight      : 2.5,
        translation : {
            fr : {
                label : 'Texte descripiton 1'
            },
            en : {
                label : 'Text descripiton 1'
            }
        }
    },
    {
        name        : 'translation.{lang}.description2.title',
        weight      : 2,
        translation : {
            fr : {
                label : 'Titre description 2'
            },
            en : {
                label : 'Title description 2'
            }
        }
    },
    {
        name        : 'translation.{lang}.description2.text',
        weight      : 1.5,
        translation : {
            fr : {
                label : 'Texte description 2'
            },
            en : {
                label : 'Text description 2'
            }
        }
    }
];

const migration_12_searchSettings = async () => {
    console.log('Applying migration script "migration_12_searchSettings"...');
    const config = await mongoose.connection.collection('configurations').findOne({});
    if (config && config.environment) {
        const searchSettings = {
            findAllMatches     : true,
            ignoreFieldNorm    : true,
            ignoreLocation     : true,
            includeScore       : true,
            keys               : searchSettingsKeys,
            minMatchCharLength : 2,
            shouldSort         : true,
            threshold          : 0.2,
            useExtendedSearch  : true
        };
        await mongoose.connection.collection('configurations').updateOne({}, {$set: {'environment.searchSettings': searchSettings}});
    }
};

const migration_13_searchSettings_translations = async () => {
    console.log('Applying migration script "migration_13_searchSettings_translations"...');
    // getb the old config
    const config = await mongoose.connection.collection('configurations').findOne({});
    if (config.environment.searchSettings.keys) {
        // loop on each key
        config.environment.searchSettings.keys.forEach((key) => {
            if (!key.translation && key.label) {
                // if the key name is one of the default keys, we use the associated translation, else we put EN- before the label for english translations
                const foundKey = searchSettingsKeys.find((k) => k.name === key.name);
                if (foundKey) {
                    key.translation = foundKey.translation;
                } else {
                    key.translation = {
                        fr : {
                            label : key.label
                        },
                        en : {
                            label : `EN-${key.label}`
                        }
                    };
                }
                // delete the old property
                delete key.label;
            }
        });
        // save the new config
        await mongoose.connection.collection('configurations').updateOne({}, {$set: {'environment.searchSettings': config.environment.searchSettings}});
    }
    console.log('End migration script "migration_13_searchSettings_translations"...');
};

const migration_14_jobsOnMainThread = async () => {
    console.log('Applying migration script "migration_14_jobsOnMainThread"...');
    const jobsToUpdate = [
        'Sitemap',
        'Segmentation cat',
        'Segmentation picto',
        'Canonicalisation',
        'Remove old carts',
        'Remove pending payment orders',
        'Cohérence produits',
        'Cohérence données',
        'Remove temp file',
        'Remove previews',
        'Delete orders\' failed payments',
        'RGPD bills',
        'RGPD users'
    ];

    await mongoose.connection.collection('agendaJobs').updateMany({}, {$set: {'data.onMainThread': true}});
    await mongoose.connection.collection('agendaJobs').updateMany({name: {$in: jobsToUpdate}}, {$set: {'data.onMainThread': false}});
    console.log('End migration script "migration_14_jobsOnMainThread"...');
};

const migration_15_addNewMailTypeJobCheck = async () => {
    console.log('Applying migration script "migration_15_addNewMailTypeJobCheck"...');

    const MailType = require('../orm/models/mail_type');

    const countMailType = await MailType.countDocuments();
    // Création du nouveau type de mail
    await MailType.updateOne({code: 'notifyAdminsJobs'}, {code        : 'notifyAdminsJobs',
        name        : 'Aquila - Job execution check',
        translation : {
            fr : {
                name      : 'Aquila - Notification de vérification des taches planifiées',
                variables : [
                    {
                        value       : 'jobsResult',
                        description : 'Resultat de la verification des taches planifiées'
                    }
                ]
            },
            en : {
                name      : 'Aquila - Job execution check',
                variables : [
                    {
                        value       : 'jobsResult',
                        description : 'Jobs checker result'
                    }
                ]
            }
        },
        position : countMailType}, {upsert: true});

    console.log('End migration script "migration_15_addNewMailTypeJobCheck"...');
};

// Scripts must be in order: put the new scripts at the bottom
const migrationScripts = [
    migration_1_ModulesNewPackageDependencies,
    migration_2_Metrics,
    migration_3_CreatedAt,
    migration_4_Themes,
    migration_5_isActive,
    migration_6_contentSecurityPolicy,
    migration_7_Job_Translations,
    migration_8_CmsBlocks,
    migration_9_adminRights,
    migration_10_clearSetAttributesIndexes,
    migration_11_clearAttributesIndexes,
    migration_12_searchSettings,
    migration_13_searchSettings_translations,
    migration_14_jobsOnMainThread,
    migration_15_addNewMailTypeJobCheck
    // sample
];

module.exports = {
    migrationScripts
};