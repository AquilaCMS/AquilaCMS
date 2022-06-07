/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2022 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const mongoose = require('mongoose');
const NSErrors = require('./errors/NSErrors');

class PostBodyCheck {
    /**
     * Constructor of PostBodyCheck
     * @param {Object} [filter={}] filter
     * @param {number} [limit=1] limit of element to get
     * @param {string[]} [populate=[]] fields to populate
     * @param {number} [skip=0] position to start the query
     * @param {Object} [sort={}] fields to order by
     * @param {Object} [structure={}] structure
     * @param {number} [page=null] page
     */
    constructor(filter = {}, limit = 1, populate = [], skip = 0, sort = {}, structure = {}, page = null) {
        this.filter    = filter;
        this.limit     = limit;
        this.populate  = populate;
        this.skip      = skip;
        this.sort      = sort;
        this.structure = structure;
        this.page      = page;
    }
}

module.exports = class QueryBuilder {
    /**
     * constructor
     * @param {mongoose.Model} model model
     * @param {string[]} [restrictedFields=[]] restrictedFields
     * @param {string[]} [defaultFields=[]] defaultFields
     */
    constructor(model, restrictedFields = [], defaultFields = []) {
        this.model = model;
        // Default projections
        this.defaultFields = defaultFields;
        // operator never to be used in the filter
        this.restrictedOperators = ['$where'];
        // fields never to be returned to the client unless admin
        this.restrictedFields = restrictedFields;
    }

    /**
     * Allows you to return a valid PostBody object
     *
     * @typedef {object} PostBody
     * @property {object} [PostBody.filter=] filter
     * @property {object} [PostBody.structure=] structure
     * @property {object} [PostBody.populate=] populate
     * @property {object} [PostBody.sort=] sort
     * @property {number} [PostBody.limit=] limit
     * @property {number} [PostBody.skip=] skip
     *
     * @param {PostBody} PostBody, PostBody object
     * @param {"find" | "findOne" | "findById"} [request=find], le type de requete : (find, findOne, findById)
     */
    verifyPostBody(PostBody, request = 'find') {
        if (PostBody && PostBody.PostBody) { // Fix postbody pas au bon niveau
            PostBody = PostBody.PostBody;    // P2 : How is it that there is a PostBody in a PostBody ?!
        }

        if (request === 'find') {
            const postBodyChecked = new PostBodyCheck(PostBody.filter, PostBody.limit, PostBody.populate, PostBody.skip, PostBody.sort, PostBody.structure, PostBody.page);
            if (this.containRestrictedLabels(postBodyChecked.filter)) throw NSErrors.OperatorRestricted;
            // Allows you to create a pagination
            if (postBodyChecked.page && Number.isInteger(Number(postBodyChecked.page))) {
                postBodyChecked.page = Number(postBodyChecked.page);
                if (postBodyChecked.page < 1) postBodyChecked.page = 1;
                postBodyChecked.skip = (postBodyChecked.page - 1) * postBodyChecked.limit;
            }
            return postBodyChecked;
        } if (request === 'findOne') {
            return PostBody ? new PostBodyCheck(PostBody.filter, 1, PostBody.populate, 0, {}, PostBody.structure) : new PostBodyCheck();
        } if (request === 'findById') {
            return PostBody ? new PostBodyCheck({}, 1, PostBody.populate, 0, {}, PostBody.structure) : new PostBodyCheck();
        }
    }

    /**
     * Function that will build, verify and launch the request
     * @typedef {object} PostBody
     * @property {object} [PostBody.filter] filter
     * @property {object} [PostBody.structure] structure
     * @property {object} [PostBody.populate] populate
     * @property {object} [PostBody.sort] sort
     * @property {number} [PostBody.limit] limit
     * @property {number} [PostBody.skip] skip
     *
     * @param {PostBody} PostBody is the object describing the request to be performed by the find
     * @param {boolean} [lean=false] transform a mongoose object to object
     * @param {string} [header_authorization=null] header_authorization
     * @return {{datas: [] | [mongoose.Model<this>], count: number}} returns datas found and total of element
     */
    async find(PostBody, lean = false, isAdmin = false) {
        if (!PostBody) throw NSErrors.PostBodyUndefined;
        const postBodyChecked                                  = this.verifyPostBody(PostBody);
        const {limit, skip, filter, populate, sort, structure} = postBodyChecked;

        const addStructure   = this.addToStructure(structure, sort);
        const [count, datas] = await Promise.all([
            this.model.countDocuments(filter),
            this.model.find(filter, addStructure)
                .lean(!!lean)
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .populate(populate)
        ]);
        await this.removeFromStructure(structure, datas, isAdmin);
        return {datas, count};
    }

    /**
     * Function that will build, verify and launch the request
     * @typedef {object} PostBody
     * @property {object} [PostBody.filter=] filter
     * @property {object} [PostBody.structure=] structure
     * @property {object} [PostBody.populate=] populate
     * @property {object} [PostBody.sort=] sort
     * @property {number} [PostBody.limit=] limit
     * @property {number} [PostBody.skip=] skip
     *
     * @param {PostBody} PostBody is the object describing the request to be performed by the find
     * @param {boolean} [lean=false] transform a mongoose object to object
     * @param {string} [isAdmin=false] header_authorization
     * @return {object|mongoose.Model<this>} returns datas found and total of element
     */
    async findOne(PostBody = null, lean = false, isAdmin = false) {
        if (!PostBody) throw NSErrors.PostBodyUndefined;
        // creating a PostBody object with default values
        const postBodyCheck                 = this.verifyPostBody(PostBody, 'findOne');
        const {filter, populate, structure} = postBodyCheck;
        if (this.containRestrictedLabels(filter)) throw NSErrors.OperatorRestricted;
        const addStructure = this.addToStructure(structure);
        let datas;
        if (lean) {
            datas = await this.model.findOne(filter, addStructure).lean().populate(populate);
        } else {
            datas = await this.model.findOne(filter, addStructure).populate(populate);
        }
        await this.removeFromStructure(structure, datas, isAdmin);
        return datas;
    }

    /**
     * Function that will build, verify and launch the request
     * @typedef {object} PostBody
     * @property {object} [PostBody.filter=] filter
     * @property {object} [PostBody.structure=] structure
     * @property {object} [PostBody.populate=] populate
     * @property {object} [PostBody.sort=] sort
     * @property {number} [PostBody.limit=] limit
     * @property {number} [PostBody.skip=] skip
     *
     * @param {PostBody} PostBody is the object describing the request to be performed by the find
     * @param {boolean} [lean=false] transform a mongoose object to object
     * @param {boolean} [isAdmin=false] header_authorization
     * @return {object|mongoose.Model<this>} returns datas found and total of element
     */
    async findById(id, PostBody = null, isAdmin = false) {
        // creating a PostBody object with default values
        const postBodyCheck         = this.verifyPostBody(PostBody, 'findById');
        const {populate, structure} = postBodyCheck;
        if (!mongoose.Types.ObjectId.isValid(id)) throw NSErrors.InvalidObjectIdError;
        const addStructure = this.addToStructure(structure);
        const datas        = await this.model.findById(id, addStructure).populate(populate);
        await this.removeFromStructure(structure, datas, isAdmin);
        return datas;
    }

    /**
     * This function adds the default fields to the object structure of the queryBuilder
     * @param {*} structure sent to the queryBuilder
     */
    addToStructure(structure, sort = null) {
        const structureAdd = [];
        // If the structure [0] === "*" then we return all the fields
        if ((this.defaultFields && this.defaultFields[0] === '*') || structure === '*') {
            if (sort) {
                Object.entries(sort).forEach(([key, value]) => {
                    if (typeof sort[key] === 'object' && sort[key].$meta) structureAdd.push({[key]: value});
                });
                const defaultProjection = [...this.defaultFields, ...structureAdd];
                const oProjection       = {};
                // We create the oProjection object which will contain the fields to display
                defaultProjection.forEach((struct) =>  {
                    if (typeof struct === 'object') {
                        // exemple : struct == {"score": {"$meta": "textScore"}} in the projection
                        const key        = Object.keys(struct)[0];
                        oProjection[key] = struct[key];
                    }
                });
                return oProjection;
            }
            return  {};
        }
        Object.entries(structure).forEach(([key, value]) => {
            if (!this.restrictedFields.includes(key)) {
                if (value === 1) structureAdd.push(key);
                else if (typeof structure[key] === 'object' && structure[key].$meta) structureAdd.push({[key]: value});
            }
        });
        const defaultProjection = [...this.defaultFields, ...structureAdd];
        const oProjection       = {};
        // We create the oProjection object which will contain the fields to display
        defaultProjection.forEach((struct) =>  {
            if (typeof struct === 'object') {
                // exemple : struct == {"score": {"$meta": "textScore"}} in the projection
                const key        = Object.keys(struct)[0];
                oProjection[key] = struct[key];
            } else oProjection[struct] = 1;
        });
        return oProjection;
    }

    /**
     * We delete the fields
     * @param {*} structure
     * @param {*} datas
     * @param isAdmin
     */
    async removeFromStructure(structure, datas, isAdmin = false) {
        if (!datas || datas.length === 0 || isAdmin || structure === '*') return;
        const structureRemove = [...this.restrictedFields];
        Object.entries(structure)
            .forEach(([key, value]) => {
                if (!this.restrictedFields.includes(key) && value === 0) structureRemove.push(key);
            });
        if (datas.length) {
            for (let i = 0; i < datas.length; i++) {
                // TODO P6: dynamically manage the deletion of dot notation fields (several levels)
                Object.values(structureRemove)
                    .forEach((key) => {
                        const arr = key.split('.');
                        if (arr.length > 1) {
                            if (datas[i]._doc && datas[i]._doc[arr[0]]) {
                                if (arr.length === 2) {
                                    delete datas[i]._doc[arr[0]][arr[1]];
                                } else if (arr.length === 3) {
                                    delete datas[i]._doc[arr[0]][arr[1]][arr[2]];
                                }
                            } else if (datas[i][arr[0]]) {
                                if (arr.length === 2) {
                                    delete datas[i][arr[0]][arr[1]];
                                } else if (arr.length === 3) {
                                    delete datas[i][arr[0]][arr[1]][arr[2]];
                                }
                            }
                        } else {
                            if (datas[i]._doc) {
                                delete datas[i]._doc[key];
                            } else {
                                delete datas[i][key];
                            }
                        }
                    });
            }
        } else {
            Object.values(structureRemove)
                .forEach((key) => {
                    const arr = key.split('.');
                    if (arr.length > 1) {
                        if (datas._doc && datas._doc[arr[0]]) {
                            if (arr.length === 2) {
                                delete datas._doc[arr[0]][arr[1]];
                            } else if (arr.length === 3) {
                                delete datas._doc[arr[0]][arr[1]][arr[2]];
                            }
                        } else if (datas[arr[0]]) {
                            if (arr.length === 2) {
                                delete datas[arr[0]][arr[1]];
                            } else if (arr.length === 3) {
                                delete datas[arr[0]][arr[1]][arr[2]];
                            }
                        }
                    } else {
                        if (datas._doc) {
                            delete datas._doc[key];
                        } else {
                            delete datas[key];
                        }
                    }
                });
        }
        return datas;
    }

    /**
     * Function allowing to check the fields of the "oFilter" object
     * @param {Object} oFilter => object to pass in find, fields will be checked by restrictedOperators
     */
    containRestrictedLabels(oFilter) {
        for (const field in oFilter) {
            // If the field is a primitive
            if (oFilter[field] !== Object(oFilter[field])) {
                if (this.restrictedOperators.includes(field)) return true;
            } else if (Array.isArray(oFilter[field])) {
                // see what can be done in mongodb with an array
            } else if (oFilter[field] instanceof Object) {
                if (this.containRestrictedLabels(oFilter[field], this.restrictedOperators)) {
                    return true;
                }
                // see what can be done in mongodb with an object
            }
        }
        return false;
    }
};
