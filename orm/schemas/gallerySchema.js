/**
 * @typedef {object} GallerySchema
 * @property {string} code.required
 * @property {number} initItemNumber.required default:6
 * @property {number} maxColumnNumber.required default:3
 * @property {array<GallerySchemaItems>} items
 */
/**
 * @typedef {object} GallerySchemaItems
 * @property {string} _itemId ObjectId
 * @property {string} src default:
 * @property {string} srcset
 * @property {string} sizes
 * @property {string} content default:
 * @property {string} alt default:
 * @property {number} order default:0
 * @property {string} extension default:.jpg
 */

const mongoose = require('mongoose');
const Schema   = mongoose.Schema;
/**
 * schema d'une gallerie photo et/ou video
 */
const GallerySchema = new Schema({
    code            : {type: String, required: true, unique: true},
    initItemNumber  : {type: Number, default: 6, required: true},
    maxColumnNumber : {type: Number, default: 3, required: true},
    items           : [{
        _itemId   : Schema.Types.ObjectId,
        src       : {type: String, trim: true, default: ''},
        srcset    : [{type: String, trim: true}],
        sizes     : [{type: String, trim: true}],
        content   : {type: String, trim: true, default: ''}, // IDyoutube
        alt       : {type: String, default: ''},
        order     : {type: Number, default: 0},
        extension : {type: String, default: '.jpg'}
    }]
}, {timestamps: true});

module.exports = GallerySchema;