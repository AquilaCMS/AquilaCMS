const path = require('path');
const {fs} = require('aql-utils');

const getLogsContent = async (fileName, page = 1) => {
    const linePerPage = 300;
    const filePath    = path.resolve(global.aquila.appRoot, fileName);
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
                // Read last 300 logs/errors + 300 more per click on 'see more'
                if (nbLinesFile > linePerPage + 1) {
                    offset       = linePerPage * page;
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
