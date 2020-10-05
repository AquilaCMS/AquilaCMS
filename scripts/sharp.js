const path  = require('path');
const sharp = require('sharp');

process.on('message', async (appRoot) => {
    try {
        const testFilePath = path.resolve(appRoot, 'scripts/logo.png');
        await sharp(testFilePath).resize(100).toBuffer();
        process.send(true);
    } catch (err) {
        process.send(false);
    }
});

process.on('uncaughtException', () => {
    setTimeout(() => process.exit(1), 1000);
});

process.on('unhandledRejection', () => {
    setTimeout(() => process.exit(1), 1000);
});
