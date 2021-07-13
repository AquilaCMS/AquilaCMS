import React from 'react';
import axios from 'axios';
import Head from 'next/head';
import nsModules from 'modules/list_modules';
import { Link } from '../routes';
import getAPIUrl from './getAPIUrl';

/**
 * Si le produit est dans la categorie printer alors on va compter le nombre de printer dans le panier
 * @param {*} category category du produit qui vient d'être ajouté
 * @returns {number} nombre d'item dans le cart appartenant a la même categorie que le produit voulant être ajouté
 */
async function countProductInCartByCategory(category) {
    try {
        let totalQuantity = 0;
        const cartId = window.localStorage.getItem('cart_id');
        if (!cartId) return totalQuantity;
        const resCart = await axios.post(`${getAPIUrl()}v2/cart/${cartId}`);
        const { data: cart } = resCart;
        if (cart.items && cart.items.length) {
            cart.items.forEach((itemPrd) => {
                // On cherche les items du cart qui son dans la categorie du produit venant d'être ajouté
                const itemFound = category.productsList.find((prd) => itemPrd.id.toString() === prd.id.toString());
                if (itemFound) totalQuantity += itemPrd.quantity;
            });
        }
        return totalQuantity;
    } catch (error) {
        console.error(error);
    }
}

/**
 * Si le produit est dans la categorie printer alors on va compter le nombre de printer dans le panier
 * @param {*} category category du produit qui vient d'être ajouté
 * @returns {number} nombre d'item dans le cart appartenant a la même categorie que le produit voulant être ajouté
 */
async function countProductInCartByProduct(product) {
    try {
        let totalQuantity = 0;
        const cartId = window.localStorage.getItem('cart_id');
        if (!cartId) return totalQuantity;
        const resCart = await axios.post(`${getAPIUrl()}v2/cart/${cartId}`, { PostBody: { populate: ['items.id'] } });
        const { data: cart } = resCart;
        if (cart.items && cart.items.length) {
            cart.items.forEach((itemPrd) => {
                if (itemPrd.id.universe === product.universe) totalQuantity += itemPrd.quantity;
            });
        }
        return totalQuantity;
    } catch (error) {
        console.error(error);
    }
}

/**
 * Liste les modules en fonction du type
 * @param {*} type
 * @returns {React.Component}
 */
function listModulePage(type, props = {}) {
    return nsModules.filter((m) => m.type === type).map((m, index) => {
        const Comp = m.jsx.default;
        return React.createElement(Comp, { key: index + m.code, gNext: { Head, Link }, ...props });
    });
}

/**
 * Liste les modules et recupere les finction de hook en fonction du type
 * @param {*} type
 * @returns {React.Component}
 */
async function getModulesHookFunctionsByType(type = 'all') {
    let modulesFileTheme = nsModules.map((m) => m.jsx);
    if (type !== 'all') modulesFileTheme = nsModules ? nsModules.filter((m) => m.type === type).map((m) => m.jsx) : [];
    const hooksFunctions = {};
    for (const moduleFileTheme of modulesFileTheme) {
        const nsModuleKeys = Object.keys(moduleFileTheme).filter((key) => key !== 'default');
        for (const nsModuleKey of nsModuleKeys) {
            if (hooksFunctions[nsModuleKey] === undefined) hooksFunctions[nsModuleKey] = [];
            hooksFunctions[nsModuleKey].push(async () => await moduleFileTheme[nsModuleKey]());
        }
    }
    return hooksFunctions;
}

/**
 * Return the currency symbol
 * @returns {string}
 */
function getCurrencySymbol() {
    return "€";
}

/**
 * Return the currency symbol
 * @param {*} product
 * @param {*} options = options selected by the user
 * @returns {Float} total modifier
 */
function caculateNewPrice(product, options) {
    let optionsModifier = 0;
    if (product && product.type === "simple") {
        if (options && product && product.options) {
            for (const oneOptions of options) {
                for (const oneValue of oneOptions.values) {
                    const valueTemp1 = product.options.find(element => element._id === oneOptions._id);
                    const valueTemp = valueTemp1.values.find(element => element._id === oneValue._id);
                    if (typeof valueTemp !== "undefined" && typeof valueTemp.modifier !== "undefined" && typeof valueTemp.modifier.price !== "undefined") {
                        if (valueTemp.modifier.price.typePrice == "price") {
                            optionsModifier += valueTemp.modifier.price.value;
                        } else {
                            // need to calculate the percent
                        }
                    }
                }
            }
        }
    }
    return optionsModifier;
}

export {
    countProductInCartByCategory,
    countProductInCartByProduct,
    listModulePage,
    getModulesHookFunctionsByType,
    getCurrencySymbol,
    caculateNewPrice
};
