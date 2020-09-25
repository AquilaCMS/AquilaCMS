const mongoose = require('mongoose');
const Schema   = mongoose.Schema;

/**
 * @typedef {object} SequencesSchema
 * @property {string} name.required
 * @property {number} seq.required default:0
 */
const SequencesSchema = new Schema({
    name : {type: String, required: true, unique: true},
    seq  : {type: Number, required: true, default: 0}
});

SequencesSchema.statics.getNextSequence = function (name, cb) {
    this.findOneAndUpdate(
        {name},
        {$inc: {seq: 1}},
        {upsert: true, new: true},
        cb
    );
};

module.exports = SequencesSchema;