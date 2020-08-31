const fs       = require('fs');
const path     = require('path');
const NSErrors = require('../utils/errors/NSErrors');

const InitRoutes = (express, server) => {
    const apiRouter         = express.Router(); // Route api for the front for client
    const adminFrontRouter  = express.Router(); // Route for serving the front of the admin
    server.use('/api', apiRouter, (req, res, next) => next(NSErrors.ApiNotFound));
    server.use(`/${global.envConfig.environment.adminPrefix}`, adminFrontRouter);
    loadDynamicRoutes(apiRouter, adminFrontRouter);

    return apiRouter;
};

/**
 * Charge dynamiquement toutes les routes du dossier routes
 */
const loadDynamicRoutes = (app, adminFront) => {
    console.log('Loading routes');
    fs.readdirSync('./routes').forEach((file) => {
        // Ne pas charger le fichier index ou les routes de l'installeur
        if (file === path.basename(__filename) || path.extname(file) !== '.js' || file === 'install.js') {
            return;
        }

        // Charge les fichiers des routes
        if (file === 'admin.js') {
            require(`./${file}`)(app, adminFront);
        } else {
            require(`./${file}`)(app);
        }
    });
};

/**
 * Route exceptions
 */
const manageExceptionsRoutes = async (req, res, next) => {
    if (['.jpg', '.jpeg', '.png', '.css', '.js', '.json', '.txt', '.ico'].includes(path.extname(req.url).toLowerCase())) {
        res.setHeader('Cache-Control', 'public, max-age=2592000');

        const dt = new Date(Date.now());
        dt.setMonth( dt.getMonth() + 1 );
        res.setHeader('Expires', dt.toUTCString());
    }
    // Exception BO React
    if (req.url.startsWith('/bo') && !req.url.startsWith('/bo/api')) {
        if (path.basename(req.url).indexOf('.') > -1) {
            const url = req.url.replace('/bo', '/bo/build');
            res.sendFile(path.join(global.appRoot, url));
        } else {
            res.sendFile(path.join(global.appRoot, 'bo/build/index.html'));
        }
    } else if (req.url === '/sitemap.xml' || req.url === '/robots.txt') {
        res.sendFile(path.join(global.appRoot, req.url));
    } else if (req.url && req.url.startsWith('/images') && req.url.split('/').length === 6) {
        const type      = req.url.split('/')[2];
        const size      = req.url.split('/')[3].split('-')[0];
        const quality   = req.url.split('/')[3].split('-')[1];
        const _id       = req.url.split('/')[4];
        const extension = path.extname(req.url).replace('.', '');
        if (type && size && extension && _id) {
            try {
                const image = await require('../services/medias').downloadImage(type, _id, size, extension, quality ? Number(quality) : undefined);
                res.set('Content-Type', `image/${extension}`);
                fs.createReadStream(image, {autoClose: true}).pipe(res);
            } catch (e) {
                next(NSErrors.MediaNotFound);
            }
        }
    } else if (
        global.envConfig
        && req.url.length > global.envConfig.environment.adminPrefix.length + 2
        && req.url.indexOf(`/${global.envConfig.environment.adminPrefix}/`)  > -1
        && req.url.split('/')[req.url.split('/').length - 1].indexOf('.') > -1
    ) {
        let url = req.url.replace(global.envConfig.environment.adminPrefix, 'backoffice').split('?')[0];
        if (fs.existsSync(path.join(global.appRoot, url))) {
            res.sendFile(path.join(global.appRoot, url));
        } else {
            url = url.replace('backoffice', global.envConfig.environment.photoPath || 'uploads');
            if (fs.existsSync(path.join(global.appRoot, url))) {
                res.sendFile(path.join(global.appRoot, url));
            } else {
                res.end();
            }
        }
    } else {
        require('../services/stats').addUserVisitReq(req);

        // On ajoute le port a req afin qu'il soit dispo dans le req du getInitialProps de next
        req.port = global.port;
        next();
    }
};

module.exports = {
    manageExceptionsRoutes,
    loadDynamicRoutes,
    InitRoutes
};