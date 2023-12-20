const {fs} = require('aql-utils');
const path = require('path');

const make = () => {
    try {
        const pathToDesc = path.join(__dirname, './description.md');
        const file       = fs.readFileSync(pathToDesc);
        return file.toString();
    } catch (error) {
        console.error('Error during creation of the Swagger documentation');
    }
};

module.exports = make;