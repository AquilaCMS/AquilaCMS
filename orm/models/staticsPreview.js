const mongoose = require("mongoose");
const {StaticsPreviewSchema} = require("../schemas");

module.exports = mongoose.model("staticsPreview", StaticsPreviewSchema);