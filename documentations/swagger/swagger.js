const make       = require('./makeSwaggerDesc');
const components = require('./components');

const description = make();

const swaggerObject = {
    openapi : '3.0.3',
    info    : {
        version : '2.0.0',
        title   : 'Documentation for AquilaCMS\'s API',
        description,
        // termsOfService : 'https://localhost:3010/term',
        contact : {
            email : 'contact@nextsourcia.com'
        },
        license : {
            name : 'OSL3.0',
            url  : 'https://opensource.org/licenses/OSL-3.0'
        }
    },
    externalDocs : {
        description : 'Find out more about AquilaCMS',
        url         : 'https://www.aquila-cms.com/'
    },
    ...components
};

module.exports = swaggerObject;
