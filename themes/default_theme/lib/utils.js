import React from 'react';
import axios from 'axios';
import nsModules from 'modules/list_modules';
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
function listModulePage(type) {
    return nsModules.filter((m) => m.type === type).map((m, index) => {
        const Comp = m.jsx;
        return (
            <Comp key={index + m.code} />
        );
    });
}

export {
    countProductInCartByCategory, countProductInCartByProduct, listModulePage
};
