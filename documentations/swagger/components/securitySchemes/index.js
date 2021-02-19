module.exports = {
    securitySchemes : {
        api_key : {
            type : 'apiKey',
            name : 'Authorization',
            in   : 'header'
        }
    }
};