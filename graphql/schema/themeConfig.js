const types = `
    type ThemeConfig {
        _id: ObjectId!
        name: String
        config: Any
    }
`;

const queries = `
    getThemeConfig(name: String): ThemeConfig!
`;

module.exports = {
    types,
    queries
};