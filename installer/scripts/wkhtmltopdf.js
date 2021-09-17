const wkhtmltopdf = require('wkhtmltopdf');

const useWk = async (content, options = {}) => new Promise((resolve, reject) => {
    wkhtmltopdf(content, options, (err, stream) => {
        if (err) {
            reject(err);
        } else {
            resolve(stream);
        }
    });
});

process.on('message', async () => {
    try {
        await useWk('<h1>Test</h1><p>Hello world</p>');
        process.send(true);
        setTimeout(() => process.exit(0), 2000);
    } catch (err) {
        process.send(false);
        setTimeout(() => process.exit(1), 2000); // make sure it is disconnected
    }
});

process.on('uncaughtException', () => {
    process.send(false);
    setTimeout(() => process.exit(1), 1000);
});

process.on('unhandledRejection', () => {
    process.send(false);
    setTimeout(() => process.exit(1), 1000);
});