/*
 * This script take the dependencies in package.json and copy them into the package-aquila.json file.
 * Before the copy, the dependencies are parsed in an array type.
 */

const path      = require('path');
const fs        = require('../utils/fsp');
const {isEqual} = require('../utils/utils');

let aquilaRootPath = '.';
let packageName    = 'package-aquila.json';
if (process.argv[2] !== undefined) aquilaRootPath = process.argv[2];
if (process.argv[3] !== undefined) packageName = process.argv[3];

const packagePath       = path.resolve(`${aquilaRootPath}/package.json`);
const packageAquilaPath = path.resolve(`${aquilaRootPath}/${packageName}`);

(async () => {
    const packageContent    = await fs.readFile(packagePath, 'utf-8');
    const newPackageContent = JSON.stringify({dependencies: JSON.parse(packageContent).dependencies}, null, 4);

    /*
     * If there is a change between new and old dependencies, package-aquila.json is removed
     * and a new package-aquila.json is create with the new array of dependencies
     */
    try {
        const oldPackageContent = await fs.readFile(packageAquilaPath, 'utf8');
        if (!isEqual(oldPackageContent, newPackageContent)) {
            await fs.unlink(packageAquilaPath);
            await fs.writeFile(packageAquilaPath, newPackageContent);
            console.log('File is replaced successfully');
        }
    } catch (err) {
        await fs.writeFile(packageAquilaPath, newPackageContent);
        console.log('File is replaced successfully');
    }
    console.log(`No change in ${packageName}`);
    process.exit(0);
})();
