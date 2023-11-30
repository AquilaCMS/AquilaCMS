const app = require('../server');

before((done) => {
    app.addListener('started', () => done());
});