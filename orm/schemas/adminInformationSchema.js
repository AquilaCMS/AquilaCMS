const mongoose = require('mongoose');
const Schema   = mongoose.Schema;

const AdmininformationSchema = new Schema({
    code        : {type: String},
    type        : {type: String, enum: ["success", "info", "warning", "danger"]},
    translation : {},
    date        : {type: Date},
    deleted     : {type: Boolean}
});

module.exports = AdmininformationSchema;