/*
 * This script take the dependencies in package.json and copy them into the package-aquila.json file.
 * Before the copy, the dependencies are parsed in an array type.
 */

const fs = require('fs');
let aquilaRootPath = '';
if (process.argv[2] !== undefined) {
    aquilaRootPath = process.argv[2];
} else {
    aquilaRootPath = '.';
}
const packagePath       = `${aquilaRootPath}/package.json`;
const packageAquilaPath = `${aquilaRootPath}/package-aquila.json`;

const packageContent = fs.readFileSync(packagePath, 'utf-8', function (err) {
    if (err) throw err;
});
const packageObj               = JSON.parse(packageContent);
const newDependencies          = packageObj.dependencies;
const newDependenciesTab       = [];
let newDependenciesLineContent = '';

for (const key of Object.keys(newDependencies)) {
    newDependenciesLineContent = `${key}@${newDependencies[key]}`;
    newDependenciesTab.push(newDependenciesLineContent);
}

const newPackage        = {dependencies: newDependenciesTab};
const newPackageContent = JSON.stringify(newPackage, null, 4);

/*
 * If there is a change between new and old dependencies, package-aquila.json is removed
 * and a new package-aquila.json is create with the new array of dependencies
 */
try {
    if (fs.existsSync(packageAquilaPath)) {
        const oldPackageContent = fs.readFileSync(packageAquilaPath, 'utf8', function (err) {
            if (err) throw err;
        });
        // eslint-disable-next-line eqeqeq
        if (oldPackageContent == newPackageContent) {
            console.log('No change in package-aquila');
            process.exit(0);
        } else {
            fs.unlink(packageAquilaPath, function (err) {
                if (err) throw err;
            });
        }
    }

    fs.writeFile(packageAquilaPath, newPackageContent, function (err) {
        if (err) throw err;
        console.log('File is replaced successfully');
    });
} catch (err) {
    console.error(err);
}
