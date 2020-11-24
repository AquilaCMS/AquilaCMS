const nodemailer       = require('nodemailer');
const moment           = require('moment-timezone');
const mongoose         = require('mongoose');
const path             = require('path');
const ServiceLanguages = require('./languages');
const encryption       = require('../utils/encryption');
const utils            = require('../utils/utils');
const mediasUtils      = require('../utils/medias');
const NSErrors         = require('../utils/errors/NSErrors');
const aquilaEvents     = require('../utils/aquilaEvents');
const utilsServer      = require('../utils/server');
const fs               = require('../utils/fsp');
const {
    Users,
    Mail,
    Modules,
    Orders,
    PaymentMethods
}                      = require('../orm/models');

/**
 * @description On récupére les mails
 */
const getMails = async () => {
    return Mail.find({}).sort({createdAt: -1});
};
/**
 * @description on récupére le mail en fonction de son _id
 * @param {ObjectId} _id
 */
const getMail = async (_id) => {
    if (!mongoose.Types.ObjectId.isValid(_id)) {
        throw NSErrors.InvalidObjectIdError;
    }
    const result = await Mail.findOne({_id});
    if (!result) {
        throw NSErrors.MailNotFound;
    }
    return result;
};

/**
 * @description Permet de récupérer un email en fonction de son type et sa langue (la langue est optionnel)
 * @param {string} type type du mail (ex: "", "register", "orderSuccess" etc...)
 * @param {string} [lang] (ex: df, us, uk etc...) (optionnel)
 */
const getMailByTypeAndLang = async (type, lang = '') => {
    lang         = ServiceLanguages.getDefaultLang(lang);
    const query  = {type, [`translation.${lang}`]: {$exists: true}};
    const result = await Mail.findOne(query);
    if (!result) {
        throw NSErrors.MailNotFound;
    }
    return result;
};
/**
 * @description Permet de modifier ou créer un nouveau mail dans l'admin
 * @param {Object} body les data a enregistrer
 * @param {ObjectId} [_id] si l'_id existe alors on met a jour sinon on update (Optionnel)
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

            body.code = utils.slugify(body.code);
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
 * @description Un mail a un type (inscription, mot de passe oublié, etc). Ce type ne doit appartenir qu'a un seul mail
 * Si un nouveau mail de type "inscription" est crée, l'ancien mail de type "inscription" verra son type passer à "noType" (correspondant au code de la collection mailtypes)
 * @param {string} type: correspond au type du mail
 */
async function checkUniqueType(type) {
    try {
        const mails = await Mail.find({type});
        // Si il n'y a aucun mail ayant ce type alors nous ne faisons rien
        if (!mails.length) {
            return;
        }
        // Un ou plusieurs (le cas : 'plusieurs' ne devrait jamais arriver) mail possède ce type, nous assignons ces mail.type = ""
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
 * @description supprime le mail dont l'_id est passé en parametre
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
            await mediasUtils.deleteFile(file);
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
    await mediasUtils.deleteFile(path);
    return result;
};

/**
 * @param {{to: string, from: string, translation: {lang: {subject: string, content: string}}}} mail
 * @param {[{name: string, value: any}]} [values=[]] values to replace in mail
 * @param {string} [lang="fr"] lang of mail
 */
const sendMailTest = async (mail, values = [], lang = 'fr') => {
    const subject     = mail.translation[lang].subject;
    const content     = mail.translation[lang].content;
    const attachments = [];
    if (mail.translation[lang] && mail.translation[lang].attachments && mail.translation[lang].attachments.length > 0) {
        mail.translation[lang].attachments.forEach((file) => {
            attachments.push(file);
        });
    }

    const data = {};
    for (const element of values) {
        data[`{{${element.value}}}`] = element.text;
    }

    if (['orderSuccessDeferred', 'orderSuccessCompany', 'orderSuccess'].includes(mail.code)) {
        content.replace('<!--startitems-->', '').replace('<!--enditems-->', '');
    }
    const htmlBody = await generateHTML(content, data);
    return sendMail({subject, htmlBody, mailTo: mail.to, mailFrom: mail.from, attachments});
};

/**
 *
 * @param {string} type type of mail in database
 * @param {string} lang two characters for lang
 * @returns {{content: string, subject: string, fromName: string, attachments: Array}}
 */
async function getMailDataByTypeAndLang(type, lang = 'fr') {
    lang               = ServiceLanguages.getDefaultLang(lang);
    const mailRegister = await getMailByTypeAndLang(type, lang);
    const content      = mailRegister.translation[lang].content ? mailRegister.translation[lang].content : '';
    const subject      = mailRegister.translation[lang].subject ? mailRegister.translation[lang].subject : '';
    const attachments  = [];
    if (mailRegister.translation[lang].attachments && mailRegister.translation[lang].attachments.length > 0) {
        mailRegister.translation[lang].attachments.forEach((file) => {
            attachments.push(file.path);
        });
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
    const _config = global.envConfig;
    const _user   = await Users.findById(user_id);
    if (!_user) {
        throw NSErrors.AccountUserNotFound;
    }
    lang                                                     = determineLanguage(lang, _user.preferredLanguage);
    const {content, subject, from, fromName, pathAttachment} = await getMailDataByTypeAndLang('activationAccount', lang);
    const oDataMail                                          = {
        '{{activate_account_token}}' : `${_config.environment.appUrl}${lang}/checkemailvalid?token=${_user.activateAccountToken}`,
        '{{name}}'                   : _user.fullname,
        '{{company}}'                : _user.company.name,
        '{{fullname}}'               : _user.fullname,
        '{{firstname}}'              : _user.firstname,
        '{{lastname}}'               : _user.lastname
    };
    const htmlBody                                           = generateHTML(content, oDataMail);
    return sendMail({subject, htmlBody, mailTo: _user.email, mailFrom: from, fromName, pathAttachment});
};

/**
 * @description Permet d'envoyer un mail contenant les informations d'inscription d'un client
 * @param {guid} user_id - _id de l'utilisateur destinataire
 * @param {string} [lang] - langue du mail (Optionnel)
 */
const sendRegister = async (user_id, lang = '') => {
    const _config = global.envConfig;
    const _user   = await Users.findById(user_id);
    if (!_user) {
        throw NSErrors.AccountUserNotFound;
    }
    lang = determineLanguage(lang, _user.preferredLanguage);

    const {content, subject, from, fromName, pathAttachment} = await getMailDataByTypeAndLang('register', lang);
    const oDataMail                                          = {
        '{{name}}'      : _user.fullname,
        '{{fullname}}'  : _user.fullname,
        '{{firstname}}' : _user.firstname,
        '{{company}}'   : _user.company.name,
        '{{lastname}}'  : _user.lastname,
        '{{login}}'     : _user.email
    };
    // if (true) { // Possibilité d'utiliser une variable : valider l'email à l'inscription
    oDataMail['{{activate_account_token}}'] = `${_config.environment.appUrl}${lang}/checkemailvalid?token=${_user.activateAccountToken}`;
    // }
    const htmlBody = generateHTML(content, oDataMail);
    return sendMail({subject, htmlBody, mailTo: _user.email, mailFrom: from, fromName, pathAttachment});
};

const sendRegisterForAdmin = async (user_id, lang = '') => {
    try {
        const _user = await Users.findById(user_id);
        if (!_user) {
            throw NSErrors.AccountUserNotFound;
        }
        lang                                                     = determineLanguage(lang, _user.preferredLanguage);
        const {content, subject, from, fromName, pathAttachment} = await getMailDataByTypeAndLang('sendRegisterForAdmin', lang);
        const oDataMail                                          = {
            '{{name}}'      : _user.fullname,
            '{{fullname}}'  : _user.fullname,
            '{{firstname}}' : _user.firstname,
            '{{lastname}}'  : _user.lastname,
            '{{login}}'     : _user.email,
            '{{company}}'   : _user.company.name
        };
        const htmlBody                                           = generateHTML(content, oDataMail);
        return sendMail({subject, htmlBody, mailTo: from, mailFrom: from, fromName, pathAttachment});
    } catch (error) {
        console.error(error);
    }
};

/**
 * @description Envoie le mail de réinitialisation du mot de passe
 * @param {string|array} to Destinataire ou liste de destinataires
 * @param {string} tokenlink Token de validation de la réinitialisation du mot de passe
 * @param {string} [lang="fr"] lang
 */
const sendResetPassword = async (to, tokenlink, lang = 'fr') => {
    const _user        = await Users.findOne({email: to});
    lang               = determineLanguage(lang, _user.preferredLanguage);
    const mailRegister = await getMailByTypeAndLang('passwordRecovery', lang);
    const subject      = mailRegister.translation[lang].subject ? mailRegister.translation[lang].subject : '';
    const content      = mailRegister.translation[lang].content ? mailRegister.translation[lang].content : '';
    if (!subject) {
        throw NSErrors.MailFieldSubjectNotFound;
    }
    if (!content) {
        // Si c'est l'admin qui a fait la demande
        if (_user.isAdmin) {
            throw NSErrors.ResetPasswordMailContentAdminNotExists;
        } else {
            throw NSErrors.ResetPasswordMailContentNotExists;
        }
    }
    let pathAttachment = null;
    if (mailRegister.translation[lang].attachments && mailRegister.translation[lang].attachments.length > 0) {
        const _config = global.envConfig;
        if (!_config) {
            throw NSErrors.ConfigurationNotFound;
        }
        pathAttachment = _config.environment.appUrl + mailRegister.translation[lang].attachments[0].path;
    }
    const oDataMail = {
        '{{name}}'      : _user.fullname,
        '{{firstname}}' : _user.firstname,
        '{{lastname}}'  : _user.lastname,
        '{{company}}'   : _user.company.name,
        '{{fullname}}'  : _user.fullname,
        '{{tokenlink}}' : tokenlink
    };
    const htmlBody  = generateHTML(content, oDataMail);
    return sendMail({subject, htmlBody, mailTo: to, mailFrom: mailRegister.from, fromName: mailRegister.fromName, pathAttachment});
};

/**
 * Utilisé par FKA
 */
const sendPDFAttachmentToClient = async (subject = '', htmlBody = '', mailTo, mailFrom = null, pathAttachment) => {
    if (!pathAttachment || !mailTo) {
        throw NSErrors.MailAttachmentParameterError;
    }
    return sendMail({subject, htmlBody, mailTo, mailFrom, pathAttachment});
};

/**
 * Ce service permet d'envoyer un mail a l'entreprise lorsqu'une commande est passé
 * Ainsi lorsqu'un client de l'entreprise commande, l'entreprise est informée de cette commande
 * @param {ObjectId} order_id l'id d'une commande
 * @param {string} lang langue du mail
 */
const sendMailOrderToCompany = async (order_id, lang = '') => {
    const order = await Orders.findOne({_id: order_id}).populate('customer.id items.id');
    if (!order) {
        throw NSErrors.OrderNotFound;
    }
    lang                                            = determineLanguage(lang, order.customer.id.preferredLanguage);
    const taxDisplay                                = order.priceTotal.paidTax ? 'ati' : 'et';
    const mailDatas                                 = await getMailDataByTypeAndLang('orderSuccessCompany', lang);
    const {subject, from, fromName, pathAttachment} = mailDatas;
    let {content}                                   = mailDatas;

    // Les informations de mailling sont enregistrées en BDD
    if (order.payment.length && order.payment[0].mode === 'CB' && order.status !== 'PAID' && order.status !== 'FINISHED') {
        throw NSErrors.OrderNotPaid;
    }
    const {line1, line2, zipcode, city, country, complementaryInfo, phone_mobile, companyName} = order.addresses.delivery;
    // Création a partir de la commande du détail des articles commandés (le tableau qui va s'afficher dans la mail)
    let templateItems  = '';
    const itemTemplate = content.match(new RegExp(/<!--startitems-->(.|\n)*?<!--enditems-->/, 'g'));
    if (itemTemplate && itemTemplate[0]) {
        const htmlItem = itemTemplate[0].replace('<!--startitems-->', '').replace('<!--enditems-->', '');
        for (const item of order.items) {
            const {translation} = item.id;

            const prdData = {
                '{{product.quantity}}'         : item.quantity,
                '{{product.name}}'             : translation[lang].name,
                '{{product.specialUnitPrice}}' : '',
                '{{product.bundleName}}'       : translation[lang].name,
                '{{product.unitPrice}}'        : (item.price.special && item.price.special[taxDisplay] ? item.price.special[taxDisplay] : item.price.unit[taxDisplay]).toFixed(2),
                '{{product.totalPrice}}'       : item.quantity * (item.price.special && item.price.special[taxDisplay] ? item.price.special[taxDisplay] : item.price.unit[taxDisplay]).toFixed(2),
                '{{product.basePrice}}'        : '',
                '{{product.descPromo}}'        : '',
                '{{product.descPromoT}}'       : '',
                '{{product.sumSpecialPrice}}'  : ''
            };

            /* if (item.price.special && item.price.special[taxDisplay]) {
                prdData['{{product.specialUnitPriceWithoutPromo}}'] = (item.price.unit[taxDisplay]).toFixed(2);
                prdData['{{product.specialUnitPriceWithPromo}}'] = getUnitPrice(item, order).toFixed(2);
                prdData['{{product.sumSpecialPriceWithoutPromo}}'] = (item.price.unit[taxDisplay] * item.quantity).toFixed(2);
                prdData['{{product.sumSpecialPriceWithPromo}}'] = (getUnitPrice(item, order) * item.quantity).toFixed(2);
            } */

            if (item.parent && translation[lang]) {
                prdData['{{product.bundleName}}'] = order.items.find((i) => i._id.toString() === item.parent.toString()).id.translation[lang].name;
            }
            let basePrice  = null;
            let descPromo  = '';
            let descPromoT = '';
            if (order.quantityBreaks && order.quantityBreaks.productsId.length) {
                // On check si le produit courant a recu une promo
                const prdPromoFound = order.quantityBreaks.productsId.find((productId) => productId.productId.toString() === item.id.id.toString());
                if (prdPromoFound) {
                    basePrice                         = prdPromoFound[`basePrice${taxDisplay.toUpperCase()}`];
                    descPromo                         = basePrice.toFixed(2);
                    descPromoT                        = (basePrice * item.quantity).toFixed(2);
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
        const _config = global.envConfig;
        if (!_config) {
            throw NSErrors.ConfigurationNotFound;
        }
        dateReceipt = moment(d).tz(_config.environment.websiteTimezone ? _config.environment.websiteTimezone : 'Europe/Paris').format('DD/MM/YYYY');
        hourReceipt = moment(d).tz(_config.environment.websiteTimezone ? _config.environment.websiteTimezone : 'Europe/Paris').format('HH:mm');
    }
    const datas = {
        '{{taxdisplay}}'                  : global.translate.common[taxDisplay][lang],
        '{{order.customer.company.name}}' : order.customer.company.name,
        '{{order.customer.fullname}}'     : order.customer.id.fullname,
        '{{order.customer.name}}'         : order.customer.id.fullname,
        '{{order.customer.firstname}}'    : order.customer.id.firstname,
        '{{order.customer.lastname}}'     : order.customer.id.lastname,
        '{{order.customer.mobilePhone}}'  : phone_mobile || order._doc.customer.id.addresses[0].phone_mobile,
        '{{order.number}}'                : order.number,
        '{{order.quantityBreaks}}'        : '',
        '{{order.dateReceipt}}'           : dateReceipt,
        '{{order.hourReceipt}}'           : hourReceipt,
        '{{order.priceTotalAti}}'         : order.priceTotal[taxDisplay].toFixed(2),
        '{{order.priceTotalEt}}'          : order.priceTotal[taxDisplay].toFixed(2),
        '{{order.delivery}}'              : order._doc.orderReceipt ? global.translate.common[order._doc.orderReceipt.method][lang] : global.translate.common.delivery[lang],
        '{{order.paymentMode}}'           : order._doc.payment[0].mode,
        '{{order.paymentDescription}}'    : order._doc.payment[0].description,
        '{{order.shipment}}'              : order._doc.delivery.name,
        '{{address.line1}}'               : line1 || '',
        '{{address.line2}}'               : line2 || '',
        '{{address.companyName}}'         : companyName || '',
        '{{address.complementaryInfo}}'   : complementaryInfo || '',
        '{{address.zipcode}}'             : zipcode || '',
        '{{address.city}}'                : city || '',
        '{{address.country}}'             : country || ''
    };

    if (order.quantityBreaks && order.quantityBreaks[`discount${taxDisplay.toUpperCase()}`]) {
        datas['{{order.quantityBreaks}}'] = order.quantityBreaks[`discount${taxDisplay.toUpperCase()}`];
    }

    if (order.promos && order.promos.length && (order.promos[0].productsId.length === 0)) {
        datas['{{order.promo.discount}}'] = order.promos[0][`discount${taxDisplay.toUpperCase()}`];
        datas['{{order.promo.code}}']     = order.promos[0].code;
    }
    const htmlBody = await generateHTML(content, datas);
    return sendMail({subject, htmlBody, mailTo: from, mailFrom: from, fromName, pathAttachment});
};

/**
 * Ce service permet d'envoyer un mail au client lorsqu'il passe une commande
 * @param {ObjectId} order_id l'id d'une commande
 * @param {string} lang langue du mail
 */
const sendMailOrderToClient = async (order_id, lang = '') => {
    // TODO remove this check
    // On verifie si le module billetterie-aquila n'existe en base de données ou qu'il n'est actif
    const moduleTicketing = await Modules.findOne({name: 'billetterie-aquila'});
    if (moduleTicketing && moduleTicketing.active) {
        return;
    }
    const order = await Orders.findOne({_id: order_id}).populate('customer.id items.id');
    if (!order) {
        throw NSErrors.OrderNotFound;
    }
    // Si une commande est payé en CB le status de la commande doit être a paid ou finished pour continuer
    if (order.payment.length && order.payment[0].mode === 'CB' && order.status !== 'PAID' && order.status !== 'FINISHED') {
        throw NSErrors.OrderNotPaid;
    }

    lang                                                                         = determineLanguage(lang, order.customer.id.preferredLanguage);
    const taxDisplay                                                             = order.priceTotal.paidTax ? 'ati' : 'et';
    const {line1, line2, zipcode, city, country, complementaryInfo, companyName} = order.addresses.delivery;

    let dateReceipt = '';
    let hourReceipt = '';
    if (order.orderReceipt && order.orderReceipt.date) {
        const d       = order.orderReceipt.date;
        const _config = global.envConfig;
        if (!_config) {
            throw NSErrors.ConfigurationNotFound;
        }
        dateReceipt = moment(d).tz(_config.environment.websiteTimezone ? _config.environment.websiteTimezone : 'Europe/Paris').format('DD/MM/YYYY');
        hourReceipt = moment(d).tz(_config.environment.websiteTimezone ? _config.environment.websiteTimezone : 'Europe/Paris').format('HH:mm');
    }
    const mailDatas = {
        '{{taxdisplay}}'                : global.translate.common[taxDisplay][lang],
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
        '{{order.delivery}}'            : order._doc.orderReceipt ? global.translate.common[order._doc.orderReceipt.method][lang] : global.translate.common.delivery[lang],
        '{{order.priceTotal}}'          : order.priceTotal[taxDisplay].toFixed(2)
    };

    if (order.quantityBreaks && order.quantityBreaks[`discount${taxDisplay.toUpperCase()}`]) {
        mailDatas['{{order.quantityBreaks}}'] = order.quantityBreaks[`discount${taxDisplay.toUpperCase()}`];
    }

    if (order.promos && order.promos.length && (order.promos[0].productsId.length === 0)) {
        mailDatas['{{order.promo.discount}}'] = order.promos[0][`discount${taxDisplay.toUpperCase()}`];
        mailDatas['{{order.promo.code}}']     = order.promos[0].code;
    }

    if (order.delivery && order.delivery.price && order.delivery.price[taxDisplay]) {
        mailDatas['{{order.delivery.price}}'] = order.delivery.price[taxDisplay].toFixed(2);
    }

    if (order.additionnalFees && order.additionnalFees[taxDisplay] && order.additionnalFees[taxDisplay] !== 0) {
        mailDatas['{{order.additionnalFees}}'] = order.additionnalFees[taxDisplay].toFixed(2);
    }

    let mailByType;
    // On va chercher la methode de paiement afin de récupérer isDeferred
    let paymentMethod;
    if (order.payment && order.payment[0] && order.payment[0].mode) {
        paymentMethod = await PaymentMethods.findOne({code: order.payment[0].mode.toLowerCase()});
    }
    if ((paymentMethod && paymentMethod.isDeferred === false) || order.status === 'PAID' || order.status === 'FINISHED') {
        // On envoie le mail de succès de commande au client
        mailByType = await getMailDataByTypeAndLang('orderSuccess', lang);
    } else {
        // On envoie le mail de succès de commande au client avec les instructions pour payer avec cheque ou virement
        mailByType = await getMailDataByTypeAndLang('orderSuccessDeferred', lang);
        if (paymentMethod) {
            mailDatas['{{payment.instruction}}'] = paymentMethod.translation[lang].instruction;
        }
    }

    const {subject, from, fromName, pathAttachment} = mailByType;
    let {content}                                   = mailByType;
    // Création a partir de la commande du détail des articles commandés (le tableau qui va s'afficher dans la mail)
    let templateItems  = '';
    const itemTemplate = content.match(new RegExp(/<!--startitems-->(.|\n)*?<!--enditems-->/, 'g'));
    if (itemTemplate && itemTemplate[0]) {
        const htmlItem = itemTemplate[0].replace('<!--startitems-->', '').replace('<!--enditems-->', '');
        for (const item of order.items) {
            const {translation} = item.id;
            const prdData       = {
                '{{product.quantity}}'         : item.quantity,
                '{{product.name}}'             : translation[lang].name,
                '{{product.specialUnitPrice}}' : '',
                '{{product.bundleName}}'       : translation[lang].name,
                '{{product.unitPrice}}'        : (item.price.special && item.price.special[taxDisplay] ? item.price.special[taxDisplay] : item.price.unit[taxDisplay]).toFixed(2),
                '{{product.totalPrice}}'       : item.quantity * (item.price.special && item.price.special[taxDisplay] ? item.price.special[taxDisplay] : item.price.unit[taxDisplay]).toFixed(2),
                '{{product.basePrice}}'        : '',
                '{{product.descPromo}}'        : '',
                '{{product.descPromoT}}'       : '',
                '{{product.sumSpecialPrice}}'  : ''
            };

            /* if (item.price.special && item.price.special[taxDisplay]) {
                prdData['{{product.specialUnitPriceWithoutPromo}}'] = (item.price.unit[taxDisplay]).toFixed(2);
                prdData['{{product.specialUnitPriceWithPromo}}'] = getUnitPrice(item, order).toFixed(2);
                prdData['{{product.sumSpecialPriceWithoutPromo}}'] = (item.price.unit[taxDisplay] * item.quantity).toFixed(2);
                prdData['{{product.sumSpecialPriceWithPromo}}'] = (getUnitPrice(item, order) * item.quantity).toFixed(2);
            } */

            if (item.parent && translation[lang]) {
                prdData['{{product.bundleName}}'] = order.items.find((i) => i._id.toString() === item.parent.toString()).id.translation[lang].name;
            }

            let basePrice  = null;
            let descPromo  = '';
            let descPromoT = '';
            if (order.quantityBreaks && order.quantityBreaks.productsId.length) {
                // On check si le produit courant a recu une promo
                const prdPromoFound = order.quantityBreaks.productsId.find((productId) => productId.productId.toString() === item.id.id.toString());
                if (prdPromoFound) {
                    basePrice                         = prdPromoFound[`basePrice${taxDisplay.toUpperCase()}`];
                    descPromo                         = basePrice.toFixed(2);
                    descPromoT                        = (basePrice * item.quantity).toFixed(2);
                    prdData['{{product.basePrice}}']  = basePrice;
                    prdData['{{product.descPromo}}']  = descPromo;
                    prdData['{{product.descPromoT}}'] = descPromoT;
                }
            }
            templateItems += await generateHTML(htmlItem, prdData);
        }
        content = content.replace(htmlItem, templateItems);
    }

    const htmlBody = await generateHTML(content, mailDatas);
    return sendMail({subject, htmlBody, mailTo: order.customer.email, mailFrom: from, fromName, pathAttachment});
};

/**
 * Ce service permet d'envoyer un mail au client lorsqu'il y a un changement de status de sa commande
 * @param {ObjectId} order_id l'id d'une commande
 * @param {string} lang langue du mail
 */
const sendMailOrderStatusEdit = async (order_id, lang = '') => {
    const _order = await Orders.findOne({_id: order_id}).populate('customer.id');
    if (!_order) {
        throw NSErrors.OrderNotFound;
    }
    lang = determineLanguage(lang, _order.customer.id.preferredLanguage);
    if (_order.status === 'PAID' || _order.status === 'FINISHED') {
        return sendMailOrderToClient(order_id, lang);
    }
    const {
        content,
        subject,
        from,
        fromName,
        pathAttachment
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
    return sendMail({subject, htmlBody, mailTo: _order.customer.email, mailFrom: from, fromName, pathAttachment});
};

/**
 * @description Permet d'envoyer un mail pour informer le client que ca commande a bien été envoyée
 * @param {guid} user_id - _id de l'utilisateur destinataire
 * @param {string} [lang] - langue du mail (Optionnel)
 */
const sendMailOrderSent = async (order_id, lang = '') => {
    require('../utils/utils').tmp_use_route('mails_service', 'sendMailOrderSent');
    const _config = global.envConfig;
    if (!_config) {
        throw NSErrors.ConfigurationNotFound;
    }
    const _order = await Orders.findOne({_id: order_id}).populate(['customer.id']);
    if (!_order) {
        throw NSErrors.OrderNotFound;
    }
    lang                                                     = determineLanguage(lang, _order.customer.id.preferredLanguage);
    const {content, subject, from, fromName, pathAttachment} = await getMailDataByTypeAndLang('orderSent', lang);
    // On format la date pour l'envoyer dans le mail ex: 1/5/2015 deviendra 01/05/2018
    const d                                      = new Date();
    let month                                    = (d.getMonth() + 1).toString();
    let day                                      = d.getDate().toString();
    month                                        = month.length > 1 ? month : `0${month}`;
    day                                          = day.length > 1 ? day : `0${day}`;
    const date                                   = `${day}/${month}/${d.getFullYear()}`;
    const {line1, line2, zipcode, city, country} = _order.addresses.delivery;
    let dateReceipt                              = '';
    let hourReceipt                              = '';
    if (_order.orderReceipt && _order.orderReceipt.date) {
        const d       = _order.orderReceipt.date;
        const _config = global.envConfig;
        if (!_config) {
            throw NSErrors.ConfigurationNotFound;
        }
        dateReceipt = moment(d).tz(_config.environment.websiteTimezone ? _config.environment.websiteTimezone : 'Europe/Paris').format('DD/MM/YYYY');
        hourReceipt = moment(d).tz(_config.environment.websiteTimezone ? _config.environment.websiteTimezone : 'Europe/Paris').format('HH:mm');
    }
    const htmlBody = generateHTML(content, {
        '{{date}}'        : date,
        '{{number}}'      : _order.number,
        '{{dateReceipt}}' : dateReceipt,
        '{{hourReceipt}}' : hourReceipt,
        '{{address}}'     : `${line1}${line2 ? ` ${line2}` : ''}, ${zipcode}, ${city}, ${country}`
    });
    return sendMail({subject, htmlBody, mailTo: _order.customer.email, mailFrom: from, fromName, pathAttachment});
};

/**
 * @description Envoi d'un email
 * @param {Object} mailinformation - information about the mail
 * @param {string} mailinformation.subject - Sujet du mail
 * @param {string} mailinformation.htmlBody - HTML du mail
 * @param {string} mailinformation.mailTo - Destinataire du mail
 * @param {string} [mailinformation.mailFrom=null] - Emeteur du mail (Optionnel)
 * @param {string} [mailinformation.pathAttachment=null] - Chemin du fichier a envoyer (Optionnel)
 * @param {string} [mailinformation.textBody=null] - Text du mail (si pas de lecteur html) (Optionnel)
 * @param {string} [mailinformation.fromName=null] - Nom de l'emeteur (Optionnel)
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
            mailIsSendmail,
            mailSecure,
            overrideSendTo,
            mailFromContact
        } = global.envConfig.environment;
        let {mailPass} = global.envConfig.environment;
        mailPass       = encryption.decipher(mailPass);

        // Vérifier qu'il n'y a pas de surcharge du destinataire dans la config
        if (overrideSendTo) {
            mailTo = overrideSendTo;
        }

        // Si on est en mode DEV, le destinataire est le dev, et non le "client"
        const devMode = global.envFile.devMode;
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

        if (attachments) {
            for (const file of attachments) {
                if (!mailOptions.attachments) {
                    mailOptions.attachments = [];
                }
                const data = await fs.readFile(path.resolve(utilsServer.getUploadDirectory(), file.path), {encoding: 'base64'});
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
 * @description Envoyer les informations d'un formulaire de contact par mail
 * @param {string} type - Type de mail
 * @param {string} to - Destinataire
 * @param {Object} datas - Objet du formulaire envoyé
 * @param {string} lang - Langue du sujet et du contenu
 */
const sendGeneric = async (type, to, datas, lang = '') => {
    lang            = ServiceLanguages.getDefaultLang(lang);
    const body      = {};
    const datasKeys = Object.keys(datas);

    const query = {type, [`translation.${lang}`]: {$exists: true}};
    const mail  = await Mail.findOne(query);
    if (!mail) {
        throw NSErrors.MailNotFound;
    }
    let subject = '';
    if (datas.subject) {
        subject = datas.subject;
    } else if (mail.translation[lang].subject) {
        subject = mail.translation[lang].subject;
    }
    const content      = mail.translation[lang].content ? mail.translation[lang].content : '';
    let pathAttachment = null;
    if (mail.translation[lang].attachments && mail.translation[lang].attachments.length > 0) {
        const _config = global.envConfig;
        if (!_config) {
            throw NSErrors.ConfigurationNotFound;
        }
        pathAttachment = _config.environment.appUrl + mail.translation[lang].attachments[0].path;
    }
    to = to || mail.from;

    for (let i = 0; i < datasKeys.length; i++) {
        body[`{{${datasKeys[i]}}}`] = datas[datasKeys[i]];
    }

    return sendMail({subject, htmlBody: generateHTML(content, body), mailTo: to, mailFrom: mail.from, fromName: mail.fromName, pathAttachment});
};

/**
 * @description Envoyer les informations d'un formulaire de contact par mail
 * @param {Object} datas - Objet du formulaire envoyé
 */
const sendContact = async (datas, lang = '') => {
    lang              = determineLanguage(lang, datas.lang);
    const query       = {type: 'contactMail', [`translation.${lang}`]: {$exists: true}};
    const contactMail = await Mail.findOne(query);

    if (!contactMail) {
        throw NSErrors.MailNotFound;
    }
    const content      = contactMail.translation[lang].content ? contactMail.translation[lang].content : '';
    const subject      = contactMail.translation[lang].subject ? contactMail.translation[lang].subject : '';
    let pathAttachment = null;
    if (contactMail.translation[lang].attachments && contactMail.translation[lang].attachments.length > 0) {
        pathAttachment = global.envConfig.environment.appUrl + contactMail.translation[lang].attachments[0].path;
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
    return sendMail({subject, htmlBody, mailTo: contactMail.from, mailFrom: contactMail.from, fromName: contactMail.fromName, pathAttachment});
};

/**
 * @description Generation du HTML depuis un template et ses données
 * @param {string} html template HTML récupéré de la collection mail
 * @param {object} [datas={}] Object contenant les datas à remplacer : {"variable_a_remplacer":"la_valeur", "var2":"value2"}
 */
const generateHTML = (html, datas = {}) => {
    if (!datas) datas = {};
    const {appUrl} = global.envConfig.environment;
    // Override appUrl
    datas['{{appUrl}}'] = appUrl;
    return replaceMultiple(html, datas);
};

/**
 * @description Determine the best language for the user
 * @param {string} lang lang
 * @param {string} preferredLanguage preferredLanguage
 */
function determineLanguage(lang, preferredLanguage) {
    if (lang == null || typeof lang === 'undefined' || lang === 'undefined') {
        lang = '';
    }
    if (lang === '' && typeof preferredLanguage !== 'undefined' && preferredLanguage !== '') lang = preferredLanguage;
    if (lang === '') lang = ServiceLanguages.getDefaultLang(lang);
    return lang;
}

/**
 * Permet de récupérer le prix unitaire du produit avec promo appliqué si necessaire
 * @param {*} item item pour lequel on calcul le prix unitaire
 * @returns {number} prix unitaire
 */
// eslint-disable-next-line no-unused-vars
function getUnitPrice(item, order) {
    const taxDisplay = order.priceTotal.paidTax ? 'ati' : 'et';
    let price        = item.price.unit[taxDisplay];
    if (item.price && item.price.special && item.price.special[taxDisplay] >= 0) {
        price = item.price.special[taxDisplay];
    }
    if (order.quantityBreaks && order.quantityBreaks.productsId && order.quantityBreaks.productsId.length) {
        const qtyBreakFound = order.quantityBreaks.productsId.find((prdId) => prdId.productId.toString() === item.id._id.toString());
        if (qtyBreakFound) {
            price -= qtyBreakFound[`discount${taxDisplay.toUpperCase()}`];
        }
    }
    return price;
}

async function sendMailOrderRequestCancel(_id, lang = '') {
    const _order = await Orders.findOne({_id}).populate('customer.id');
    if (!_order) {
        throw NSErrors.OrderNotFound;
    }
    lang           = determineLanguage(lang, _order.customer.id.preferredLanguage);
    const {
        content,
        subject,
        from,
        fromName,
        pathAttachment
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
    return sendMail({subject, htmlBody, mailTo: from, mailFrom: from, fromName, pathAttachment});
}

const sendError = async (error) => {
    const errorMail = await Mail.findOne({type: 'error'});

    if (!errorMail) {
        return; // We don't want to generate an error
    }

    const lang     = determineLanguage();
    const content  = errorMail.translation[lang].content ? errorMail.translation[lang].content : '';
    const subject  = errorMail.translation[lang].subject ? errorMail.translation[lang].subject : 'Error';
    const htmlBody = content + JSON.stringify(error);
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
    sendMailTestConfig,
    removePdf,
    sendMailTest,
    sendMailActivationAccount,
    sendRegister,
    sendRegisterForAdmin,
    sendResetPassword,
    sendPDFAttachmentToClient,
    sendMailOrderToCompany,
    sendMailOrderToClient,
    sendMailOrderStatusEdit,
    sendMailOrderSent,
    sendMail,
    sendGeneric,
    sendContact,
    sendMailOrderRequestCancel,
    sendError
};