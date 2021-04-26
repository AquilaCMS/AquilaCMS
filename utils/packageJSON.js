const path = require('path');
const fs   = require('./fsp');

const packageJSONPath = path.resolve(global.appRoot, 'package.json');

function PackageJSON() {
    this.package = undefined;
}

PackageJSON.prototype.read = async function () {
    this.package = JSON.parse(await fs.readFile(packageJSONPath, 'utf8'));
};

PackageJSON.prototype.save = async function () {
    await fs.writeFile(packageJSONPath, JSON.stringify(this.package, null, 2), 'utf8');
};

module.exports = PackageJSON;