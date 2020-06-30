const mongoose = require('mongoose');
const fs       = require('../../utils/fsp');

const Schema   = mongoose.Schema;

const ConfigurationSchema = new Schema({
    name        : String,
    environment : {
        adminPrefix       : {type: String, required: true, minlength: 1},
        analytics         : {type: String},
        appUrl            : {type: String, required: true},
        authorizedIPs     : {type: String, default: ""},
        autoMaintenance   : {type: Boolean, default: false},
        billsPattern      : {type: String},
        cacheTTL          : {type: Number},
        currentTheme      : {type: String, required: true},
        demoMode          : {type: Boolean, default: true},
        exchangeFilesPath : {type: String},
        invoicePath       : {type: String},
        mailHost          : {type: String},
        mailPass          : {type: String},
        mailPort          : {type: Number},
        mailUser          : {type: String},
        mailSecure        : {type: Boolean, default: false},
        mailIsSendmail    : {type: Boolean, default: false},
        maintenance       : {type: Boolean, default: false},
        overrideSendTo    : {type: String},
        photoPath         : {type: String},
        port              : {type: Number, required: true},
        siteName          : {type: String, required: true},
        websiteCountry    : {type: String, required: true},
        websiteTimezone   : {type: String}
    },
    taxerate : [
        {rate: {type: Number, required: true}}
    ],
    stockOrder : {
        cartExpireTimeout         : {type: Number, required: true},
        pendingOrderCancelTimeout : {type: Number, required: true},
        bookingStock              : {type: String, required: true, enum: ["commande", "panier", "none", "payment"]},
        labels                    : [
            {
                code        : {type: String, required: true},
                translation : {}
            }
        ],
        additionnalFees : {
            tax : {type: Number, default: 0},
            et  : {type: Number, default: 0}
        },
        returnStockToFront : {type: Boolean, default: false}
    }
});

ConfigurationSchema.post("updateOne", async function () {
    global.envConfig = (await this.findOne({})).toObject();
});

ConfigurationSchema.pre("updateOne", async function (next) {
    if (this._update && this._update.environment && this._update.environment.databaseConnection && this._update.environment.nodeEnv) {
        const envFile = await fs.readFile(global.envPath);
        const env = JSON.parse(envFile.toString());
        env[this._update.environment.nodeEnv].db = this._update.environment.databaseConnection;
        try {
            await fs.writeFile(global.envPath, `${JSON.stringify(env, null, 4)}`);
            console.log("The env file was saved!");
        } catch (err) {
            console.error(err);
        }

        delete this._update.environment.databaseConnection;
        delete this._update.environment.nodeEnv;
    }
    next();
});

module.exports = ConfigurationSchema;