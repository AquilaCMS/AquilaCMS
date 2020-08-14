const QueryBuilder     = require('../utils/QueryBuilder');
const {Newsletters} = require('../orm/models');
const restrictedFields = [];
const defaultFields    = [];
const queryBuilder     = new QueryBuilder(Newsletters, restrictedFields, defaultFields);

exports.getNewsletters = async function (PostBody) {
    return queryBuilder.find(PostBody);
};

exports.getNewsletter = async function (PostBody) {
    return queryBuilder.findOne(PostBody);
};

exports.getDistinctNewsletters = async function (PostBody) {
    const newsletterNames = await Newsletters.find(PostBody.filter).distinct('segment.name');
    const newsletterNamesCount = newsletterNames.length;
    const newsCount = [];
    const datas = newsletterNames.sort((a, b) => (PostBody.sort.reverse ? b - a : a - b)).slice((PostBody.page - 1) * PostBody.limit, PostBody.limit);

    for (const element of datas) {
        const a = await queryBuilder.find({PostBody : {filter: {'segment.name': element}}
        });
        newsCount.push({name: element, count: a.count});
    }
    return {datas: newsCount, count: newsletterNamesCount};
};

exports.getNewsletterByEmail = async function (email) {
    return Newsletters.findOne({email});
};

/**
 * params :
 * "isNew": true, // Si c'est une nouvelle inscription à un nouveau segment
 * "name": "test", // Nom du segment
 * "optin": true // true pour inscription, false pour désinscription
 */
exports.setStatusNewsletterByEmail = async function (email, params) {
    // segment sera vide si aucun objet ne correspond a la projection
    // au plus il ne pourra y avoir qu'un seul element retourné avec cette projection
    // (même si segment[i].name est présent plusieurs fois dans ce segment)
    const oNewsletter = await Newsletters.findOne(
        {email, 'segment.name': params.name},
        {email: 1, segment: {$elemMatch: {name: params.name}}}
    );
    // Aucun segment correspondant a la requete ci-dessus n'existe
    if (!oNewsletter || !oNewsletter.segment.length) {
        const update = {name: params.name, optin: true, date_subscribe: new Date()};
        return Newsletters.findOneAndUpdate({email}, {$push: {segment: update}}, {new: true, upsert: true});
    }
    const update = {
        'segment.$.name'             : params.name,
        'segment.$.optin'            : params.optin,
        'segment.$.date_unsubscribe' : params.optin ? null : new Date() // En cas de optin false alors l'utilisateur se désinscrit
    };
    return Newsletters.findOneAndUpdate({email, 'segment.name': params.name}, {$set: update}, {new: true});
};
