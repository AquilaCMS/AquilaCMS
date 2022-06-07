/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2022 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const NSErrors = require('../utils/errors/NSErrors');

/**
 * get component
 * @param {string} componentName always starts with "ns-"
 * @param {string} code
 * @param {string} params (from payload) for some extra params
 * @param {string} [authorization]
 */
const getComponent = async (componentName, code, user = null, params = {}) => {
    if (code === null) throw NSErrors.ComponentCodeNotFound;
    // The component must start with ns- otherwise this component is not valid
    if (!componentName.startsWith('ns-')) throw NSErrors.ComponentNotAllowed;
    // Transform ns-xxxxx to xxxxx : we can easily recover its model and its service
    componentName = componentName.replace('ns-', '');

    let models;
    let PostBody;
    switch (componentName) {
    case 'megamenu':
    case 'menu':
        models                  = require('../orm/models/categories');// categories/roots
        const categorieServices = require('./categories');// categories/roots
        const categorie         = await categorieServices.getCategoryTreeForMenu(code, user, params?.levels);
        return categorie;
    case 'cms':
        models                 = require('../orm/models/cmsBlocks');
        const cmsBlockServices = require('./cmsBlocks');
        PostBody               = {filter: {code, active: true}, structure: {content: 1, translation: 1}};
        const result           = await cmsBlockServices.getCMSBlock(PostBody);
        if ((!user || !user.isAdmin) && result && result.translation) {
            // Loop on the languages contained
            for (let k = 0; k < Object.keys(result.translation).length; k++) {
                const langKey = Object.keys(result.translation)[k];
                delete result.translation[langKey].variables;
                delete result.translation[langKey].html;
            }
        }
        return result;
    case 'gallery':
        models               = require(`../orm/models/${componentName}`);
        const ServiceGallery = require(`./${componentName}`);
        return ServiceGallery.getItemsGallery(code);
    case 'agenda':
        models              = require(`../orm/models/${componentName}`);
        const ServiceAgenda = require(`./${componentName}`);
        return ServiceAgenda.getAgendaByCode(code);
    default:
        /**
         * We will look for the component by the "code"
         * Create a queryBuilder : Don't need to be recreate it on the client side each time
         */
        PostBody = {filter: {code}};
        // Get the models according to the componentName
        models = require(`../orm/models/${componentName}`);
        if (!models) throw NSErrors.ComponentInvalidModel;
        // Get the service according to the componentName
        const genericServices = require(`./${componentName}`);
        // Example: slider will become Slider in order to call the getSlider function
        const funcName = componentName.charAt(0).toUpperCase() + componentName.slice(1);
        return genericServices[`get${funcName}`](PostBody);
    }
};

module.exports = {
    getComponent
};