module.exports = {
    apps : [{
        name   : 'Aquila_TEST',
        script : 'server.js',
        port   : 3010,
        // To launch in development mode, launch 'pm2 start ecosystem.config.js'
        env    : {
            NODE_ENV   : 'development',
            AQUILA_ENV : 'aquila'
        },
        // To launch in production mode, launch 'pm2 start ecosystem.config.js --env production'
        env_production : {
            NODE_ENV   : 'production',
            AQUILA_ENV : 'aquila'
        }
    }]
};
