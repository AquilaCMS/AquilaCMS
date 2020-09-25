/*
 * This script take the dependencies in package.json and copy them into the package-aquila.json file.
 * Before the copy, the dependencies are parsed in an array type.
 */

const fs = require('fs');
const path = require('path');
const {isEqual} = require('../utils/utils');

// const [node, script, rootpath, packageN] = process.argv;
// console.log(rootpath, packageN);

let aquilaRootPath = '';
let packageName = '';
if (process.argv[2] !== undefined) {
    aquilaRootPath = process.argv[2];
} else {
    aquilaRootPath = '.';
}
if (process.argv[3] !== undefined) {
    packageName = process.argv[3];
} else {
    packageName = 'package-aquila.json';
}
const packagePath       = path.resolve(`${aquilaRootPath}/package.json`);
const packageAquilaPath = path.resolve(`${aquilaRootPath}/${packageName}`);

fs.readFile(packagePath, 'utf-8', function (err, packageContent) {
    if (err) throw err;

    const newPackageContent = JSON.stringify({
        dependencies : JSON.parse(packageContent).dependencies
    }, null, 4);

    /*
     * If there is a change between new and old dependencies, package-aquila.json is removed
     * and a new package-aquila.json is create with the new array of dependencies
     */
    try {
        fs.readFile(packageAquilaPath, 'utf8', function (err, oldPackageContent) {
            if (err) {
                if (err.code !== 'ENOENT') throw err;
                fs.writeFile(packageAquilaPath, newPackageContent, function (err) {
                    if (err) throw err;
                    console.log('File is replaced successfully');
                });
            } else {
                // eslint-disable-next-line eqeqeq
                if (isEqual(oldPackageContent, newPackageContent)) {
                    console.log(`No change in ${packageName}`);
                    process.exit(0);
                } else {
                    fs.unlink(packageAquilaPath, function (err) {
                        if (err) throw err;
                        fs.writeFile(packageAquilaPath, newPackageContent, function (err) {
                            if (err) throw err;
                            console.log('File is replaced successfully');
                        });
                    });
                }
            }
        });
    } catch (err) {
        console.error(err);
    }
});
