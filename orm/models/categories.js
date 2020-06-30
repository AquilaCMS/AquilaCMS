const mongoose           = require('mongoose');
const {CategoriesSchema} = require("../schemas");

module.exports = mongoose.model("categories", CategoriesSchema);
