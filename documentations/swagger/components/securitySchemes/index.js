module.exports = {
    securitySchemes : {
        api_key : {
            type : 'apiKey',
            name : 'authorization',
            in   : 'header'
        }
    }
};