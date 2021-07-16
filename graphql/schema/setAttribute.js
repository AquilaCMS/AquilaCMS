const types = `
    type SetAttribute {
        _id: ObjectId!
        code: String!
        name: String!
        attributes: [Attribute]
        type: AttributeType
        questions: [Question]
    }

    type Question {
        translation: Any
    }
`;

module.exports = {
    types
};