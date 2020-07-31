const path = require('path');
const sharp = require('sharp');

process.on('message', async (appRoot) => {
    const testFilePath = path.resolve(appRoot, 'themes/default_theme/demoDatas/files/medias/logo2.png');
    await sharp(testFilePath).resize(100).toBuffer();
    process.send(true);
});

process.on('uncaughtException', () => {
    setTimeout(() => process.exit(1), 1000);
});

process.on('unhandledRejection', () => {
    setTimeout(() => process.exit(1), 1000);
});
