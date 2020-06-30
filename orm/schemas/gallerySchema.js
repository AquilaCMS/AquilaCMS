/**
 * @typedef Gallery
 * @property {String} code.required
 * @property {Number} initItemNumber.required eg: 6
 * @property {Number} maxColumnNumber.required eg: 3
 * @property {Array.<Object>} items
 * @property {ObjectId} items._itemId
 * @property {String} src eg: ""
 * @property {String} srcset
 * @property {String} sizes
 * @property {String} content eg: ""
 * @property {String} alt eg: ""
 * @property {Number} order eg: 0
 * @property {String} extension eg: .jpg
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
        src       : {type: String, trim: true, default: ""},
        srcset    : [{type: String, trim: true}],
        sizes     : [{type: String, trim: true}],
        content   : {type: String, trim: true, default: ""}, // IDyoutube
        alt       : {type: String, default: ""},
        order     : {type: Number, default: 0},
        extension : {type: String, default: ".jpg"}
    }]
}, {timestamps: true});

module.exports = GallerySchema;