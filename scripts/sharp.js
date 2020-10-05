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
    process.send(false);
    setTimeout(() => process.exit(1), 2000);
});

process.on('unhandledRejection', () => {
    process.send(false);
    setTimeout(() => process.exit(1), 2000);
});
