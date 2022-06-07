/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2022 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const crypto                     = require('crypto');
const moment                     = require('moment');
const {aquilaEvents}             = require('aql-utils');
const {Bills, Orders, CmsBlocks} = require('../orm/models');
const QueryBuilder               = require('../utils/QueryBuilder');
const NSErrors                   = require('../utils/errors/NSErrors');
const {useWkHTMLtoPDF}           = require('../utils/generatePDF');
const utilsModules               = require('../utils/modules');
const ServiceOrder               = require('./orders');
const {generateHTML}             = require('./mail');
const queryBuilder               = new QueryBuilder(Bills, [], []);

const getBills = async (body) => {
    if (!body.sort) { // Default sort
        body.sort = {createdAt: -1};
    }
    return queryBuilder.find(body);
};

const orderToBill = async (idOrder, isAvoir = false) => {
    const vanillaOrderToBill = async (idOrder, isAvoir) => {
        if (!isAvoir && (await Bills.findOne({order_id: idOrder, avoir: false}))) {
            throw NSErrors.InvoiceAlreadyExists;
        }
        const order = await Orders.findOne({_id: idOrder});
        if (order) {
            const data = {
                order_id    : idOrder,
                montant     : order.priceTotal.paidTax ? order.priceTotal.ati : order.priceTotal.et,
                withTaxes   : order.priceTotal.paidTax,
                client      : order.customer.id,
                nom         : order.addresses.billing.lastname,
                prenom      : order.addresses.billing.firstname,
                societe     : order.addresses.billing.companyName,
                coordonnees : `${order.addresses.billing.line1 + (order.addresses.billing.line2 ? ` ${order.addresses.billing.line2}` : '')}, ${order.addresses.billing.zipcode} ${order.addresses.billing.city + (order.addresses.billing.country ? `, ${order.addresses.billing.country}` : '')}`,
                email       : order.customer.email,
                paymentDate : order.payment[0].status === 'DONE' ? order.payment[0].operationDate : '',
                isPaid      : order.payment[0].status === 'DONE',
                lang        : order.lang,
                items       : order.items,
                address     : {
                    firstname      : order.addresses.billing.firstname,
                    lastname       : order.addresses.billing.lastname,
                    companyName    : order.addresses.billing.companyName,
                    phone          : order.addresses.billing.phone,
                    phone_mobile   : order.addresses.billing.phone_mobile,
                    line1          : order.addresses.billing.line1,
                    line2          : order.addresses.billing.line2,
                    zipcode        : order.addresses.billing.zipcode,
                    city           : order.addresses.billing.city,
                    isoCountryCode : order.addresses.billing.isoCountryCode,
                    country        : order.addresses.billing.country
                },
                delivery : {
                    price : {
                        ati : order.delivery.price.ati,
                        et  : order.delivery.price.et,
                        vat : order.delivery.price.vat
                    },
                    code : order.delivery.code,
                    name : order.delivery.name
                },
                promos : {
                    promoId     : order.promos[0] ? order.promos[0].promoId : null,
                    promoCodeId : order.promos[0] ? order.promos[0].promoCodeId : null,
                    discountATI : order.promos[0] ? order.promos[0].discountATI : null,
                    discountET  : order.promos[0] ? order.promos[0].discountET : null,
                    name        : order.promos[0] ? order.promos[0].name : null,
                    description : order.promos[0] ? order.promos[0].description : null,
                    code        : order.promos[0] ? order.promos[0].code : null,
                    productsId  : order.promos[0] ? order.promos[0].productsId : null
                },
                taxes           : {},
                checksum        : undefined,
                additionnalFees : order.additionnalFees,
                priceSubTotal   : order.priceSubTotal,
                avoir           : isAvoir,
                facture         : 'unset'
            };
            for (let i = 0; i < order.items.length; i++) {
                const item = order.items[i].toObject();
                if (item.price.vat && item.price.vat.rate) {
                    const vatRate = item.price.vat.rate.toString().replace('.', ',');
                    if (!data.taxes[vatRate]) {
                        data.taxes[vatRate] = 0;
                    }
                    if (item.price.special) {
                        data.taxes[vatRate] += (item.price.special.ati - item.price.special.et) * item.quantity;
                    } else {
                        data.taxes[vatRate] += (item.price.unit.ati - item.price.unit.et) * item.quantity;
                    }
                }
            }
            Object.keys(data.taxes).forEach(function (key) {
                data.taxes[key] = data.taxes[key].aqlRound(2);
            });
            const bill = await Bills.create(data);
            // set order status to BILLED
            await Orders.updateOne({_id: idOrder}, {$push: {bills: {billId: bill._id.toString()}}});
            await ServiceOrder.setStatus(order._id, 'BILLED');
            return bill;
        }
        return null;
    };

    await utilsModules.modulesLoadFunctions('orderToBill', {idOrder, isAvoir}, async () => {
        await vanillaOrderToBill(idOrder, isAvoir);
    });
};

const generatePDF = async (PostBody, codeCmsBlocks = 'invoice') => {
    let bill = await queryBuilder.findOne(PostBody);
    if (!bill) {
        throw NSErrors.AccessUnauthorized;
    }
    bill              = bill.toObject();
    const lang        = bill.lang || global.defaultLang;
    const oldChecksum = bill.checksum;
    delete bill.checksum;
    const obj      = cleanBillObject(bill);
    const checksum = crypto.createHash('md5').update(obj, 'utf8').digest('hex');
    if (oldChecksum !== checksum) {
        throw NSErrors.ChecksumInvoiceError;
    }
    const order = await Orders.findById(bill.order_id);
    moment.locale(lang);
    const html = await CmsBlocks.findOne({code: codeCmsBlocks});
    if (!html) {
        throw NSErrors.CmsBlockNotFound;
    }
    const withNoTaxes = lang === 'fr' ? 'HT' : 'ET';
    const withTaxes   = lang === 'fr' ? 'TTC' : 'ATI';
    const unpaid      = lang === 'fr' ? 'Non payé' : 'Unpaid';
    const paid        = lang === 'fr' ? 'Payé' : 'Paid';
    const currency    = ' &euro;';
    const datas       = {
        '{{number}}'                 : bill.facture,
        '{{totalAmount}}'            : `${parseFloat(bill.montant).aqlRound(2)}${currency}`,
        '{{withTaxes}}'              : bill.withTaxes ? withTaxes : withNoTaxes,
        '{{email}}'                  : bill.email,
        '{{paymentDate}}'            : bill.paymentDate ? moment(bill.paymentDate).format('DD/MM/YYYY - HH:mm') : '',
        '{{createdAt}}'              : moment(bill.createdAt).format('DD/MM/YYYY - HH:mm'),
        '{{orderDate}}'              : moment(order.createdAt).format('DD/MM/YYYY - HH:mm'),
        '{{orderComment}}'           : order.comment || '',
        '{{isPaid}}'                 : bill.isPaid ? paid : unpaid,
        '{{firstname}}'              : bill.address.firstname,
        '{{lastname}}'               : bill.address.lastname,
        '{{company}}'                : bill.address.companyName,
        '{{phone}}'                  : bill.address.phone ? bill.address.phone : '',
        '{{phone_mobile}}'           : bill.address.phone_mobile ? bill.address.phone_mobile : '',
        '{{address.line1}}'          : bill.address.line1,
        '{{address.line2}}'          : bill.address.line2 ? bill.address.line2 : '',
        '{{address.zipcode}}'        : bill.address.zipcode,
        '{{address.city}}'           : bill.address.city,
        '{{address.isoCountryCode}}' : bill.address.isoCountryCode,
        '{{address.country}}'        : bill.address.country,
        '{{deliveryPriceAti}}'       : bill.delivery && bill.delivery.price ? `${bill.delivery.price.ati.aqlRound(2)}${currency}` : '',
        '{{deliveryPriceEt}}'        : bill.delivery && bill.delivery.price ? `${bill.delivery.price.et.aqlRound(2)}${currency}` : '',
        '{{deliveryPriceVat}}'       : bill.delivery && bill.delivery.price && bill.delivery.price.vat ? bill.delivery.price.vat.aqlRound(2) : '',
        '{{deliveryCode}}'           : bill.delivery ? bill.delivery.code : '',
        '{{deliveryName}}'           : bill.delivery ? bill.delivery.name : '',
        '{{promoPriceAti}}'          : bill.promos && bill.promos.discountATI ? `${bill.promos.discountATI.aqlRound(2)}${currency}` : '',
        '{{promoPriceEt}}'           : bill.promos && bill.promos.discountET ? bill.promos.discountET.aqlRound(2) : '',
        '{{promoVisible}}'           : bill.promos && (bill.promos.discountATI || bill.promos.discountET) ? 'visible' : 'hidden',
        '{{promoName}}'              : bill.promos && bill.promos.name ? bill.promos.name : '',
        '{{promoDescription}}'       : bill.promos && bill.promos.description ? bill.promos.description : '',
        '{{promoCode}}'              : bill.promos && bill.promos.code ? bill.promos.code : '',
        '{{additionnalFeesAti}}'     : bill.additionnalFees && bill.additionnalFees.ati ? bill.additionnalFees.ati.aqlRound(2) : '',
        '{{additionnalFeesEt}}'      : bill.additionnalFees && bill.additionnalFees.et ? bill.additionnalFees.et.aqlRound(2) : '',
        '{{additionnalFeesTax}}'     : bill.additionnalFees && bill.additionnalFees.tax ? `${bill.additionnalFees.tax.aqlRound(2)}${currency}` : '',
        '{{priceSubTotalAti}}'       : bill.priceSubTotal && bill.priceSubTotal.ati ? `${bill.priceSubTotal.ati.aqlRound(2)}${currency}` : '',
        '{{priceSubTotalEt}}'        : bill.priceSubTotal && bill.priceSubTotal.et ? `${bill.priceSubTotal.et.aqlRound(2)}${currency}` : '',
        '{{totalTaxes}}'             : '',
        '{{totalByTaxRate}}'         : ''
    };

    if (bill.taxes) {
        const totalTaxes        = bill.taxes ? Object.values(bill.taxes).reduce((val, acc) => val + acc) : 0;
        datas['{{totalTaxes}}'] = totalTaxes ? parseFloat(totalTaxes).aqlRound(2) + currency : '';

        let taxString = '';
        Object.keys(bill.taxes).forEach(function (key) {
            taxString += `${key}% : ${bill.taxes[key]} &euro;<br/>`;
        });
        datas['{{totalByTaxRate}}'] = taxString;
    }

    if (!html) {
        throw NSErrors.InvoiceNotFound;
    }
    const dataToReplace = {
        datas
    };
    await aquilaEvents.emit('generatePDF_overrideData', dataToReplace);
    const newData        = dataToReplace.datas || {};
    const htmlToGenerate = html.translation[bill.lang].html ? html.translation[bill.lang].html : html.translation[bill.lang].content;
    let content          = generateHTML( htmlToGenerate, newData);
    let items            = '';
    // eslint-disable-next-line no-useless-escape
    const itemTemplate = content.match(new RegExp(/\<\!\-\-startitems\-\-\>(.|\n)*?\<\!\-\-enditems\-\-\>/, 'g'));
    if (itemTemplate && itemTemplate[0]) {
        const htmlItem = itemTemplate[0].replace('<!--startitems-->', '').replace('<!--enditems-->', '');
        for (let i = 0; i < bill.items.length; i++) {
            const priceData        = {et: {}, ati: {}};
            priceData.ati.unitInit = bill.items[i].price.unit.ati ? bill.items[i].price.unit.ati.aqlRound(2) : ''; // Old price;
            priceData.ati.unit     = bill.items[i].price.special ? bill.items[i].price.special.ati.aqlRound(2) : priceData.ati.unitInit; // New price;
            priceData.ati.total    = (priceData.ati.unit * bill.items[i].quantity).aqlRound(2);// Total (new) price
            if (priceData.ati.unitInit === priceData.ati.unit) {
                priceData.ati.unitInit = '';
            }
            priceData.et.unitInit = bill.items[i].price.unit.et ? bill.items[i].price.unit.et.aqlRound(2) : ''; // Old price;
            priceData.et.unit     = bill.items[i].price.special ? bill.items[i].price.special.et.aqlRound(2) : priceData.et.unitInit; // New price;
            priceData.et.total    = (priceData.et.unit * bill.items[i].quantity).aqlRound(2);// Total (new) price
            if (priceData.et.unitInit === priceData.et.unit) {
                priceData.et.unitInit = '';
            }

            const prdData = {
                '{{product.name}}'          : bill.items[i].name,
                '{{product.code}}'          : bill.items[i].code,
                '{{product.vatRate}}'       : bill.items[i].price.vat && bill.items[i].price.vat.rate ? bill.items[i].price.vat.rate : '',
                '{{product.quantity}}'      : bill.items[i].quantity,
                '{{product.basePriceATI}}'  : priceData.ati.unitInit ? priceData.ati.unitInit + currency : '',
                '{{product.basePriceET}}'   : priceData.et.unitInit  ? priceData.et.unitInit + currency : '',
                '{{product.priceAti}}'      : priceData.ati.unit     ? priceData.ati.unit + currency : '',
                '{{product.priceEt}}'       : priceData.et.unit      ? priceData.et.unit + currency : '',
                '{{product.totalPriceATI}}' : priceData.ati.total    ? priceData.ati.total + currency : '',
                '{{product.totalPriceET}}'  : priceData.et.total     ? priceData.et.total + currency : ''

            };
            if (bill.promos.productsId) {
                const index = bill.promos.productsId.findIndex((p) => p.productId.toString() === bill.items[i]._id);
                if (index > -1) {
                    prdData['{{product.discountATI}}']  = bill.promos.productsId[index].discountATI.aqlRound(2);
                    prdData['{{product.discountET}}']   = bill.promos.productsId[index].discountET.aqlRound(2);
                    prdData['{{product.basePriceET}}']  = bill.promos.productsId[index].basePriceET.aqlRound(2);
                    prdData['{{product.basePriceATI}}'] = bill.promos.productsId[index].basePriceATI.aqlRound(2);
                }
            }
            items += generateHTML(htmlItem, prdData);
        }
        content = content.replace(htmlItem, items);
    }
    const PDFstream =  await useWkHTMLtoPDF(content, {
        encoding : 'utf8'
    }, false); // true is default (so it's optionnal)
    return PDFstream;
};

function cleanBillObject(bill) {
    const items = [];
    if (bill.items) {
        for (let i = 0; i < bill.items.length; i++) {
            const keys = Object.keys(bill.items[i]).sort();
            const z    = {};
            for (let j = 0; j < keys.length; j++) {
                z[keys[j]] = bill.items[i][keys[j]];
            }
            items.push(z);
        }
    }
    const productsId = [];
    if (bill.promos && bill.promos[0]) {
        for (let i = 0; i < bill.promos[0].productsId.length; i++) {
            const keys = Object.keys(bill.promos[0].productsId[i]).sort();
            const z    = {};
            for (let j = 0; j < keys.length; j++) {
                z[keys[j]] = bill.promos[0].productsId[i][keys[j]];
            }
            productsId.push(z);
        }
    }
    return JSON.stringify({
        id          : bill.id,
        order_id    : bill.order_id,
        facture     : bill.facture,
        montant     : bill.montant,
        withTaxes   : bill.withTaxes,
        client      : bill.client,
        nom         : bill.nom,
        prenom      : bill.prenom,
        societe     : bill.societe,
        coordonnees : bill.coordonnees,
        email       : bill.email,
        paymentDate : bill.paymentDate,
        isPaid      : bill.isPaid,
        lang        : bill.lang,
        items,
        address     : bill.address ? {
            firstname      : bill.address.firstname,
            lastname       : bill.address.lastname,
            companyName    : bill.address.companyName,
            phone          : bill.address.phone,
            phone_mobile   : bill.address.phone_mobile,
            line1          : bill.address.line1,
            line2          : bill.address.line2,
            zipcode        : bill.address.zipcode,
            city           : bill.address.city,
            isoCountryCode : bill.address.isoCountryCode,
            country        : bill.address.country
        } : {},
        delivery : bill.delivery ? {
            price : {
                ati : bill.delivery.price.ati,
                et  : bill.delivery.price.et,
                vat : bill.delivery.price.vat
            },
            code : bill.delivery.code,
            name : bill.delivery.name
        } : {
            price : {
                ati : null,
                et  : null,
                vat : null
            },
            code : null,
            name : null
        },
        promos : {
            promoId     : (bill.promos && bill.promos[0]) ? bill.promos[0].promoId : null,
            promoCodeId : (bill.promos && bill.promos[0]) ? bill.promos[0].promoCodeId : null,
            discountATI : (bill.promos && bill.promos[0]) ? bill.promos[0].discountATI : null,
            discountET  : (bill.promos && bill.promos[0]) ? bill.promos[0].discountET : null,
            name        : (bill.promos && bill.promos[0]) ? bill.promos[0].name : null,
            description : (bill.promos && bill.promos[0]) ? bill.promos[0].description : null,
            code        : (bill.promos && bill.promos[0]) ? bill.promos[0].code : null,
            productsId
        },
        checksum        : undefined,
        taxes           : bill.taxes,
        priceSubTotal   : bill.priceSubTotal,
        additionnalFees : bill.additionnalFees,
        avoir           : bill.avoir
    });
}

module.exports = {
    getBills,
    orderToBill,
    generatePDF,
    cleanBillObject
};