/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2022 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const {AdminInformation, Categories} = require('../orm/models');
const servicesLanguages              = require('./languages');
const utils                          = require('../utils/utils');

/**
 * @description Insert adminInformation
 */
const insertAdminInformation = async (dataInformation) => {
    const result = await AdminInformation.findOne({code: dataInformation.code});
    if (!result) {
        dataInformation.date    = new Date();
        dataInformation.deleted = false;
        const _admininformation = new AdminInformation(dataInformation);
        await _admininformation.save();
    }
};

/**
 * @description Get all adminInformation
 */
/* eslint-disable-next-line arrow-body-style */
const getAdminInformation = async () => {
    return AdminInformation.find({deleted: false}).sort({date: -1}).lean();
};

/**
 * @description Delete adminInformation
 */
const deleteAdminInformation = async (code) => {
    await AdminInformation.updateOne({code}, {$set: {deleted: true}});
};

/**
 * @description Remove adminInformation from DB
 */
const removeAdminInformation = async (code) => {
    await AdminInformation.deleteOne({code});
};

/**
 * @description Create welcome message
 */
const welcome = async () => {
    try {
        await insertAdminInformation({
            code        : 'welcome_to_aquila',
            type        : 'info',
            translation : {
                en : {
                    title : 'Aquila',
                    text  : 'Welcome on Aquila. You will find necessary informations of Aquila here. For more informations on how this admin works, you can read the documentation on <a href="https://www.aquila-cms.com/resources-documentation">aquila-cms.com</ a>.'
                },
                fr : {
                    title : 'Aquila',
                    text  : 'Bienvenue sur Aquila. Vous trouverez ici les informations nécessaires au bon fonctionnement d\'Aquila. Pour plus d\'informations sur le fonctionnement de cette partie d\'administration, vous pouvez consulter la documentation sur le site d\'<a href="https://www.aquila-cms.com/fr/ressources-documentation">aquila-cms.com</a>.'
                }
            }
        });
    } catch (e) { console.error(e); }
};

/**
 * Consistency check (everything except product) | TODO: to fix
 * @returns {object}  Information on inconsistencies
 */
const controlAllDatas = async () => {
    try {
        const languages           = await servicesLanguages.getLanguages({filter: {status: 'visible'}, limit: 100});
        const tabLang             = languages.datas.map((_lang) => _lang.code);
        let returnErrors          = '';
        let returnWarning         = '';
        let fixChildrenDuplicated = false;

        // Categories
        const categories = await Categories.find({}).lean();
        for (const category of categories) {
            // Code control
            if (typeof category.code === 'undefined' || category.code === '') {
                returnErrors += `<b>Category ${category._id}</b> : Code undefined<br/>`;
                continue;
            }

            // Language control
            for (let iLang = 0; iLang < tabLang.length; iLang++) {
                const currentLang = tabLang[iLang];

                // Translation control
                if (typeof category.translation === 'undefined' || typeof category.translation[currentLang] === 'undefined') {
                    returnErrors += `<b>Category ${category.code}</b> : Language (${currentLang}) undefined<br/>`;
                    continue;
                }

                // Name control
                if (typeof category.translation[currentLang].name === 'undefined' || category.translation[currentLang].name === '') {
                    returnErrors += `<b>Category ${category.code}</b> : Name undefined (${currentLang})<br/>`;
                }

                // Slug control
                if (category.action === 'catalog') {
                    if (typeof category.translation[currentLang].slug === 'undefined' || category.translation[currentLang].slug === '') {
                        returnErrors += `<b>Category ${category.code}</b> : Slug undefined (${currentLang})<br/>`;
                    }
                } else if (category.action === 'page') {
                    if (typeof category.translation[currentLang].pageSlug === 'undefined' || category.translation[currentLang].pageSlug === '') {
                        returnErrors += `<b>Category ${category.code}</b> : Page not selected (${currentLang})<br/>`;
                    }
                } else if (category.action === 'url') {
                    if (typeof category.translation[currentLang].url === 'undefined' || category.translation[currentLang].url === '') {
                        returnErrors += `<b>Category ${category.code}</b> : empty URL (${currentLang})<br/>`;
                    }
                }
            }

            // Detect duplicated
            if (utils.detectDuplicateInArray(category.children) && !fixChildrenDuplicated) {
                fixChildrenDuplicated = true;
                returnWarning        += `<b>Category ${category.code}</b> contain duplicated children<br/>`;
            }

            // Verify children (exists and valid)
            for (const child of category.children) {
                // Does this child really exist?
                const logs    = await existAndValid(child, category, returnErrors, returnWarning, 'child');
                returnErrors  = logs.returnErrors;
                returnWarning = logs.returnWarning;
            }

            // Verify ancestors (exists and valid)
            await fixCatAncestors(category);
            for (const ancestor of category.ancestors) {
                // Does this ancestor really exist?
                const logs    = await existAndValid(ancestor, category, returnErrors, returnWarning, 'ancestor');
                returnErrors  = logs.returnErrors;
                returnWarning = logs.returnWarning;
            }
        }

        // Summary display
        if (returnErrors.length !== 0) returnErrors = `<br/>Errors :<br/>${returnErrors}`;
        if (returnWarning.length !== 0) returnWarning = `<br/>Warning :<br/>${returnWarning}`;
        if (returnErrors.length === 0 && returnWarning.length === 0) returnErrors = 'All datas are fine';

        // // AutoFix :
        // if (fixChildrenDuplicated) {
        //     require('./fix_auto').fixCategoriesDuplicatedChild();
        // }

        return returnErrors + returnWarning;
    } catch (error) {
        if (error.message) {return error.message;}
        return error;
    }
};

const fixCatAncestors = async (currentCategory) => {
    // We need only one ancestor
    if (currentCategory.ancestors.length > 1) {
        const realAncestor = await Categories.findOne({_id: {$in: currentCategory.ancestors}, children: currentCategory._id}).lean();
        if (realAncestor) {
            await Categories.updateOne({_id: currentCategory._id}, {$set: {ancestors: [realAncestor]}});
        }
    }
};

const existAndValid = async (element, currentCategory, returnErrors, returnWarning, type) => {
    const thisChild = await Categories.findOne({_id: element}).lean();
    if (!thisChild) {
        returnErrors += `<b>Category ${currentCategory.code}</b> : No ${type} '${element}' existing<br/>`;
    } else {
        // The child exists, see if the parent is well written there
        let isValid = false;
        if (type === 'child') {
            for (let i = 0; i <= thisChild.ancestors.length; i++) {
                if (thisChild.ancestors[i] && thisChild.ancestors[i].toString() === currentCategory._id.toString()) {
                    isValid = true;
                }
            }
        } else {
            for (let i = 0; i <= thisChild.children.length; i++) {
                if (thisChild.children[i] && thisChild.children[i].toString() === currentCategory._id.toString()) {
                    isValid = true;
                }
            }
        }
        if (!isValid) {
            returnWarning += `<b>Category ${currentCategory.code}</b> : The ${type} <i>${element}</i> doesn't contain the reference to his ${type === 'ancestor' ? 'child' : 'ancestor'} <i>${currentCategory._id}</i><br/>`;
        }
    }
    return {returnErrors, returnWarning};
};

module.exports = {
    insertAdminInformation,
    getAdminInformation,
    deleteAdminInformation,
    welcome,
    controlAllDatas,
    removeAdminInformation
};
