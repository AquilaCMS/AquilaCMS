const mongoose           = require('mongoose');
const {ShortcodesSchema} = require('../schemas');

// Permet d'indiquer les champs a renvoyer pour chaque requete sur ce schema
module.exports = mongoose.model('shortcodes', ShortcodesSchema);
