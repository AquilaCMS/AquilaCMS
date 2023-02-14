/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const mongoose                = require('mongoose');
const {slugify, aquilaEvents} = require('aql-utils');
const utilsDatabase           = require('../../utils/database');
const Schema                  = mongoose.Schema;
const {ObjectId}              = Schema.Types;

const FamiliesSchema = new Schema({
    code      : {type: String, required: true, unique: true},
    name      : {type: String, required: true},
    type      : {type: String, required: true, enum: ['universe', 'family', 'subfamily']},
    ancestors : [{code: String, slug: String}],
    slug      : {type: String, unique: true},
    parent    : {type: ObjectId, ref: 'families'}, // Servira dans un futur plus ou moins proche
    children  : [{type: ObjectId, ref: 'families'}],
    details   : {},
    order     : {type: Number}
}, {
    timestamps : true,
    id         : false
});

FamiliesSchema.pre('save', async function (next) {
    if (!this.slug) this.slug = `${slugify(this.name)}-${this.code}`;
    await utilsDatabase.preUpdates(this, next, FamiliesSchema);
});

FamiliesSchema.pre('findOneAndDelete', async function (next) {
    const {Families, Products} = require('../models');
    await Families.updateOne({children: this._conditions._id}, {$pull: {children: this._conditions._id}});
    const family = await Families.findOne({_id: this._conditions._id});
    for (const child of family.children) {
        await Families.findOneAndDelete({_id: child.toString()});
    }
    const where  = {};
    const action = {};
    if (family.type === 'universe') {
        where.universe = family.slug;
        action.$unset  = {universe: '', family: '', subfamily: ''};
    } else if (family.type === 'family') {
        where.family  = family.slug;
        action.$unset = {family: '', subfamily: ''};
    } else {
        where.subfamily = family.slug;
        action.$unset   = {subfamily: ''};
    }
    await Products.updateMany(where, action);
    return next();
});

// Add menu in a family, and add this menu to all products assigned to this universe
// familyCode : families.code
// slugMenu : menus.slug
FamiliesSchema.statics.addMenuInUniverse = async function ( familyCode, slugMenu ) {
    // Add menu in family
    const f = await this.findOne({code: familyCode});
    if ( f.menus === undefined) f.menus = [];
    if ( f.menus.indexOf(slugMenu) === -1) {
        f.menus.push(slugMenu);
        await f.save();
    }
};

// Remove menu from a family, and remove this menu from all products assigned to this universe
// familyCode : families.code
// slugMenu : menus.slug
FamiliesSchema.statics.removeMenuFromUniverse = async function (familyCode, slugMenu) {
    // Remove menu from family
    const f           = await this.findOne({code: familyCode});
    const indexOfSlug = f.menus.indexOf(slugMenu);
    if ( f.menus !== undefined && (indexOfSlug > -1) ) {
        console.log(`removing ${slugMenu} from family ${familyCode}`);
        f.menus.splice(indexOfSlug, 1);
        await f.save();
    }
};

FamiliesSchema.statics.checkCode = async function (that) {
    await utilsDatabase.checkCode('families', that._id, that.code);
};

FamiliesSchema.pre('updateOne', async function (next) {
    await utilsDatabase.preUpdates(this, next, FamiliesSchema);
});

FamiliesSchema.pre('findOneAndUpdate', async function (next) {
    await utilsDatabase.preUpdates(this, next, FamiliesSchema);
});

aquilaEvents.emit('familiesSchemaInit', FamiliesSchema);

module.exports = FamiliesSchema;