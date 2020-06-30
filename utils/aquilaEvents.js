const EventEmitter = require('events');
const aquilaEvents = new EventEmitter();

aquilaEvents.on('error', (err) => {
    console.error(err);
});

module.exports = aquilaEvents;