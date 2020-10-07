const schemas         = require('./schemas');
const securitySchemes = require('./securitySchemes');

module.exports = {
    components : {
        ...securitySchemes,
        schemas
    }
};