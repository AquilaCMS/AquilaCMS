const fs             = require('fs');
const path           = require('path');
const {fork} = require('child_process');
const packageManager = require('../utils/packageManager');
const jobServices    = require('../services/job');
const adminServices  = require('../services/admin');

module.exports = (installRouter) => {
    installRouter.get('/', async (req, res, next) => {
        try {
            let html = (fs.readFileSync(path.join(global.appRoot, '/installer/install.html'))).toString();
            html     = html.replace('{{adminPrefix}}', `admin_${Math.random().toString(36).substr(2, 4)}`);
            html     = html.replace('{{aquilaCMSVersion}}', JSON.parse(fs.readFileSync(path.resolve(global.appRoot, './package.json'))).version);
            let wkhtmlInstalled = true;
            let sharpInstalled = true;
            try {
                wkhtmlInstalled = await (new Promise((resolve, reject) => {
                    const res = fork(path.resolve(global.appRoot, 'scripts/wkhtmltopdf.js'), [], {});
                    res.on('message', (message) => {
                        resolve(message);
                    });
                    res.on('error', (err) => {
                        reject(err);
                    });
                    res.send('process', (err) => {
                        reject(err);
                    });
                }));
            } catch (err) {
                wkhtmlInstalled = false;
            }
            try {
                sharpInstalled = await (new Promise((resolve, reject) => {
                    const res = fork(path.resolve(global.appRoot, 'scripts/sharp.js'), [], {});
                    res.on('message', (message) => {
                        resolve(message);
                    });
                    res.on('error', (err) => {
                        reject(err);
                    });
                    res.send(global.appRoot, (err) => {
                        reject(err);
                    });
                }));
            } catch (err) {
                sharpInstalled = false;
            }
            html = html.replace('{{wkhtmltopdf}}', wkhtmlInstalled);
            html = html.replace('{{sharp}}', sharpInstalled);
            res.send(html, {}, (err) => {
                if (err) console.error(err);
            });
        } catch (err) {
            console.error(err);
            next(err);
        }
    });

    installRouter.post('/config', async (req, res) => {
        try {
            await require('../installer/install').firstLaunch(req, true);
            jobServices.initAgendaDB();
            await require('../utils/database').initDBValues();
            adminServices.welcome();
            const result = await packageManager.restart();
            res.send(result);
        } catch (err) {
            console.error(err);
            res.status(500).send(`Error : ${JSON.stringify(err)}`);

            // Recréation du env.json 'vide'
            fs.unlinkSync('./config/env.json');
            await require('../utils/server').getOrCreateEnvFile();
        }
    });

    installRouter.post('/recover', async (req, res) => {
        try {
            await require('../installer/install').firstLaunch(req, false);
            jobServices.initAgendaDB();
            adminServices.welcome();
            const result = await packageManager.restart();
            res.send(result);
        } catch (err) {
            console.error(err);
            res.status(500).send(`Error : ${JSON.stringify(err)}`);
        }
    });

    installRouter.post('/testdb', async (req, res) => {
        try {
            const result = await require('../installer/install').testdb(req);
            res.send(result);
        } catch (err) {
            console.error('Error : Cannot connect to database', err);
            res.status(500).send('Error : Cannot connect to database');
        }
    });
};