module.exports = {
    securitySchemes : {
        admin_authorization : {
            type : 'apiKey',
            name : 'Authorization',
            in   : 'header'
        }
    }
};