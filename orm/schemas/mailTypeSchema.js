const mongoose = require('mongoose');
const Schema   = mongoose.Schema;

const MailTypeSchema = new Schema({
    code     : {type: String, unique: true, sparse: true},
    name     : {type: String, required: true},
    position : {type: Number, default: 1}
}, {timestamps: true});

MailTypeSchema.pre('validate', function (next) {
    if (this.code === undefined || this.code == null || (this.code === '' && this.name !== 'Aucun type')) {
        next(new Error('mailtype.code is empty'));
    }
    next();
});

module.exports = MailTypeSchema;