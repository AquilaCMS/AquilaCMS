const mongoose = require('mongoose');
const Schema   = mongoose.Schema;
const ObjectId = Schema.ObjectId;

const OptsSchema = new Schema({
    code    : {type: String, required: true, unique: true},
    name    : {type: String, required: true},
    columns : [{
        type : {type: String},
        name : {type: String},
        id   : {type: String}
    }],
    values : [{

    }],
    set_options : [{type: ObjectId, ref: 'setOptions'}]
});

module.exports = OptsSchema;