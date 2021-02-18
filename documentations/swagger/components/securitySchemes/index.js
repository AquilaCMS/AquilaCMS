module.exports = {
    securitySchemes : {
        admin_authorization : {
            type : 'apiKey',
            name : 'authorization',
            in   : 'header'
        }
    }
};