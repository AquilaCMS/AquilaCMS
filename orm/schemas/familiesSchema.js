const mongoose = require('mongoose');
const helper   = require('../../utils/utils');
const Schema   = mongoose.Schema;
const ObjectId = Schema.ObjectId;

const FamiliesSchema = new Schema({
    code      : {type: String, required: true, unique: true},
    name      : {type: String, required: true},
    type      : {type: String, required: true, enum: ['universe', 'family', 'subfamily']},
    ancestors : [{code: String, slug: String}],
    slug      : {type: String, unique: true},
    parent    : {type: ObjectId, ref: 'families'}, // Servira dans un futur plus ou moins proche
    children  : [{type: ObjectId, ref: 'families'}],
    details   : {}
}, {timestamps: true});

// FamiliesSchema.plugin(autoIncrement.plugin, { model: 'families', field: 'id' });

FamiliesSchema.pre('save', function (next) {
    if (!this.slug) this.slug = `${helper.slugify(this.name)}-${this.code}`;
    return next();
});

/*
FamiliesSchema.post('save', function () {
  helper.create_ancestors(this._id, this.parent);
});
*/

// Add menu in a family, and add this menu to all products assigned to this universe
// familyCode : families.code
// slugMenu : menus.slug
FamiliesSchema.statics.addMenuInUniverse = async function ( familyCode, slugMenu ) {
    const {Products} = require('../models');

    // Add menu in family
    const f = await this.findOne({code: familyCode});
    if ( f.menus === undefined) f.menus = [];
    if ( f.menus.indexOf(slugMenu) === -1) {
        f.menus.push(slugMenu);
        await f.save();
    }

    // Add menu in products assigned to this universe
    const productList = await Products.find({'whatami._universe_code': familyCode});
    productList.forEach(async (product) => {
        if ( product.slugMenus === undefined) product.slugMenus = [];
        if ( product.slugMenus.indexOf(slugMenu) === -1) {
            product.slugMenus.push(slugMenu);
            await product.save();
        }
    });
};

// Remove menu from a family, and remove this menu from all products assigned to this universe
// familyCode : families.code
// slugMenu : menus.slug
FamiliesSchema.statics.removeMenuFromUniverse = async function (familyCode, slugMenu) {
    const {Products} = require('../models');

    // Remove menu from family
    const f           = await this.findOne({code: familyCode});
    const indexOfSlug = f.menus.indexOf(slugMenu);
    if ( f.menus !== undefined && (indexOfSlug > -1) ) {
        console.log(`removing ${slugMenu} from family ${familyCode}`);
        f.menus.splice(indexOfSlug, 1);
        await f.save();
    }

    // Remove menu from products assigned to this universe
    const productList = await Products.find({'whatami._universe_code': familyCode});
    productList.forEach(async (p) => {
        const prodIndexSlug = p.slugMenus.indexOf(slugMenu);
        if ( prodIndexSlug > -1) {
            p.slugMenus.splice(prodIndexSlug, 1);
            await p.save();
        }
    });
};

module.exports = FamiliesSchema;