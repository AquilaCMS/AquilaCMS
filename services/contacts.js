/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2022 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const {Contacts}   = require('../orm/models');
const ServiceMail  = require('./mail');
const QueryBuilder = require('../utils/QueryBuilder');
const queryBuilder = new QueryBuilder(Contacts, [], []);

const getContacts = async (body) => queryBuilder.find(body.PostBody, true);

const deleteContact = async (id) => Contacts.deleteOne({_id: id});

const setContact = async (body, mode) => {
    if (body === undefined) {
        throw new Error('Invalid contact in body');
    } else if (mode === undefined) {
        throw new Error('No mode selected');
    }
    let res = {};
    switch (mode) {
    case 'store':
        res = await storeContact(body, body._id);
        break;
    case 'store+send':
        res = await storeContact(body, body._id);
        await sendContact(body);
        break;
    case 'send':
    default:
        await sendContact(body);
        break;
    }
    return res;
};

async function storeContact(body, _id = undefined) {
    if (_id) {
        delete body._id;
        await Contacts.updateOne({_id}, {$set: {data: body}});
        return body;
    }
    const result = await Contacts.create({data: body});
    return result;
}

async function sendContact(body) {
    const _body = JSON.parse(JSON.stringify(body));
    try {
        await ServiceMail.sendContact(_body);
    } catch (err) {
        console.error(err);
    }
    return 'ok';
}

module.exports = {
    getContacts,
    setContact,
    deleteContact
};