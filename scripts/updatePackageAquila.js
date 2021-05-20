/*
 * This script take the dependencies in package.json and copy them into the package-aquila.json or package-theme.json file.
 * Before the copy, the dependencies are parsed in an array type.
 */

const path = require('path');
const fs   = require('../utils/fsp');

// isEqual Function
/**
 * Check if two objects or arrays are equal
 * (c) 2017 Chris Ferdinandi, MIT License, https://gomakethings.com
 * @param  {object|Array} value The first object or array to compare
 * @param  {object|Array} other The second object or array to compare
 * @return {Boolean}            Returns true if they're equal
 */
const isEqual = (value, other) => {
    // Get the value type
    const type = Object.prototype.toString.call(value);
    // If the two objects are not the same type, return false
    if (type !== Object.prototype.toString.call(other)) return false;

    // If items are not an object or array, return false
    if (['[object Array]', '[object Object]'].indexOf(type) < 0) return false;

    // Compare the length of the length of the two items
    const valueLen = type === '[object Array]' ? value.length : Object.keys(value).length;
    const otherLen = type === '[object Array]' ? other.length : Object.keys(other).length;
    if (valueLen !== otherLen) return false;

    // Compare properties
    if (type === '[object Array]') {
        for (let i = 0; i < valueLen; i++) {
            if (compare(value[i], other[i]) === false) return false;
        }
    } else {
        for (const key in value) {
            if (value.hasOwnProperty(key)) {
                if (compare(value[key], other[key]) === false) return false;
            }
        }
    }

    // If nothing failed, return true
    return true;
};

// Compare two items
let compare = (item1, item2) => {
    // Get the object type
    const itemType = Object.prototype.toString.call(item1);
    // If an object or array, compare recursively
    if (['[object Array]', '[object Object]'].indexOf(itemType) >= 0) {
        if (!isEqual(item1, item2)) return false;
        // Otherwise, do a simple comparison
    } else {
        // If the two items are not the same type, return false
        if (itemType !== Object.prototype.toString.call(item2)) return false;
        // Else if it's a function, convert to a string and compare
        // Otherwise, just compare
        if (itemType === '[object Function]') {
            if (item1.toString() !== item2.toString()) return false;
        } else {
            if (item1 !== item2) return false;
        }
    }
};

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
        if (isEqual(JSON.parse(oldPackageContent), JSON.parse(newPackageContent))) {
            console.log(`No change in ${packageName}`);
            process.exit(0);
        } else {
            await fs.unlink(packageAquilaPath);
            await fs.writeFile(packageAquilaPath, newPackageContent);
            console.log('File is replaced successfully');
        }
    } catch (err) {
        await fs.writeFile(packageAquilaPath, newPackageContent);
        console.log('File is replaced successfully');
    }
})();
