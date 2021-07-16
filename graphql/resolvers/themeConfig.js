/* eslint-disable no-unused-vars */
const {NSErrors} = require('../../utils');

const resolvers = {
    Query : {
        getThemeConfig : async (parent, {name}, context, info) => {
            const {ThemeConfig, Configuration} = require('../../orm/models');
            if (name) {
                return ThemeConfig.findOne({name}).lean();
            }
            const config = await Configuration.findOne({});
            return ThemeConfig.findOne({name: config.environment.currentTheme}).lean();
        }
    }
};

module.exports = resolvers;