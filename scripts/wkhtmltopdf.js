const wkhtmltopdf = require('wkhtmltopdf');

process.on('message', () => {
    try {
        wkhtmltopdf('<h1>Test</h1><p>Hello world</p>');
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