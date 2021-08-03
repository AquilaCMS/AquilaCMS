const types = `
    type Attribute {
        _id: ObjectId!
        code: String!
        type: AttributeType!
        _type: AttributeType
        param: String!
        set_attributes: [SetAttribute]
        position: Int
        default_value: Any
        visible: Boolean
        usedInRules: Boolean
        usedInFilters: Boolean
        translation: Any
    }
`;

module.exports = {
    types
};