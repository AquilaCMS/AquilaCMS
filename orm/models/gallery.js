const mongoose = require('mongoose');
const {GallerySchema} = require("../schemas");

// Permet d'indiquer les champs a renvoyer pour chaque requete sur ce schema
module.exports = mongoose.model('gallery', GallerySchema, "gallery");
