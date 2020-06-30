const mongoose = require('mongoose');
const Schema   = mongoose.Schema;
const ObjectId = Schema.ObjectId;

const TerritorySchema = new Schema({
    translation : {},
    code        : {type: String, required: true, index: true},
    type        : {type: String, enum: ["country", "district", "department", "city"]},
    taxeFree    : Boolean,
    children    : [{type: ObjectId, ref: "territory"}]
});

TerritorySchema.index({code: 1, name: 1}, {unique: true});
TerritorySchema.index({name: 1, type: 1});
TerritorySchema.index({code: 1, type: 1});

module.exports = TerritorySchema;