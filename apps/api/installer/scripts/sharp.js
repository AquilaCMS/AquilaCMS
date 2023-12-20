const path  = require('path');
const sharp = require('sharp');

process.on('message', async (appRoot) => {
    try {
        const testFilePath = path.resolve(appRoot, '../installer/scripts/logo.png'); // he is in process folder
        await sharp(testFilePath).resize(100).toBuffer();
        process.send(true);
        setTimeout(() => process.exit(0), 2000); // make sure it is disconnected
    } catch (err) {
        process.send(false);
        setTimeout(() => process.exit(1), 2000); // make sure it is disconnected
    }
});

process.on('uncaughtException', () => {
    process.send(false);
    setTimeout(() => process.exit(1), 2000);
});

process.on('unhandledRejection', () => {
    process.send(false);
    setTimeout(() => process.exit(1), 2000);
});
