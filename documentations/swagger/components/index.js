const schemas         = require('./schemas');
const securitySchemes = require('./securitySchemes');
const paths           = require('./paths');

module.exports = {
    components : {
        ...securitySchemes,
        schemas
    },
    paths
};