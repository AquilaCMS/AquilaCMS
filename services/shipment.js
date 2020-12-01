const mongoose          = require('mongoose');
const moment            = require('moment');
const {Shipments, Cart} = require('../orm/models');
const QueryBuilder      = require('../utils/QueryBuilder');
const NSErrors          = require('../utils/errors/NSErrors');

const restrictedFields = [];
const defaultFields    = ['_id', 'code', 'url', 'url_logo', 'translation'];
const queryBuilder     = new QueryBuilder(Shipments, restrictedFields, defaultFields);

/**
 * @description retourne les shipment
 */
const getShipments = async (PostBody) => {
    return queryBuilder.find(PostBody);
};

const getShipment = async (PostBody) => {
    return queryBuilder.findOne(PostBody);
};

const getShipmentsFilter = async (cart, withCountry = null, PostBody) => {
    let totalWeight = 0;
    cart            = await Cart.findOne({_id: cart._id});
    if (cart.items) {
        for (const item of cart.items) {
            totalWeight += item.weight ? item.weight * item.quantity : 0;
        }
    }
    if (PostBody) {
        if (withCountry) {
            PostBody.filter = {...PostBody.filter, countries: {$elemMatch: {country: (withCountry.toUpperCase())}}};
        }
        PostBody.structure = {...PostBody.structure, countries: 1, preparation: 1, freePriceLimit: 1};
    } else {
        PostBody = {limit: 99, structure: {countries: 1, preparation: 1, freePriceLimit: 1}};
        if (withCountry) {
            PostBody.filter = {countries: {$elemMatch: {country: withCountry.toUpperCase()}}};
        }
    }
    if (withCountry) {
        const price = 0;

        const shipments = (await getShipments(PostBody)).datas;
        if (!shipments.length) return price;
        const choices = [];
        let i         = 0;
        for (const shipment of shipments) {
            const index = shipment.countries.findIndex((country) => {
                country = country.toObject();
                return (country.country).toLowerCase() === (withCountry).toLowerCase();
            });
            const shipObject = shipment.countries[index].toObject();
            const range      = shipObject.prices.find((_price) => totalWeight >= _price.weight_min && totalWeight <= _price.weight_max);
            if (range) {
                if (shipment.freePriceLimit && cart.priceTotal && cart.priceTotal.ati && (shipment.freePriceLimit <= cart.priceTotal.ati.toFixed(2))) {
                    choices.push({shipment, price});
                } else {
                    const priceR = range.price;
                    if (!priceR) choices.push({index: i, price: 0});
                    else choices.push({shipment, price: priceR});
                }
            }
            i++;
        }
        // on filtre les shipment pour retourner le plus interessant
        if (choices.length) {
            return choices.reduce( (prev, curr) => ((prev.price < curr.price) ? prev : curr));
        }
        return [];
    }
    let shipments = [];
    if (cart.addresses && cart.addresses.delivery && cart.addresses.delivery.isoCountryCode) {
        PostBody.filter = {...PostBody.filter, $or: [{active: true}, {active: {$exists: false}}], countries: {$elemMatch: {country: new RegExp(cart.addresses.delivery.isoCountryCode, 'ig')}}};
        shipments       = (await getShipments(PostBody)).datas;
    }
    const returnShipments = [];
    const arrayPrices     = {};
    for (const shipment of shipments) {
        let selectedCountry = shipment.countries.find((country) => {
            country = country.toObject();
            return (country.country).toLowerCase() === (cart.addresses.delivery.isoCountryCode).toLowerCase();
        });
        selectedCountry = selectedCountry.toObject();
        if (selectedCountry) {
            const range = selectedCountry.prices.find((price) => totalWeight >= price.weight_min && totalWeight <= price.weight_max);
            if (range) {
                const oShipment = shipment.toObject();
                if (shipment.freePriceLimit && shipment.freePriceLimit <= cart.priceTotal.ati.toFixed(2)) {
                    arrayPrices[shipment.code] = 0;
                    oShipment.price            = 0;
                } else {
                    const price = range.price;
                    if (!price) {
                        arrayPrices[shipment.code] = 0;
                        oShipment.price            = 0;
                    } else {
                        arrayPrices[shipment.code] = price;
                        oShipment.price            = price;
                    }
                }
                oShipment.dateDelivery = getShippingDate(cart, oShipment);
                delete oShipment.countries;
                delete oShipment.preparation;
                returnShipments.push(oShipment);
            }
        }
    }
    return {datas: returnShipments, arrayPrices};
};

function getShippingDate(cart, shipment) {
    let maxSupplyDate = null;
    if (cart.items) {
        // on boucle sur les produits du cart (i)
        for (let i = 0; i < cart.items.length; i++) {
            const item = cart.items[i];
            if (item.id.stock && item.id.stock.status === 'dif' && (maxSupplyDate === null || (new Date(item.id.stock.date_supply)).getTime() > (maxSupplyDate).getTime())) {
                maxSupplyDate = item.id.stock.date_supply;
            }
            if (item.type === 'bundle') {
                // on boucle sur les sections du bundle (j)
                for (let j = 0; j < item.selections.length; j++) {
                    const selection = item.selections[j];
                    // on boucle sur la liste de produits selectionnés (k)
                    for (let k = 0; k < selection.products.length; k++) {
                        const product = selection.products[k];
                        if (product.stock && product.stock.status === 'dif' && (maxSupplyDate === null || (new Date(product.stock.date_supply)).getTime() > (maxSupplyDate).getTime())) {
                            maxSupplyDate = product.stock.date_supply;
                        }
                    }
                }
            }
        }
    }
    const sPrep = shipment.preparation;
    if (maxSupplyDate === null) maxSupplyDate = new Date();
    const countryFound = shipment.countries.find((country) => cart.addresses.delivery.isoCountryCode === country.country);
    let dateSupply     = moment(maxSupplyDate).add(Number(sPrep.delay), sPrep.unit);
    if (countryFound) {
        dateSupply = moment(dateSupply).add(Number(countryFound.delay), countryFound.unit);
    }
    if (new Date(dateSupply._d).getDay() === 0) {
        dateSupply = moment(dateSupply).add(1, 'days');
    }
    return dateSupply;
    /*
    const finalDelay = moment.duration(dateSupply.diff(moment(new Date())));
    if (finalDelay._data.months > 0 || finalDelay._data.days > 0) {
        return {delay: Math.floor(finalDelay._milliseconds / 3600000 / 24), unit: "day"};
    }
    return {delay: Math.ceil(finalDelay._millieconds / 3600000), unit: "hour"}; */
}

/**
 * @description Retourne le shipment venant d'étre ajouté ou modifié
 * @param body : body de la requête, il permettra de mettre à jour le shipment ou de le créer
 * @param _id : string : ObjectId du shipment, si null alors on est en mode création
 */
const setShipment = async (_id = null, body) => {
    let result;
    if (_id) {
        // Update
        if (!mongoose.Types.ObjectId.isValid(_id)) throw NSErrors.InvalidObjectIdError;
        result = await Shipments.findOneAndUpdate({_id}, body, {new: true, runValidators: true});
        if (!result) throw NSErrors.ShipmentUpdateError;
    } else {
        // Create
        result = await Shipments.create(body);
    }
    return result;
};

/**
 * Retourne le shipment venant d'étre supprimé en fonction de son _id
 */
const deleteShipment = async (_id) => {
    if (!mongoose.Types.ObjectId.isValid(_id)) throw NSErrors.InvalidObjectIdError;
    const doc = await Shipments.findOneAndRemove({_id});
    if (!doc) throw NSErrors.ShipmentNotFound;
    return doc;
};

/**
 * Fonction pour récupérer des shipments en fonction du pays et du poids d'une commande
 * @deprecated
 */
const getEstimatedFee = async (cartId, shipmentId, countryCode) => {
    let cartTotalWeight = 0;
    let catTotalPrice   = 0;
    if (!cartId) throw new Error('No cart id');
    const cart = await Cart.findOne({_id: cartId});
    if (!cart.items || cart.items.length === 0) return {shipment: {}, price: {et: 0, ati: 0}};
    if (cart.items) {
        for (const item of cart.items) {
            cartTotalWeight += item.weight ? item.weight * item.quantity : 0;
            catTotalPrice   += item.price.special && item.price.special.ati ? item.price.special.ati * item.quantity : item.price.unit.ati * item.quantity;
        }
    }
    let shipments = [];
    if (shipmentId) {
        shipments.push(await Shipments.findOne({_id: shipmentId}));
    } else {
        shipments = await Shipments.find({active: true, countries: {$elemMatch: {country: countryCode.toUpperCase()}}});
    }
    let ship  = null;
    let price = 0;
    for (let i = 0; i < shipments.length; i++) {
        const shipment = shipments[i];
        if (shipment.freePriceLimit !== null && shipment.freePriceLimit < catTotalPrice) return {shipment, price: {ati: 0, et: 0}};
        const shipmentCountry = shipment.countries.find((country) => (country.country).toUpperCase() === countryCode.toUpperCase());
        if (shipmentCountry) {
            for (let j = 0; j < shipmentCountry.prices.length; j++) {
                const priceAndWeight = shipmentCountry.prices[j];
                if ((priceAndWeight.weight_min <= cartTotalWeight) && (cartTotalWeight <= priceAndWeight.weight_max) && (priceAndWeight.price < price || price === 0)) {
                    price = priceAndWeight.price;
                    ship  = shipment;
                }
            }
        }
    }
    if (ship) {
        return {shipment: ship, price: {ati: price, et: price / (1 + (ship.vat_rate / 100))}};
    }
    return {shipment: null, price: {ati: 0, et: 0}};
};

module.exports = {
    getShipments,
    getShipment,
    getShipmentsFilter,
    getEstimatedFee,
    setShipment,
    deleteShipment
};