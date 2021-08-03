/* eslint-disable no-unused-vars */
const {NSErrors} = require('../../utils');

const resolvers = {
    Query : {
        getSlider : async (parent, {id}, context, info) => {
            const {Slider} = require('../../orm/models');
            return Slider.findById(id).lean();
        },
        getSliders : async (parent, {offset = 0, limit = 10, conditions = {}}) => {
            const {Slider} = require('../../orm/models');
            return Slider.find(conditions).skip(offset).limit(limit).lean();
        }
    }
};

module.exports = resolvers;