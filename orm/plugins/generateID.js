const utilsDatabase = require('../../utils/database');
const mongoose = require('mongoose')

const generate = () => {
    return mongoose.Types.ObjectId([...Array(24)].map(() => Math.floor(Math.random() * 16).toString(16)).join(''));
}

module.exports = function generateID(schema){
    schema.pre('save', async function (next) {
        this._id = generate()
        await utilsDatabase.preUpdates(this, next, schema);
    });
}