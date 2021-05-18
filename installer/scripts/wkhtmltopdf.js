const wkhtmltopdf = require('wkhtmltopdf');

process.on('message', () => {
    try {
        wkhtmltopdf('<h1>Test</h1><p>Hello world</p>');
        process.send(true);
        setTimeout(() => process.exit(0), 2000); // make sure it is disconnected
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