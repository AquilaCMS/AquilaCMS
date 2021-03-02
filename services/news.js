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
const utilsDatabase    = require('../utils/database');
const queryBuilder     = new QueryBuilder(News, restrictedFields, defaultFields);

const getNews = async (PostBody) => {
    return queryBuilder.find(PostBody);
};

const getNew = async (PostBody) => {
    return queryBuilder.findOne(PostBody);
};

const saveNew = async (_new) => {
    await utilsDatabase.checkSlugExist(_new, News);
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
    saveNew,
    deleteNew
};