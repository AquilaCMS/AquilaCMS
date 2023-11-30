const faker    = require('faker');
const {Slider} = require('../../orm/models');

const createSlider = (params = {code: null}) => {
    const {code}         = params;
    const slider         = new Slider();
    slider.code          = code || faker.lorem.slug();
    slider.autoplay      = true;
    slider.autoplaySpeed = 2000;
    slider.pauseOnHover  = true;
    slider.infinite      = true;
    slider.items         = [];
    return slider.save();
};

const deleteAllSlider = async () => {
    await Slider.deleteMany({});
};

module.exports = {
    createSlider,
    deleteAllSlider
};