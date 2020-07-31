const mongoose = require('mongoose');
const {ThemeConfigSchema} = require('../schemas');

module.exports = mongoose.model('themeConfig', ThemeConfigSchema, 'themeConfigs');