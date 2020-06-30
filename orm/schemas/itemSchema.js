const mongoose     = require('mongoose');
const aquilaEvents = require("../../utils/aquilaEvents");
const Schema       = mongoose.Schema;
const ObjectId     = Schema.ObjectId;

const itemsSchema = new Schema({
    id     : {type: ObjectId, ref: "products", required: true},
    status : {type : String,
        enum : [
            "PROCESSING",
            "DELIVERY_PROGRESS",
            "DELIVERY_PARTIAL_PROGRESS",
            "RETURNED",
            "RETURNED_PARTIAL"
        ],
        default : "PROCESSING"
    },
    name               : String,
    code               : String,
    image              : String,
    parent             : {type: ObjectId, ref: "products"},
    children           : [{type: ObjectId, ref: "products"}],
    quantity           : {type: Number, required: true},
    weight             : {type: Number, default: 0},
    noRecalculatePrice : {type: Boolean, default: false},
    price              : {
        vat : {
            rate : {type: Number, required: true}
        },
        unit : {
            et  : {type: Number, required: true},
            ati : {type: Number, required: true},
            vat : {type: Number}
        },
        special : {
            et  : {type: Number},
            ati : {type: Number},
            vat : {type: Number}
        }
    },
    atts : [],
    opts : []
}, {discriminatorKey: "type"});

itemsSchema.set("toJSON", {virtuals: true});
itemsSchema.set("toObject", {virtuals: true});

itemsSchema.virtual("price.total").get(function () {
    const self = this;
    // const isChildKart = self.name && self.name.indexOf("enfant") > -1;
    let price = self.price.unit.ati;

    if (self.price.special && self.price.special.ati !== undefined) {
        price = self.price.special.ati;
    }

    return {ati: price * self.quantity};
});

// Par défaut, le populate spécifique ne fait rien
itemsSchema.methods.populateItem = function () {
    return Promise.resolve();
};

aquilaEvents.emit('itemSchemaInit', itemsSchema);
module.exports = itemsSchema;