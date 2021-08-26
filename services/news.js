/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const {News}       = require('../orm/models');
const QueryBuilder = require('../utils/QueryBuilder');
const NSErrors     = require('../utils/errors/NSErrors');

const restrictedFields = [];
const defaultFields    = ['*'];
const queryBuilder     = new QueryBuilder(News, restrictedFields, defaultFields);

const getNews = async (PostBody) => queryBuilder.find(PostBody);

const getNew = async (PostBody) => queryBuilder.findOne(PostBody);

const getNewsCategories = async (query, lang) => {
    let categories                                   = [];
    const mongoMatch                                 = {$match: {}};
    const mongoProject                               = {$project: {_id: 0}};
    const nestedField                                = `translation.${lang}.categories`;
    mongoMatch.$match[nestedField]                   = {$regex: query};
    mongoProject.$project[nestedField]               = {
        $filter : {
            input : '',
            as    : 'category',
            cond  : {
                $regexMatch : {
                    input   : '$$category',
                    regex   : query,
                    options : 'i'
                }
            }
        }
    };
    mongoProject.$project[nestedField].$filter.input = `$${nestedField}`;
    const result                                     = await News.aggregate([mongoMatch, mongoProject]);
    if (!result) throw NSErrors.NotFound;
    result.forEach((ele) => categories = [...categories, ...ele.translation[lang].categories]); // create array of every category that appeared in result
    return categories.filter((obj, pos, arr) => arr.map((mapObj) => mapObj).indexOf(obj) === pos); // make each category appear once
};

const saveNew = async (_new) => {
    if (!_new) throw NSErrors.UnprocessableEntity;
    if (_new._id) {
        return News.findOneAndUpdate({_id: _new._id}, _new);
    }
    return News.create(_new);
};

const deleteNew = async (_id) => {
    if (!_id) throw NSErrors.UnprocessableEntity;
    const result = await News.deleteOne({_id});
    return result.ok === 1;
};

module.exports = {
    getNews,
    getNew,
    getNewsCategories,
    saveNew,
    deleteNew
};