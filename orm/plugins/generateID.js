const mongoose      = require('mongoose');
const utilsDatabase = require('../../utils/database');

const generate = () => mongoose.Types.ObjectId(`ff${[...Array(22)].map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`);

module.exports = function generateID(schema) {
    schema.pre('save', async function (next) {
        if (this._id && this._id.id[0] !== 255 && this.isNew) this._id = generate();
        await utilsDatabase.preUpdates(this, next, schema);
    });

    schema.pre('insertMany', async function (next, docs) {
        docs.forEach((insert) => {
            if (!insert._id) insert._id = generate();
        });
        await utilsDatabase.preUpdates(this, next, schema);
    });

    schema.pre('findOneAndUpdate', async function (next) {
        if (this.options.upsert && this._conditions._id && ((this._conditions._id.id &&  this._conditions._id.id[0] !== 255) || (!this._conditions._id.id &&  this._conditions._id[0] !== 255))) {
            this._id = generate();
            await utilsDatabase.preUpdates(this, next, schema);
        }
    });
};