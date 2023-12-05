/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const {fs}              = require('aql-utils');
const {News, Languages} = require('../orm/models');
const QueryBuilder      = require('../utils/QueryBuilder');
const NSErrors          = require('../utils/errors/NSErrors');

const restrictedFields = [];
const defaultFields    = ['*'];
const queryBuilder     = new QueryBuilder(News, restrictedFields, defaultFields);

const getNews = async (PostBody) => queryBuilder.find(PostBody, true);

const getNew = async (PostBody) => queryBuilder.findOne(PostBody, true);

const getNewsTags = async (query, lang) => {
    if (!lang) {
        lang = await Languages.findOne({defaultLanguage: true});
    }
    let tags                                         = [];
    const mongoMatch                                 = {$match: {}};
    const mongoProject                               = {$project: {_id: 0}};
    const nestedField                                = `translation.${lang}.tags`;
    mongoMatch.$match[nestedField]                   = {$regex: query};
    mongoProject.$project[nestedField]               = {
        $filter : {
            input : '',
            as    : 'tag',
            cond  : {
                $regexMatch : {
                    input   : '$$tag',
                    regex   : query,
                    options : 'i'
                }
            }
        }
    };
    mongoProject.$project[nestedField].$filter.input = `$${nestedField}`;
    const result                                     = await News.aggregate([mongoMatch, mongoProject]);
    if (!result) throw NSErrors.NotFound;
    result.forEach((ele) => tags = [...tags, ...ele.translation[lang].tags]); // create array of every tag that appeared in result
    return tags.filter((obj, pos, arr) => arr.map((mapObj) => mapObj).indexOf(obj) === pos); // make each tag appear once
};

const saveNew = async (_new) => {
    if (!_new) throw NSErrors.UnprocessableEntity;
    if (_new._id) {
        return News.findOneAndUpdate({_id: _new._id}, {$set: _new});
    }
    return News.create(_new);
};

const deleteImage = async (_old) => {
    const path = require('path');

    if (!_old) throw NSErrors.UnprocessableEntity;
    const imgPath = path.resolve(require('../utils/server').getUploadDirectory(), _old);
    await fs.unlink(imgPath);
};
const deleteNew = async (_id) => {
    if (!_id) throw NSErrors.UnprocessableEntity;
    const result = await News.deleteOne({_id});
    return result.ok === 1;
};

module.exports = {
    getNews,
    getNew,
    getNewsTags,
    saveNew,
    deleteNew,
    deleteImage
};