const fs             = require("fs");
const path           = require("path");
const adminServices  = require("../services/admin");
const jobServices    = require("../services/job");
const packageManager = require("../utils/packageManager");

module.exports = (installRouter) => {
    installRouter.get("/", async (req, res, next) => {
        try {
            let html = (fs.readFileSync(path.join(global.appRoot, "/installer/install.html"))).toString();
            html     = html.replace("{{adminPrefix}}", `admin_${Math.random().toString(36).substr(2, 4)}`);
            html     = html.replace("{{aquilaCMSVersion}}", JSON.parse(fs.readFileSync(path.resolve(global.appRoot, './package.json'))).version);
            let wkhtmlInstalled;
            try {
                await packageManager.execCmd("wkhtmltopdf --version", "./");
                wkhtmlInstalled = true;
            } catch (err) {
                wkhtmlInstalled = false;
            }
            html = html.replace("{{wkhtmltopdf}}", wkhtmlInstalled);
            res.send(html, {}, (err) => {
                if (err) console.error(err);
            });
        } catch (err) {
            console.error(err);
            next(err);
        }
    });

    installRouter.post("/config", async (req, res) => {
        try {
            await require("../installer/install").firstLaunch(req, true);
            jobServices.initAgendaDB();
            await require("../utils/database").initDBValues();
            adminServices.welcome();
            const result = await packageManager.restart();
            res.send(result);
        } catch (err) {
            console.error(err);
            res.status(422).send(`Error : ${JSON.stringify(err)}`);
        }
    });

    installRouter.post("/recover", async (req, res) => {
        try {
            await require("../installer/install").firstLaunch(req, false);
            jobServices.initAgendaDB();
            adminServices.welcome();
            const result = await packageManager.restart();
            res.send(result);
        } catch (err) {
            console.error(err);
            res.status(422).send(`Error : ${JSON.stringify(err)}`);
        }
    });
};