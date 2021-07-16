const types = `
    type Slider {
        _id: ObjectId!
        name: String
        code: String!
        items: [items]
        accessibility : Boolean
        arrows : Boolean
        autoplay : Boolean
        autoplaySpeed : Boolean
        infinite : Boolean
        fade : Boolean
        lazyLoad : Boolean
        pauseOnHover : Boolean
        slidesToShow : Int
        slidesToScroll : Int
        speed : Int
        swipe : Boolean
    }

    type items {
        _id: ObjectId!
        order: Int
        src: String
        text: String
        name: String
        href: String
        extension: String
    }
`;

const queries = `
    getSlider(id: String!): Slider!
    getSliders(offset: Int, limit: Int, conditions: Any): [Slider]!
`;

module.exports = {
    types,
    queries
};