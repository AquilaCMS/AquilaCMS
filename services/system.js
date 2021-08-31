const path = require('path');
const fs   = require('../utils/fsp');

const getLogsContent = async (fileName) => {
    const filePath = path.resolve(global.appRoot, fileName);
    if (await fs.hasAccess(filePath)) {
        let fileContent  = '';
        let currentLines = '';
        try {
            fileContent = await fs.readFile(filePath, 'utf8');
            if (fileContent) {
                const allLines    = fileContent.split('\n');
                const nbLinesFile = allLines.length;
                let nbLinesStart  = 0;
                let offset        = 0;
                // Read only the last logs
                if (nbLinesFile > 301) {
                    offset       = 300;
                    nbLinesStart = (nbLinesFile - offset);
                }
                for (let count = nbLinesStart; count < nbLinesFile; count++) {
                    if (allLines[count]) {
                        currentLines = `${currentLines}${allLines[count]}\n`;
                    }
                }
            } else {
                currentLines = 'None';
            }
            return {fileData: currentLines};
        } catch (err) {
            return {fileData: 'None'};
        }
    }
    return {fileData: 'None'};
};

module.exports = {
    getLogsContent
};
