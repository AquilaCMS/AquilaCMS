module.exports = {
    securitySchemes : {
        user_authorization : {
            type : 'apiKey',
            name : 'Authorization',
            in   : 'header'
        },
        admin_authorization : {
            type : 'apiKey',
            name : 'Authorization',
            in   : 'header'
        }
    }
};