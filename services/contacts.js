const {Contacts}   = require('../orm/models');
const ServiceMail  = require('./mail');
const QueryBuilder = require('../utils/QueryBuilder');
const queryBuilder = new QueryBuilder(Contacts, [], []);

const getContacts = async (body) => {
    return queryBuilder.find(body.PostBody);
};

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
        await Contacts.update({_id}, {data: body});
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
    setContact
};