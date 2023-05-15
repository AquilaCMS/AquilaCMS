/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const nodemailer                  = require('nodemailer');
const moment                      = require('moment-timezone');
const mongoose                    = require('mongoose');
const path                        = require('path');
const {fs, aquilaEvents, slugify} = require('aql-utils');
const ServiceLanguages            = require('./languages');
const mediasUtils                 = require('../utils/medias');
const NSErrors                    = require('../utils/errors/NSErrors');
const utilsServer                 = require('../utils/server');
const modulesUtils                = require('../utils/modules');
const translate                   = require('../utils/translate/common');
const {
    Users,
    Mail,
    Orders,
    PaymentMethods
}                      = require('../orm/models');

const QueryBuilder     = require('../utils/QueryBuilder');
const users            = require('../orm/models/users');
const restrictedFields = [];
const defaultFields    = ['*'];
const queryBuilder     = new QueryBuilder(Mail, restrictedFields, defaultFields);

/**
 * @description Get the emails
 */
const getMails = async (PostBody) => queryBuilder.find(PostBody, true);
/**
 * @description Get the email by _id
 * @param {ObjectId} _id
 */
const getMail = async (_id) => {
    if (!mongoose.Types.ObjectId.isValid(_id)) {
        throw NSErrors.InvalidObjectIdError;
    }
    const result = await Mail.findOne({_id}).lean();
    if (!result) {
        throw NSErrors.MailNotFound;
    }
    return result;
};

/**
 * @description Get an email by its type and language (the language is optional)
 * @param {string} type type of mail (ie: "", "register", "orderSuccess" etc...)
 * @param {string} [lang] (ie: df, us, uk etc...) (optionnal)
 */
const getMailByTypeAndLang = async (type, lang = '') => {
    lang         = await ServiceLanguages.getDefaultLang(lang);
    const query  = {type, [`translation.${lang}`]: {$exists: true}};
    const result = await Mail.findOne(query).lean();
    if (!result) {
        throw NSErrors.MailNotFound;
    }
    return result;
};
/**
 * @description Modify or create a new mail in the admin
 * @param {Object} body datas to set
 * @param {ObjectId} [_id] if the_id exists then we update otherwise we create (Optional)
 */
const setMail = async (body, _id = null) => {
    try {
        let result;
        if (_id) {
            // Update
            if (!mongoose.Types.ObjectId.isValid(_id)) {
                throw NSErrors.InvalidObjectIdError;
            }
            if (body.type !== '') {
                await checkUniqueType(body.type);
            }
            result = await Mail.findByIdAndUpdate(_id, {$set: body}, {new: true, runValidators: true});
            if (!result) {
                throw NSErrors.MailUpdateError;
            }
        } else {
            // Create
            if (body.type !== '') {
                await checkUniqueType(body.type);
            }

            body.code = slugify(body.code);
            result    = await Mail.create(body);
            if (!result) {
                throw NSErrors.MailCreateError;
            }
        }
        return result;
    } catch (error) {
        if (error.code === 11000) {
            throw NSErrors.MailCodeAlreadyExists;
        }
        if (error.name === 'ValidationError') {
            throw NSErrors.LoginSubscribeEmailInvalid;
        }
        throw error;
    }
};

/**
 * @description An email has a type (registration, forgotten password, etc.). This type must only belong to one email
 * If a new "registration" type mail is created, the old "registration" type mail will see its type change to "noType" (corresponding to the code of the mailtypes collection)
 * @param {string} type: corresponds to the type of email
 */
async function checkUniqueType(type) {
    try {
        const mails = await Mail.find({type}).lean();
        // If there is no mail with this type then we do nothing
        if (!mails.length) {
            return;
        }
        // One or more (case: 'several' should never happen) mail has this type, we assign these mail.type = ""
        for (let i = 0; i < mails.length; i++) {
            const result = await Mail.findByIdAndUpdate({_id: mails[i]._id}, {type: ''}, {new: true, runValidators: true});
            if (!result) {
                throw NSErrors.MailUpdateNoTypeError;
            }
        }
    } catch (error) {
        throw NSErrors.MailCreateError;
    }
}

/**
 * @description delete the mail
 * @param {ObjectId} _id
 */
const deleteMail = async (_id, lang = 'fr') => {
    if (!mongoose.Types.ObjectId.isValid(_id)) {
        throw NSErrors.InvalidObjectIdError;
    }
    const doc = await Mail.findOneAndRemove({_id});
    if (!doc) {
        throw NSErrors.MailNotFound;
    }
    if (doc.translation[lang].attachments && doc.translation[lang].attachments.length !== 0) {
        for (const file of doc.translation[lang].attachments) {
            const pathToFile = file.path;
            await mediasUtils.deleteFile(pathToFile);
        }
    }
    return doc;
};

const sendMailTestConfig = async (mail) => {
    const body = '<table style="width: 100%"><tbody><tr><td style="text-align: center;border-bottom-style: solid; border-bottom-width: 5px; border-bottom-color: #1432AA"><br><span style="color:#1432AA;line-height:60px;font-size:23px;font-weight:bold">TEST MAIL / EMAIL DE TEST</span></td></tr><tr><td><table style="width: 100%;background-color:#EEE"><tbody><tr><td style="width: 5%;"></td><td><br><table style="width: 100%; border-style: solid; border-width: 1px; border-color: #ddd; background-color: #fff;"><tbody><tr><td style="padding: 20px;line-height:24px;color:#888">The email configuration is operational.<br/>La configuration email est opérationnelle.</td></tr></tbody></table></td><td style="width: 5%;"></td></tr></tbody></table></td></tr><tr><td style="padding: 5px;text-align: center; width: 100%;font-size:13px">© AquilaCMS&nbsp;- <a href="https://www.aquila-cms.com" title="Aquila-CMS Opensource" target="_blank" rel="noopener">powered by AquilaCMS</a></td></tr></tbody></table>';
    return sendMail({subject: 'Subject : Email Test', htmlBody: body, mailTo: mail.to, mailFrom: mail.from});
};

const removePdf = async (mail, path) => {
    const result = await Mail.findByIdAndUpdate({_id: mail._id}, {translation: mail.translation}, {new: true, runValidators: true});
    if (typeof path === 'string') {
        await mediasUtils.deleteFile(path);
    }
    return result;
};

/**
 * @param {{to: string, from: string, translation: {lang: {subject: string, content: string}}}} mail
 * @param {[{name: string, value: any}]} [values=[]] values to replace in mail
 * @param {string} [lang="fr"] lang of mail
 */
const sendMailTest = async (mail, values = [], lang = 'fr') => {
    const subject   = mail.translation[lang].subject;
    const content   = mail.translation[lang].content;
    let attachments = null;
    if (mail.translation[lang] && mail.translation[lang].attachments && mail.translation[lang].attachments.length > 0) {
        attachments = mail.translation[lang].attachments;
    }

    const data = {};
    values.forEach((element) => {
        data[`{{${element.value}}}`] = element.text;
    });

    if (['orderSuccessDeferred', 'orderSuccessCompany', 'orderSuccess'].includes(mail.code)) {
        content.replace('<!--startitems-->', '').replace('<!--enditems-->', '');
    }

    const htmlBody = generateHTML(content, data);
    return sendMail({subject, htmlBody, mailTo: mail.to, mailFrom: mail.from, attachments});
};

/**
 *
 * @param {string} type type of mail in database
 * @param {string} lang two characters for lang
 * @returns {{content: string, subject: string, fromName: string, attachments: Array}}
 */
async function getMailDataByTypeAndLang(type, lang = 'fr') {
    lang               = await ServiceLanguages.getDefaultLang(lang);
    const mailRegister = await getMailByTypeAndLang(type, lang);
    const content      = mailRegister.translation[lang].content ? mailRegister.translation[lang].content : '';
    const subject      = mailRegister.translation[lang].subject ? mailRegister.translation[lang].subject : '';
    let attachments    = []; // maybe change to null
    if (mailRegister.translation[lang].attachments && mailRegister.translation[lang].attachments.length > 0) {
        attachments = mailRegister.translation[lang].attachments;
    }
    if (!subject) {
        throw NSErrors.MailFieldSubjectNotFound;
    }
    if (!content) {
        throw NSErrors.MailFieldHtmlNotFound;
    }
    return {content, subject, from: mailRegister.from, fromName: mailRegister.fromName, attachments};
}

const sendMailActivationAccount = async (user_id, lang = '') => {
    const _config = global.aquila.envConfig;
    const _user   = await Users.findById(user_id);
    if (!_user) {
        throw NSErrors.AccountUserNotFound;
    }
    lang                                                  = await determineLanguage(lang, _user.preferredLanguage);
    const {content, subject, from, fromName, attachments} = await getMailDataByTypeAndLang('activationAccount', lang);
    const oDataMail                                       = {
        '{{activate_account_token}}' : `${_config.environment.appUrl}${lang}/checkemailvalid?token=${_user.activateAccountToken}`,
        '{{name}}'                   : _user.fullname,
        '{{company}}'                : _user.company.name,
        '{{fullname}}'               : _user.fullname,
        '{{firstname}}'              : _user.firstname,
        '{{lastname}}'               : _user.lastname,
        '{{token}}'                  : _user.activateAccountToken,
        '{{URL_SITE}}'               : _config.environment.appUrl,
        '{{lang}}'                   : lang
    };
    const htmlBody                                        = generateHTML(content, oDataMail);
    return sendMail({subject, htmlBody, mailTo: _user.email, mailFrom: from, fromName, attachments});
};

/**
 * @description Allows you to send an email containing the registration information of a customer
 * @param {guid} user_id - _id de l'utilisateur destinataire
 * @param {string} [lang] - langue du mail (Optionnel)
 */
const sendRegister = async (user_id, lang = '') => {
    const _config = global.aquila.envConfig;
    const _user   = await Users.findById(user_id);
    if (!_user) {
        throw NSErrors.AccountUserNotFound;
    }
    lang = await determineLanguage(lang, _user.preferredLanguage);

    const {content, subject, from, fromName, attachments} = await getMailDataByTypeAndLang('register', lang);
    const oDataMail                                       = {
        '{{name}}'      : _user.fullname,
        '{{fullname}}'  : _user.fullname,
        '{{firstname}}' : _user.firstname,
        '{{company}}'   : _user.company.name,
        '{{lastname}}'  : _user.lastname,
        '{{login}}'     : _user.email,
        '{{token}}'     : _user.activateAccountToken,
        '{{URL_SITE}}'  : _config.environment.appUrl,
        '{{lang}}'      : lang
    };
    // if (true) { // Possibility to use a variable: validate the email at registration
    oDataMail['{{activate_account_token}}'] = `${_config.environment.appUrl}${lang}/checkemailvalid?token=${_user.activateAccountToken}`;
    // }
    const htmlBody = generateHTML(content, oDataMail);
    return sendMail({subject, htmlBody, mailTo: _user.email, mailFrom: from, fromName, attachments});
};

const sendRegisterForAdmin = async (user_id, lang = '') => {
    const _user = await Users.findById(user_id);
    if (!_user) {
        throw NSErrors.AccountUserNotFound;
    }
    lang                                                  = await determineLanguage(lang, _user.preferredLanguage);
    const {content, subject, from, fromName, attachments} = await getMailDataByTypeAndLang('sendRegisterForAdmin', lang);
    const oDataMail                                       = {
        '{{name}}'      : _user.fullname,
        '{{fullname}}'  : _user.fullname,
        '{{firstname}}' : _user.firstname,
        '{{lastname}}'  : _user.lastname,
        '{{login}}'     : _user.email,
        '{{company}}'   : _user.company.name
    };
    const htmlBody                                        = generateHTML(content, oDataMail);
    return sendMail({subject, htmlBody, mailTo: from, mailFrom: from, fromName, attachments});
};

/**
 * @description Send the password reset email
 * @param {string|array} to Recipient or list of recipients
 * @param {string} tokenlink Password reset validation token
 * @param {string} [lang="fr"] lang
 */
const sendResetPassword = async (to, tokenlink, token, lang = 'fr') => {
    const _user        = await Users.findOne({email: to});
    lang               = await determineLanguage(lang, _user.preferredLanguage);
    const mailRegister = await getMailByTypeAndLang('passwordRecovery', lang);
    const subject      = mailRegister.translation[lang].subject ? mailRegister.translation[lang].subject : '';
    const content      = mailRegister.translation[lang].content ? mailRegister.translation[lang].content : '';
    if (!subject) {
        throw NSErrors.MailFieldSubjectNotFound;
    }
    if (!content) {
        // If the admin made the request
        if (_user.isAdmin) {
            throw NSErrors.ResetPasswordMailContentAdminNotExists;
        } else {
            throw NSErrors.ResetPasswordMailContentNotExists;
        }
    }
    let attachments = null;
    if (mailRegister.translation[lang].attachments && mailRegister.translation[lang].attachments.length > 0) {
        attachments = mailRegister.translation[lang].attachments;
    }
    const oDataMail = {
        '{{name}}'      : _user.fullname,
        '{{firstname}}' : _user.firstname,
        '{{lastname}}'  : _user.lastname,
        '{{company}}'   : _user.company.name,
        '{{fullname}}'  : _user.fullname,
        '{{tokenlink}}' : tokenlink,
        '{{token}}'     : token,
        '{{URL_SITE}}'  : global.aquila.envConfig.environment.appUrl
    };
    const htmlBody  = generateHTML(content, oDataMail);
    return sendMail({subject, htmlBody, mailTo: to, mailFrom: mailRegister.from, fromName: mailRegister.fromName, attachments});
};

/**
 * This service allows you to send an email to the company when a new order
 * So when a customer orders, the company is informed of this order.
 * @param {ObjectId} order_id the id of an order
 * @param {string} lang email language
 */
const sendMailOrderToCompany = async (order_id, lang = '') => {
    const {orderStatuses} = require('./orders');
    const order           = await Orders.findOne({_id: order_id}).populate('customer.id items.id');
    if (!order) {
        throw NSErrors.OrderNotFound;
    }
    lang                                         = await determineLanguage(lang, order.customer.id.preferredLanguage);
    const taxDisplay                             = order.priceTotal.paidTax ? 'ati' : 'et';
    const mailDatas                              = await getMailDataByTypeAndLang('orderSuccessCompany', lang);
    const {subject, from, fromName, attachments} = mailDatas;
    let {content}                                = mailDatas;

    // Mailing information is recorded in DB
    if (order.payment.length && order.payment[0].mode === 'CB' && order.status !== orderStatuses.PAID && order.status !== orderStatuses.FINISHED) {
        throw NSErrors.OrderNotPaid;
    }
    const {line1, line2, zipcode, city, country, complementaryInfo, phone_mobile, companyName} = order.addresses.delivery;
    // Create from order's details (the table that will be displayed in the email)
    let templateItems  = '';
    const itemTemplate = content.match(/<!--startitems-->(.|\n)*?<!--enditems-->/g);
    if (itemTemplate && itemTemplate[0]) {
        const htmlItem = itemTemplate[0].replace('<!--startitems-->', '').replace('<!--enditems-->', '');
        for (const item of order.items) {
            const {translation} = item.id;

            const prdData = {
                '{{product.quantity}}'         : item.quantity,
                '{{product.name}}'             : item.name,
                '{{product.specialUnitPrice}}' : '',
                '{{product.bundleName}}'       : translation[lang].name,
                '{{product.unitPrice}}'        : `${(item.price.special && item.price.special[taxDisplay] ? item.price.special[taxDisplay] : item.price.unit[taxDisplay]).aqlRound(2)} €`,
                '{{product.totalPrice}}'       : `${(item.quantity * (item.price.special && item.price.special[taxDisplay] ? item.price.special[taxDisplay] : item.price.unit[taxDisplay])).aqlRound(2)} €`,
                '{{product.basePrice}}'        : '',
                '{{product.descPromo}}'        : '',
                '{{product.descPromoT}}'       : '',
                '{{product.sumSpecialPrice}}'  : ''
            };

            if (item.parent && translation[lang]) {
                prdData['{{product.bundleName}}'] = order.items.find((i) => i._id.toString() === item.parent.toString()).name;
            }
            let basePrice  = null;
            let descPromo  = '';
            let descPromoT = '';
            if (order.quantityBreaks && order.quantityBreaks.productsId.length) {
                // Check if the current product has received a discount
                const prdPromoFound = order.quantityBreaks.productsId.find((productId) => productId.productId.toString() === item.id.id.toString());
                if (prdPromoFound) {
                    basePrice                         = prdPromoFound[`basePrice${taxDisplay.toUpperCase()}`];
                    descPromo                         = basePrice.aqlRound(2);
                    descPromoT                        = (basePrice * item.quantity).aqlRound(2);
                    prdData['{{product.basePrice}}']  = basePrice;
                    prdData['{{product.descPromo}}']  = descPromo;
                    prdData['{{product.descPromoT}}'] = descPromoT;
                }
            }
            templateItems += await generateHTML(htmlItem, prdData);
        }
        content = content.replace(htmlItem, templateItems);
    }
    let dateReceipt = '';
    let hourReceipt = '';
    if (order.orderReceipt && order.orderReceipt.date) {
        const d       = order.orderReceipt.date;
        const _config = global.aquila.envConfig;
        if (!_config) {
            throw NSErrors.ConfigurationNotFound;
        }
        dateReceipt = moment(d).tz(_config.environment.websiteTimezone ? _config.environment.websiteTimezone : 'Europe/Paris').format('DD/MM/YYYY');
        hourReceipt = moment(d).tz(_config.environment.websiteTimezone ? _config.environment.websiteTimezone : 'Europe/Paris').format('HH:mm');
    }

    const datas = {
        '{{taxdisplay}}'                 : translate[taxDisplay][lang],
        '{{discount}}'                   : translate.discount[lang],
        '{{order.customer.company}}'     : order.customer.company.name,
        '{{order.customer.fullname}}'    : order.customer.id.fullname,
        '{{order.customer.name}}'        : order.customer.id.fullname,
        '{{order.customer.firstname}}'   : order.customer.id.firstname,
        '{{order.customer.lastname}}'    : order.customer.id.lastname,
        '{{order.customer.mobilePhone}}' : phone_mobile || (order._doc.customer.id.addresses && order._doc.customer.id.addresses.length > 0 ? order._doc.customer.id.addresses[0].phone_mobile : ''),
        '{{order.number}}'               : order.number,
        '{{quantityBreaks}}'             : '',
        '{{order.dateReceipt}}'          : dateReceipt,
        '{{order.hourReceipt}}'          : hourReceipt,
        '{{order.priceTotal}}'           : `${order.priceTotal[taxDisplay].aqlRound(2)} €`,
        '{{order.delivery}}'             : order._doc.orderReceipt ? translate[order._doc.orderReceipt.method][lang] : translate.delivery[lang],
        '{{order.paymentMode}}'          : order._doc.payment[0].mode,
        '{{order.paymentDescription}}'   : order._doc.payment[0].description,
        '{{order.shipment}}'             : order._doc.delivery.name,
        '{{address.line1}}'              : line1 || '',
        '{{address.line2}}'              : line2 || '',
        '{{address.companyName}}'        : companyName || '',
        '{{address.complementaryInfo}}'  : complementaryInfo || '',
        '{{address.zipcode}}'            : zipcode || '',
        '{{address.city}}'               : city || '',
        '{{address.country}}'            : country || ''
    };

    if (order.quantityBreaks && order.quantityBreaks[`discount${taxDisplay.toUpperCase()}`]) {
        datas['{{quantityBreaks}}'] = order.quantityBreaks[`discount${taxDisplay.toUpperCase()}`];
    }

    if (order.delivery && order.delivery.price && order.delivery.price[taxDisplay]) {
        datas['{{delivery.price}}'] = `${order.delivery.price[taxDisplay].aqlRound(2)} €`;
    }

    if (order.promos && order.promos.length && (order.promos[0].productsId.length === 0)) {
        datas['{{promo.discount}}'] = `${order.promos[0][`discount${taxDisplay.toUpperCase()}`].aqlRound(2)} €`;
        datas['{{promo.code}}']     = order.promos[0].code;
    } else {
        datas['{{promo.discount}}'] = `${(0).aqlRound(2)} €`;
    }
    const htmlBody = await generateHTML(content, datas);
    return sendMail({subject, htmlBody, mailTo: from, mailFrom: from, fromName, attachments});
};

/**
 * Send an email to the customer when he places an order.
 * @param {ObjectId} order_id the id of an order
 * @param {string} lang email language
 */
const sendMailOrderToClient = async (order_id, lang = '') => {
    const {orderStatuses} = require('./orders');
    const order           = await Orders.findOne({_id: order_id}).populate('customer.id items.id');
    if (!order) {
        throw NSErrors.OrderNotFound;
    }
    // If an order is paid in credit card the status of the order must be paid or finished to continue
    if (order.payment.length && order.payment[0].mode === 'CB' && order.status !== orderStatuses.PAID && order.status !== orderStatuses.FINISHED) {
        throw NSErrors.OrderNotPaid;
    }

    lang                                                                         = await determineLanguage(lang, order.customer.id.preferredLanguage);
    const taxDisplay                                                             = order.priceTotal.paidTax ? 'ati' : 'et';
    const {line1, line2, zipcode, city, country, complementaryInfo, companyName} = order.addresses.delivery;

    let dateReceipt = '';
    let hourReceipt = '';
    if (order.orderReceipt && order.orderReceipt.date) {
        const d       = order.orderReceipt.date;
        const _config = global.aquila.envConfig;
        if (!_config) {
            throw NSErrors.ConfigurationNotFound;
        }
        dateReceipt = moment(d).tz(_config.environment.websiteTimezone ? _config.environment.websiteTimezone : 'Europe/Paris').format('DD/MM/YYYY');
        hourReceipt = moment(d).tz(_config.environment.websiteTimezone ? _config.environment.websiteTimezone : 'Europe/Paris').format('HH:mm');
    }
    const mailDatas = {
        '{{taxdisplay}}'                : translate[taxDisplay][lang],
        '{{discount}}'                  : translate.discount[lang],
        '{{payment.instruction}}'       : '',
        '{{order.customer.company}}'    : order.customer.company.name,
        '{{order.customer.firstname}}'  : order.customer.id.firstname,
        '{{order.customer.lastname}}'   : order.customer.id.lastname,
        '{{order.customer.fullname}}'   : order.customer.id.fullname,
        '{{order.customer.name}}'       : order.customer.id.fullname,
        '{{order.number}}'              : order.number,
        '{{order.dateReceipt}}'         : dateReceipt,
        '{{order.hourReceipt}}'         : hourReceipt,
        '{{address.line1}}'             : line1 || '',
        '{{address.line2}}'             : line2 || '',
        '{{address.companyName}}'       : companyName || '',
        '{{address.complementaryInfo}}' : complementaryInfo || '',
        '{{address.zipcode}}'           : zipcode || '',
        '{{address.city}}'              : city || '',
        '{{address.country}}'           : country || '',
        '{{order.paymentMode}}'         : order._doc.payment[0].mode,
        '{{order.paymentDescription}}'  : order._doc.payment[0].description,
        '{{order.delivery}}'            : order._doc.orderReceipt ? translate[order._doc.orderReceipt.method][lang] : translate.delivery[lang],
        '{{order.priceTotal}}'          : `${order.priceTotal[taxDisplay].aqlRound(2)} €`
    };

    if (order.quantityBreaks && order.quantityBreaks[`discount${taxDisplay.toUpperCase()}`]) {
        mailDatas['{{quantityBreaks}}'] = order.quantityBreaks[`discount${taxDisplay.toUpperCase()}`];
    }

    if (order.promos && order.promos.length && (order.promos[0].productsId.length === 0)) {
        mailDatas['{{promo.discount}}'] = `${order.promos[0][`discount${taxDisplay.toUpperCase()}`].aqlRound(2)} €`;
        mailDatas['{{promo.code}}']     = order.promos[0].code;
    } else {
        mailDatas['{{promo.discount}}'] = `${(0).aqlRound(2)} €`;
    }

    if (order.delivery && order.delivery.price && order.delivery.price[taxDisplay]) {
        mailDatas['{{delivery.price}}'] = `${order.delivery.price[taxDisplay].aqlRound(2)} €`;
    }

    if (order.additionnalFees && order.additionnalFees[taxDisplay] && order.additionnalFees[taxDisplay] !== 0) {
        mailDatas['{{additionnalFees}}'] = order.additionnalFees[taxDisplay].aqlRound(2);
    }

    let mailByType;
    // Get the payment method for check isDeferred
    let paymentMethod;
    if (order.payment && order.payment[0] && order.payment[0].mode) {
        paymentMethod = await PaymentMethods.findOne({code: order.payment[0].mode.toLowerCase()}).lean();
    }
    if ((paymentMethod && paymentMethod.isDeferred === false) || order.status === orderStatuses.PAID || order.status === orderStatuses.FINISHED) {
        // We send the order success email to the customer
        mailByType = await getMailDataByTypeAndLang('orderSuccess', lang);
    } else {
        // We send the order success email to the customer with instructions to pay by check or bank transfer
        mailByType = await getMailDataByTypeAndLang('orderSuccessDeferred', lang);
        if (paymentMethod) {
            mailDatas['{{payment.instruction}}'] = paymentMethod.translation[lang].instruction;
        }
    }

    const {subject, from, fromName, attachments} = mailByType;
    let {content}                                = mailByType;
    // Create from the order the items ordered (the table that will be displayed in the email)
    let templateItems  = '';
    const itemTemplate = content.match(/<!--startitems-->(.|\n)*?<!--enditems-->/g);
    if (itemTemplate && itemTemplate[0]) {
        const htmlItem = itemTemplate[0].replace('<!--startitems-->', '').replace('<!--enditems-->', '');
        for (const item of order.items) {
            const {translation} = item.id;
            const prdData       = {
                '{{product.quantity}}'         : item.quantity,
                '{{product.name}}'             : item.name,
                '{{product.specialUnitPrice}}' : '',
                '{{product.bundleName}}'       : translation[lang].name,
                '{{product.unitPrice}}'        : `${(item.price.special && item.price.special[taxDisplay] ? item.price.special[taxDisplay] : item.price.unit[taxDisplay]).aqlRound(2)} €`,
                '{{product.totalPrice}}'       : `${(item.quantity * (item.price.special && item.price.special[taxDisplay] ? item.price.special[taxDisplay] : item.price.unit[taxDisplay])).aqlRound(2)} €`,
                '{{product.basePrice}}'        : '',
                '{{product.descPromo}}'        : '',
                '{{product.descPromoT}}'       : '',
                '{{product.sumSpecialPrice}}'  : ''
            };

            if (item.parent && translation[lang]) {
                prdData['{{product.bundleName}}'] = order.items.find((i) => i._id.toString() === item.parent.toString()).id.translation[lang].name;
            }

            let basePrice  = null;
            let descPromo  = '';
            let descPromoT = '';
            if (order.quantityBreaks && order.quantityBreaks.productsId.length) {
                // We check if the current product has received a discount
                const prdPromoFound = order.quantityBreaks.productsId.find((productId) => productId.productId.toString() === item.id.id.toString());
                if (prdPromoFound) {
                    basePrice                         = prdPromoFound[`basePrice${taxDisplay.toUpperCase()}`];
                    descPromo                         = basePrice.aqlRound(2);
                    descPromoT                        = (basePrice * item.quantity).aqlRound(2);
                    prdData['{{product.basePrice}}']  = basePrice;
                    prdData['{{product.descPromo}}']  = descPromo;
                    prdData['{{product.descPromoT}}'] = descPromoT;
                }
            }
            templateItems += await generateHTML(htmlItem, prdData);
        }
        content = content.replace(htmlItem, templateItems);
    }
    const discountTemplate = content.match(/<!--startshowpromo-->(.|\n)*?<!--endshowpromo-->/g);
    if (discountTemplate && discountTemplate[0]) {
        const htmlDiscount = discountTemplate[0].replace('<!--startshowpromo-->', '').replace('<!--endshowpromo-->', '');
        if (order.promos.length === 0) {
            content = content.replace(htmlDiscount, '');
        }
    }

    const htmlBody = await generateHTML(content, mailDatas);
    return sendMail({subject, htmlBody, mailTo: order.customer.email, mailFrom: from, fromName, attachments});
};

/**
 * This service allows you to send an email to the customer when the order's status is changing
 * @param {ObjectId} order_id the id of an order
 * @param {string} lang email language
 */
const sendMailOrderStatusEdit = async (order_id, lang = '') => {
    const {orderStatuses} = require('./orders');
    const _order          = await Orders.findOne({_id: order_id}).populate('customer.id');
    if (!_order) {
        throw NSErrors.OrderNotFound;
    }
    lang = await determineLanguage(lang, _order.customer.id.preferredLanguage);
    if (_order.status === orderStatuses.PAID || _order.status === orderStatuses.FINISHED) {
        return sendMailOrderToClient(order_id, lang);
    }
    const {
        content,
        subject,
        from,
        fromName,
        attachments
    }              = await getMailDataByTypeAndLang('changeOrderStatus', lang);
    const status   = require('../utils/translate/orderStatus')[_order.status].translation[lang].name;
    const htmlBody = generateHTML(content, {
        '{{number}}'    : _order.number,
        '{{status}}'    : status,
        '{{name}}'      : _order.customer.id.fullname,
        '{{fullname}}'  : _order.customer.id.fullname,
        '{{company}}'   : _order.customer.company.name,
        '{{firstname}}' : _order.customer.id.firstname,
        '{{lastname}}'  : _order.customer.id.lastname});
    return sendMail({subject, htmlBody, mailTo: _order.customer.email, mailFrom: from, fromName, attachments});
};

const sendMailCheckJobs = async (to, result, lang = '') => {
    lang           = await determineLanguage(lang, lang);
    const {
        content,
        subject,
        from,
        fromName,
        attachments
    }              = await getMailDataByTypeAndLang('notifyAdminsJobs', lang);
    const htmlBody = generateHTML(content, {
        '{{jobsResult}}' : result
    });
    return sendMail({subject, htmlBody, mailTo: to, mailFrom: from, fromName, attachments});
};

/**
 * @description Sending an email
 * @param {Object} mailinformation - Sending an email
 * @param {string} mailinformation.subject - Email subject
 * @param {string} mailinformation.htmlBody - Email HTML
 * @param {string} mailinformation.mailTo - Mail recipient
 * @param {string} [mailinformation.mailFrom=null] - Email sender (Optional)
 * @param {array<object>} [mailinformation.attachments=null] - aatachements object (Optional)
 * @param {string} [mailinformation.textBody=null] - Mail text (if no html reader) (Optional)
 * @param {string} [mailinformation.fromName=null] - Sender name (Optionnal)
 * @return {Promise<{envelope: {from: string, to: string[]}, messageId: string}>}
 * envelope – is an envelope object {from:‘address’, to:[‘address’]}\
 * messageId – is the Message-ID header value
 */
async function sendMail({subject, htmlBody, mailTo, mailFrom = null, attachments = null, textBody = null, fromName = null}) {
    try {
        let transporter;
        const {
            mailHost,
            mailPort,
            mailUser,
            mailPass,
            mailIsSendmail,
            mailSecure,
            overrideSendTo,
            mailFromContact
        } = global.aquila.envConfig.environment;

        if (!mailTo || mailTo.length === 0) {
            console.error('sendMail() : mailTo is empty !!');
        }

        // Check that there is no recipient overload in the config
        if (overrideSendTo) {
            mailTo = overrideSendTo;
        }

        // If we are in DEV mode, the recipient is the dev, and not the real mail
        const devMode = global.aquila.envFile.devMode;
        if (devMode && devMode.mailTo) {
            mailTo = devMode.mailTo;
        }

        let fromMail = mailFrom || mailFromContact;
        if (fromName) {
            fromMail = `${fromName} <${fromMail}>`;
        }
        const mailOptions = {
            from : fromMail,
            to   : mailTo,
            html : htmlBody,
            subject
        };

        if (attachments && attachments.length > 0) {
            if (!mailOptions.attachments) {
                mailOptions.attachments = [];
            }
            for (const file of attachments) {
                if (typeof file !== 'object') {
                    console.error('Attachments need to be an object');
                    continue;
                }
                let pathToFile = file.path;
                if (!path.isAbsolute(pathToFile)) {
                    pathToFile = path.resolve(utilsServer.getUploadDirectory(), file.path);
                }
                const checkAccess = await fs.hasAccess(pathToFile);
                const isFile      = (await fs.lstat(pathToFile)).isFile();
                if (!checkAccess || !isFile) {
                    console.error('Your attachments looks unreachable');
                }
                const data = await fs.readFile(pathToFile, {encoding: 'base64'});
                mailOptions.attachments.push({
                    filename    : `${file.name.originalname}.${file.name.mimetype.split('/')[1]}`,
                    content     : data,
                    encoding    : 'base64',
                    contentType : file.name.mimetype
                });
            }
        }
        mailOptions.text = textBody || htmlBody;
        const aqSendMail = aquilaEvents.emit('aqSendMail', mailOptions);

        if (!aqSendMail) {
            let options = {};
            if (!mailIsSendmail) {
                if (!mailHost || !mailPort || !mailUser || !mailPass) {
                    throw NSErrors.UnableToMail;
                }
                if (mailUser.indexOf('gmail') > -1) {
                    options = {
                        service : 'Gmail',
                        auth    : {user: mailUser, pass: mailPass},
                        tls     : {rejectUnauthorized: false}
                    };
                } else {
                    options = {
                        host   : mailHost,
                        port   : Number.parseInt(mailPort, 10),
                        secure : mailSecure || false,
                        auth   : {
                            user : mailUser,
                            pass : mailPass
                        }
                    };
                }
            } else {
                options = {
                    sendmail : true,
                    newline  : 'unix',
                    path     : '/usr/sbin/sendmail'
                };
            }

            try {
                transporter = nodemailer.createTransport(options);
                return transporter.sendMail(mailOptions);
            } catch (err) {
                console.error('Send mail error', err);
                throw err;
            }
        }
        return aqSendMail;
    } catch (error) {
        const errorMail = NSErrors.UnableToMail;
        errorMail.datas = {message: error.message, stack: error.stack};
        throw errorMail;
    }
}

function replaceMultiple(html, obj = {}) {
    for (const x in obj) {
        if (obj[x]) {
            html = html.replace(new RegExp(x, 'g'), obj[x]);
        } else {
            html = html.replace(new RegExp(x, 'g'), '');
        }
    }
    return html;
}

/**
 * @description Send the information of a contact form by email
 * @param {string} type - Mail type
 * @param {string} to - Recipient
 * @param {Object} datas - Subject of the form sent
 * @param {string} lang - Language of subject and content
 */
const sendGeneric = async (type, to, datas, lang = '') => {
    lang            = await ServiceLanguages.getDefaultLang(lang);
    const body      = {};
    const datasKeys = Object.keys(datas);

    const query = {type, [`translation.${lang}`]: {$exists: true}};
    const mail  = await Mail.findOne(query).lean();
    if (!mail) {
        throw NSErrors.MailNotFound;
    }
    let subject = '';
    if (datas.subject) {
        subject = datas.subject;
    } else if (mail.translation[lang].subject) {
        subject = mail.translation[lang].subject;
    }
    const content   = mail.translation[lang].content ? mail.translation[lang].content : '';
    let attachments = null;
    if (mail.translation[lang].attachments && mail.translation[lang].attachments.length > 0) {
        attachments = mail.translation[lang].attachments;
    }
    to = to || mail.from;

    for (let i = 0; i < datasKeys.length; i++) {
        body[`{{${datasKeys[i]}}}`] = datas[datasKeys[i]];
    }

    return sendMail({subject, htmlBody: generateHTML(content, body), mailTo: to, mailFrom: mail.from, fromName: mail.fromName, attachments});
};

/**
 * @description Send the information of a contact form by email
 * @param {Object} datas - Datas of the form sent
 */
const sendContact = async (datas, lang = '') => {
    await modulesUtils.modulesLoadFunctions('sendContact', {datas, lang}, async function () {
        lang              = await determineLanguage(lang, datas.lang);
        const query       = {type: 'contactMail', [`translation.${lang}`]: {$exists: true}};
        const contactMail = await Mail.findOne(query).lean();

        if (!contactMail) {
            throw NSErrors.MailNotFound;
        }
        const content   = contactMail.translation[lang].content ? contactMail.translation[lang].content : '';
        const subject   = contactMail.translation[lang].subject ? contactMail.translation[lang].subject : '';
        let attachments = null;
        if (contactMail.translation[lang].attachments && contactMail.translation[lang].attachments.length > 0) {
            attachments = contactMail.translation[lang].attachments;
        }
        let bodyString = '';
        Object.keys(datas).forEach((key) => {
            if (Array.isArray(datas[key])) {
                for (let i = 0; i < datas[key].length; i++) {
                    bodyString += `<div><b>${key}:</b> ${datas[key][i]}</div>`;
                }
            } else {
                bodyString += `<div><b>${key}:</b> ${datas[key]}</div>`;
            }
        });

        const htmlBody = generateHTML(content, {'{{formDatas}}': bodyString});
        return sendMail({subject, htmlBody, mailTo: contactMail.from, mailFrom: contactMail.from, fromName: contactMail.fromName, attachments});
    });
};

/**
 * @description Generation of HTML from a template and datas
 * @param {string} html HTML template retrieved from the mail collection
 * @param {object} [datas={}] Object containing the data to replace : {"variable_to_replace":"the_value", "var2":"value2"}
 */
const generateHTML = (html, datas = {}) => {
    if (!datas) datas = {};
    const {appUrl} = global.aquila.envConfig.environment;
    // Override appUrl
    datas['{{appUrl}}'] = appUrl;
    return replaceMultiple(html, datas);
};

/**
 * @description Determine the best language for the user
 * @param {string} lang lang
 * @param {string} preferredLanguage preferredLanguage
 */
async function determineLanguage(lang, preferredLanguage) {
    if (lang == null || typeof lang === 'undefined' || lang === 'undefined') {
        lang = '';
    }
    if (lang === '' && typeof preferredLanguage !== 'undefined' && preferredLanguage !== '') lang = preferredLanguage;
    if (lang === '') lang = await ServiceLanguages.getDefaultLang(lang);
    return lang;
}

async function sendMailOrderRequestCancel(_id, lang = '') {
    const _order = await Orders.findOne({_id}).populate('customer.id');
    if (!_order) {
        throw NSErrors.OrderNotFound;
    }
    lang           = await determineLanguage(lang, _order.customer.id.preferredLanguage);
    const {
        content,
        subject,
        from,
        fromName,
        attachments
    }              = await getMailDataByTypeAndLang('requestCancelOrderNotify', lang);
    const status   = require('../utils/translate/orderStatus')[_order.status].translation[lang].name;
    const htmlBody = generateHTML(content, {
        '{{number}}'    : _order.number,
        '{{status}}'    : status,
        '{{name}}'      : _order.customer.id.fullname,
        '{{fullname}}'  : _order.customer.id.fullname,
        '{{company}}'   : _order.customer.company.name,
        '{{firstname}}' : _order.customer.id.firstname,
        '{{lastname}}'  : _order.customer.id.lastname});
    return sendMail({subject, htmlBody, mailTo: from, mailFrom: from, fromName, attachments});
}

async function sendMailPendingCarts(cart) {
    const customer = await users.findOne({_id: cart.customer.id});
    if (!customer) return;
    const lang                                   = customer.preferredLanguage;
    const mailTo                                 = cart.customer.email;
    const taxDisplay                             = cart.paidTax ? 'ati' : 'et';
    const mailDatas                              = await getMailDataByTypeAndLang('pendingCarts', lang);
    let {content}                                = mailDatas;
    const {subject, from, fromName, attachments} = mailDatas;

    let templateItems  = '';
    const itemTemplate = content.match(/<!--startitems-->(.|\n)*?<!--enditems-->/g);
    if (itemTemplate && itemTemplate[0]) {
        const htmlItem = itemTemplate[0].replace('<!--startitems-->', '').replace('<!--enditems-->', '');
        for (const item of cart.items) {
            const prdData = {
                '{{product.quantity}}'         : item.quantity,
                '{{product.name}}'             : item.name,
                '{{product.specialUnitPrice}}' : '',
                '{{product.bundleName}}'       : item.name,
                '{{product.unitPrice}}'        : `${(item.price.special && item.price.special[taxDisplay] ? item.price.special[taxDisplay] : item.price.unit[taxDisplay]).aqlRound(2)} €`,
                '{{product.totalPrice}}'       : `${(item.quantity * (item.price.special && item.price.special[taxDisplay] ? item.price.special[taxDisplay] : item.price.unit[taxDisplay])).aqlRound(2)} €`,
                '{{product.basePrice}}'        : '',
                '{{product.descPromo}}'        : '',
                '{{product.descPromoT}}'       : '',
                '{{product.sumSpecialPrice}}'  : ''
            };
            if (item.parent) {
                prdData['{{product.bundleName}}'] = cart.items.find((i) => i._id.toString() === item.parent.toString()).id.translation[lang].name;
            }
            let basePrice  = null;
            let descPromo  = '';
            let descPromoT = '';
            if (cart.quantityBreaks && cart.quantityBreaks.productsId.length) {
                // Check if the current product has received a discount
                const prdPromoFound = cart.quantityBreaks.productsId.find((productId) => productId.productId.toString() === item.id.id.toString());
                if (prdPromoFound) {
                    basePrice                         = prdPromoFound[`basePrice${taxDisplay.toUpperCase()}`];
                    descPromo                         = basePrice.aqlRound(2);
                    descPromoT                        = (basePrice * item.quantity).aqlRound(2);
                    prdData['{{product.basePrice}}']  = basePrice;
                    prdData['{{product.descPromo}}']  = descPromo;
                    prdData['{{product.descPromoT}}'] = descPromoT;
                }
            }
            templateItems += await generateHTML(htmlItem, prdData);
        }
        content = content.replace(htmlItem, templateItems);
    }

    const datas = {
        '{{taxdisplay}}'         : translate[taxDisplay][lang],
        '{{customer.fullname}}'  : customer.fullname,
        '{{customer.name}}'      : customer.fullname,
        '{{customer.firstname}}' : customer.firstname,
        '{{customer.lastname}}'  : customer.lastname,
        '{{quantityBreaks}}'     : '',
        '{{order.priceTotal}}'   : `${cart.priceTotal[taxDisplay].aqlRound(2)} €`
    };

    if (cart.quantityBreaks && cart.quantityBreaks[`discount${taxDisplay.toUpperCase()}`]) {
        datas['{{quantityBreaks}}'] = cart.quantityBreaks[`discount${taxDisplay.toUpperCase()}`];
    }

    if (cart.delivery && cart.delivery.price && cart.delivery.price[taxDisplay]) {
        mailDatas['{{delivery.price}}'] = `${cart.delivery.price[taxDisplay].aqlRound(2)} €`;
    }

    if (cart.promos && cart.promos.length && (cart.promos[0].productsId.length === 0)) {
        datas['{{promo.discount}}'] = `${cart.promos[0][`discount${taxDisplay.toUpperCase()}`].aqlRound(2)} €`;
        datas['{{promo.code}}']     = cart.promos[0].code;
    } else {
        datas['{{promo.discount}}'] = `${(0).aqlRound(2)} €`;
    }
    const htmlBody = generateHTML(content, datas);
    return sendMail({subject, htmlBody, mailTo, mailFrom: from, fromName, attachments});
    // TODO CartMail : Analyze the return from sendMail to send the correct info
}

const sendErrorMail = async (error) => {
    const errorMail = await Mail.findOne({type: 'error'}).lean();
    if (!errorMail) {
        return; // We don't want to generate an error
    }

    const lang     = await determineLanguage();
    const content  = errorMail.translation[lang].content ? errorMail.translation[lang].content : '';
    const subject  = errorMail.translation[lang].subject ? errorMail.translation[lang].subject : 'Error';
    const htmlBody = generateHTML(content, {'{{error}}': JSON.stringify(error)});
    sendMail({subject, htmlBody, mailTo: errorMail.from, mailFrom: errorMail.from, fromName: errorMail.fromName});
};

module.exports = {
    getMailDataByTypeAndLang,
    generateHTML,
    getMails,
    getMail,
    getMailByTypeAndLang,
    setMail,
    deleteMail,
    determineLanguage,
    sendMailTestConfig,
    removePdf,
    sendMailTest,
    sendMailActivationAccount,
    sendRegister,
    sendRegisterForAdmin,
    sendResetPassword,
    sendMailOrderToCompany,
    sendMailOrderToClient,
    sendMailOrderStatusEdit,
    sendMail,
    sendGeneric,
    sendContact,
    sendMailOrderRequestCancel,
    sendMailPendingCarts,
    sendErrorMail,
    sendMailCheckJobs
};
