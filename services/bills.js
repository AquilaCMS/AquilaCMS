const crypto                     = require('crypto');
const moment                     = require('moment');
const {Bills, Orders, CmsBlocks} = require("../orm/models");
const QueryBuilder               = require('../utils/QueryBuilder');
const NSErrors                   = require("../utils/errors/NSErrors");
const ServiceOrder               = require('./orders');
const {generateHTML}             = require('./mail');
const queryBuilder               = new QueryBuilder(Bills, [], []);

const getBills = async (body) => {
    if (!body.sort) { // Default sort
        body.sort = {creationDate: -1};
    }
    return queryBuilder.find(body);
};

const orderToBill = async (idOrder, isAvoir = false) => {
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
            coordonnees : `${order.addresses.billing.line1 + (order.addresses.billing.line2 ? ` ${order.addresses.billing.line2}` : "")}, ${order.addresses.billing.zipcode} ${order.addresses.billing.city + (order.addresses.billing.country ? `, ${order.addresses.billing.country}` : "")}`,
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
            facture         : "unset"
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
            data.taxes[key] = data.taxes[key].toFixed(2);
        });
        const bill = await Bills.create(data);
        // set order status to BILLED
        await Orders.updateOne({_id: idOrder}, {$push: {bills: {billId: bill._id.toString()}}});
        await ServiceOrder.setStatus(order._id, 'BILLED');
        return bill;
    }
    return null;
};

const generatePDF = async (PostBody, res) => {
    const bills = await queryBuilder.findOne(PostBody);
    if (bills) {
        const bill        = bills.toObject();
        const lang        = bill.lang || global.defaultLang;
        const oldChecksum = bill.checksum;
        bill.checksum     = undefined;
        const obj         = cleanBillObject(bill);
        const checksum    = crypto.createHash('md5').update(obj, 'utf8').digest('hex');
        if (oldChecksum === checksum) {
            moment.locale(lang);
            const wkhtmltopdf = require('wkhtmltopdf');
            const html        = await CmsBlocks.findOne({code: 'invoice'});
            const withNoTaxes = lang === 'fr' ? 'HT' : 'ET';
            const withTaxes   = lang === 'fr' ? 'TTC' : 'ATI';
            const unpaid      = lang === 'fr' ? 'Non payé' : 'Unpaid';
            const paid        = lang === 'fr' ? 'Payé' : 'Paid';
            const datas       = {
                "{{number}}"                 : bill.facture,
                "{{totalAmount}}"            : bill.montant,
                "{{withTaxes}}"              : bill.withTaxes ? withTaxes : withNoTaxes,
                "{{email}}"                  : bill.email,
                "{{paymentDate}}"            : bill.paymentDate ? moment(bill.paymentDate).format('DD/MM/YYYY - HH:mm') : '',
                "{{creationDate}}"           : moment(bill.creationDate).format('DD/MM/YYYY - HH:mm'),
                "{{isPaid}}"                 : bill.isPaid ? paid : unpaid,
                "{{firstname}}"              : bill.address.firstname,
                "{{lastname}}"               : bill.address.lastname,
                "{{company}}"                : bill.address.companyName,
                "{{phone}}"                  : bill.address.phone ? bill.address.phone : '',
                "{{phone_mobile}}"           : bill.address.phone_mobile ? bill.address.phone_mobile : '',
                "{{address.line1}}"          : bill.address.line1,
                "{{address.line2}}"          : bill.address.line2 ? bill.address.line2 : '',
                "{{address.zipcode}}"        : bill.address.zipcode,
                "{{address.city}}"           : bill.address.city,
                "{{address.isoCountryCode}}" : bill.address.isoCountryCode,
                "{{address.country}}"        : bill.address.country,
                "{{deliveryPriceAti}}"       : bill.delivery && bill.delivery.price ? bill.delivery.price.ati.toFixed(2) : '',
                "{{deliveryPriceEt}}"        : bill.delivery && bill.delivery.price ? bill.delivery.price.et.toFixed(2) : '',
                "{{deliveryPriceVat}}"       : bill.delivery && bill.delivery.price && bill.delivery.price.vat ? bill.delivery.price.vat.toFixed(2) : '',
                "{{deliveryCode}}"           : bill.delivery ? bill.delivery.code : '',
                "{{deliveryName}}"           : bill.delivery ? bill.delivery.name : '',
                "{{promoPriceAti}}"          : bill.promos && bill.promos.discountATI ? bill.promos.discountATI.toFixed(2) : '',
                "{{promoPriceEt}}"           : bill.promos && bill.promos.discountET ? bill.promos.discountET.toFixed(2) : '',
                "{{promoName}}"              : bill.promos && bill.promos.name ? bill.promos.name : '',
                "{{promoDescription}}"       : bill.promos && bill.promos.description ? bill.promos.description : '',
                "{{promoCode}}"              : bill.promos && bill.promos.code ? bill.promos.code : '',
                "{{additionnalFeesAti}}"     : bill.additionnalFees.ati,
                "{{additionnalFeesEt}}"      : bill.additionnalFees.et,
                "{{additionnalFeesTax}}"     : bill.additionnalFees.tax,
                "{{priceSubTotalAti}}"       : bill.priceSubTotal.ati,
                "{{priceSubTotalEt}}"        : bill.priceSubTotal.et
            };
            let taxString = "";
            Object.keys(bill.taxes).forEach(function (key) {
                if (lang === 'fr') {
                    taxString += `Total des produits avec taxe à ${key}% : ${bill.taxes[key]} euros<br/>`;
                } else {
                    taxString += `Total for products with a ${key}% tax: ${bill.taxes[key]} euros<br/>`;
                }
            });
            datas["{{totalByTaxRate}}"] = taxString;
            if (!html) {
                throw NSErrors.InvoiceNotFound;
            }
            let content = await generateHTML(html.translation[bill.lang].content, datas);
            let items   = "";
            // eslint-disable-next-line no-useless-escape
            const itemTemplate = content.match(new RegExp(/\<\!\-\-startitems\-\-\>(.|\n)*?\<\!\-\-enditems\-\-\>/, 'g'));
            if (itemTemplate && itemTemplate[0]) {
                const htmlItem = itemTemplate[0].replace('<!--startitems-->', '').replace('<!--enditems-->', '');
                for (let i = 0; i < bill.items.length; i++) {
                    const prdData = {
                        "{{product.name}}"            : bill.items[i].name,
                        "{{product.code}}"            : bill.items[i].code,
                        "{{product.quantity}}"        : bill.items[i].quantity,
                        "{{product.priceAti}}"        : bill.items[i].price.unit.ati ? bill.items[i].price.unit.ati.toFixed(2) : '',
                        "{{product.specialPriceAti}}" : bill.items[i].price.special ? bill.items[i].price.special.ati.toFixed(2) : '',
                        "{{product.priceEt}}"         : bill.items[i].price.unit.et ? bill.items[i].price.unit.et.toFixed(2) : '',
                        "{{product.specialPriceEt}}"  : bill.items[i].price.special ? bill.items[i].price.special.et.toFixed(2) : '',
                        "{{product.vatRate}}"         : bill.items[i].price.vat && bill.items[i].price.vat.rate ? bill.items[i].price.vat.rate : '',
                        "{{product.discountATI}}"     : '',
                        "{{product.discountET}}"      : '',
                        "{{product.basePriceET}}"     : '',
                        "{{product.basePriceATI}}"    : ''
                    };
                    if (bill.promos.productsId) {
                        const index = bill.promos.productsId.findIndex((p) => p.productId.toString() === bill.items[i]._id);
                        if (index > -1) {
                            prdData["{{product.discountATI}}"] = bill.promos.productsId[index].discountATI.toFixed(2);
                            prdData["{{product.discountET}}"] = bill.promos.productsId[index].discountET.toFixed(2);
                            prdData["{{product.basePriceET}}"] = bill.promos.productsId[index].basePriceET.toFixed(2);
                            prdData["{{product.basePriceATI}}"] = bill.promos.productsId[index].basePriceATI.toFixed(2);
                        }
                    }
                    items += await generateHTML(htmlItem, prdData);
                }
                content = content.replace(htmlItem, items);
            }
            return wkhtmltopdf(content).pipe(res);
        }
        throw NSErrors.ChecksumInvoiceError;
    }
    throw NSErrors.AccessUnauthorized;
};

function cleanBillObject(bill) {
    const items = [];
    if (bill.items) {
        for (let i = 0; i < bill.items.length; i++) {
            const keys = Object.keys(bill.items[i]).sort();
            const z = {};
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
            const z = {};
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