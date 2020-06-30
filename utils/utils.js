const path           = require("path");
const Json2csvParser = require('json2csv').Parser;
const fs             = require("./fsp");

const attributeCorrectNewTypeName = (type) => {
    switch (type) {
    case "Champ texte":
        return "textfield";
    case "Zone de texte":
        return "textarea";
    case "Date":
        return "date";
    case "Booléen (oui/non)":
        return "bool";
    case "Liste déroulante":
        return "list";
    case "Sélection multiple":
        return "multiselect";
    case "Intervalle":
        return "interval";
    case "Image":
        return "image";
    case "Vidéo":
        return "video";
    case "Fichier PDF":
        return "doc/pdf";
    case "Nombre":
        return "number";
    case "Couleur":
        return "color";
    default:
        return type;
    }
};

const attributeCorrectOldTypeName = (type) => {
    switch (type) {
    case "textfield":
        return "Champ texte";
    case "textarea":
        return "Zone de texte";
    case "date":
        return "Date";
    case "bool":
        return "Booléen (oui/non)";
    case "list":
        return "Liste déroulante";
    case "multiselect":
        return "Sélection multiple";
    case "interval":
        return "Intervalle";
    case "image":
        return "Image";
    case "video":
        return "Vidéo";
    case "doc/pdf":
        return "Fichier PDF";
    case "number":
        return "Nombre";
    case "color":
        return "Couleur";
    default:
        return type;
    }
};

const json2csv = async (data, fields, folderPath, filename) => {
    await fs.mkdir(path.resolve(folderPath), {recursive: true});
    const json2csvParser = new Json2csvParser({fields});
    return {
        csv        : json2csvParser.parse(data),
        file       : filename,
        exportPath : folderPath
    };
};

/**
 * Detect if array contain duplicated values
 * @param {Array} a array to check duplicate
 * @returns {Boolean} Contains duplicated
 */
const detectDuplicateInArray = (a) => {
    for (let i = 0; i <= a.length; i++) {
        for (let j = i; j <= a.length; j++) {
            if (i !== j && a[i] && a[j] && a[i].toString() === a[j].toString()) {
                return true;
            }
        }
    }
    return false;
};

const downloadFile = async (url, dest) => {
    // on creer les dossier
    fs.mkdirSync(dest.replace(path.basename(dest), ''), {recursive: true});
    const file = fs.createWriteStream(dest);
    const downloadDep = url.includes('https://') ? require('https') : require('http');
    return new Promise((resolve, reject) => {
        downloadDep.get(url, (res) => {
            if (res.statusCode !== 200) {
                return reject('File is not found');
            }
            const len = parseInt(res.headers['content-length'], 10);
            let dowloaded = 0;
            res.pipe(file);
            res.on('data', (chunk) => {
                dowloaded += chunk.length;
                console.log(`Downloading ${(100.0 * dowloaded / len).toFixed(2)}% ${dowloaded} bytes\r`);
            }).on('end', () => {
                file.end();
                resolve(null);
            }).on('error', (err) => {
                reject(err.message);
            });
        }).on('error', (err) => {
            fs.unlink(dest);
            reject(err.message);
        });
    });
};

const slugify = (text) => {
    return require("slug")(text, {lower: true});
};

// Returns ET price
// VAT is 20 if if is 20%
const toET = (ATIPrice, VAT) => {
    if ((ATIPrice !== undefined) && (VAT !== undefined)) {
        if (VAT === 0) {
            return ATIPrice;
        }

        return Math.round(ATIPrice * 100 * 100 / (100 + VAT)) / 100;
    }

    return undefined;
};

const getObjFromDotStr = (obj, str) => str.split(".").reduce((o, i) => o[i], obj);

/* temp : determiner les routes non utilisés */
// eslint-disable-next-line no-unused-vars
const tmp_use_route = async (api, fct) => {
    // Delete this function as soon as possible
    console.error(`/!\\ Si vous voyez ce message, merci de supprimer l'appel à tmp_use_route() dans la foncion ${api} / ${fct}`);
};
/* End temp : determiner les routes non utilisés */

module.exports = {
    // services/users
    // utils/datas
    downloadFile,
    json2csv,
    // utils/helpers
    getObjFromDotStr,
    detectDuplicateInArray,
    // utils/files
    // services/seo ou utils/utils : Strings for slugs
    slugify,
    // utils/utils : Dev info
    tmp_use_route,
    // utils/utils : Taxes
    toET,
    // utils/utils : Retrocompatibilité
    attributeCorrectNewTypeName,
    attributeCorrectOldTypeName
};
