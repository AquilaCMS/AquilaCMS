/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const bcrypt            = require('bcrypt');
const mongoose          = require('mongoose');
const PasswordValidator = require('password-validator');
const {aquilaEvents}    = require('aql-utils');
const AddressSchema     = require('./addressSchema');
const NSErrors          = require('../../utils/errors/NSErrors');
const Schema            = mongoose.Schema;
const {ObjectId}        = Schema.Types;

/**
 * @see https://www.nayuki.io/page/random-password-generator-javascript
 * @returns {string}
 */
const generateUserPassword = () => {
    const CHARACTER_SETS = [
        [true, '0123456789'],
        [true, 'abcdefghijklmnopqrstuvwxyz'],
        [true, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'],
        [true, '!#$%()*+,-.:;<=>@[]^_{|}~']
    ];

    const charset = [];
    for (const elem of CHARACTER_SETS) {
        if (elem[0]) {
            charset.push(...elem[1].split(''));
        }
    }
    // Generate password
    let result = '';
    for (let i = 0; i < 20; i++) result += charset[randomInt(charset.length)];
    return result;
};

/**
 * Returns a random integer in the range [0, n) using a variety of methods.
 * @param {number} n
 * @returns {number}
 */
const randomInt = (n) => {
    const x = Math.floor(Math.random() * n);
    if (x < 0 || x >= n) throw new Error('Arithmetic exception');
    return x % n;
};

function validatePassword(password) {
    const validation = new PasswordValidator();
    validation.is().min(6).has().uppercase().has().lowercase().has().digits();
    return validation.validate(password);
}

const UserSchema = new Schema({
    email : {
        type     : String,
        required : true,
        index    : {
            unique    : true,
            collation : {strength: 2}
        },
        validate : {
            validator(email) {
                // eslint-disable-next-line prefer-regex-literals
                return (new RegExp(/^(([^<>()[\].,;:\s@"]+(\.[^<>()[\].,;:\s@"]+)*)|(".+"))@(([^<>()[\].,;:\s@"]+\.)+[^<>()[\].,;:\s@"]{2,})$/i)).test(email);
            },
            message : () => 'BAD_EMAIL_FORMAT'
        }
    },
    password : {
        type     : String,
        required : true,
        default  : generateUserPassword,
        validate : {
            validator : validatePassword,
            message   : () => 'FORMAT_PASSWORD'
        }
    },
    code     : {type: String, unique: true, sparse: true},
    civility : {
        type : Number,
        enum : [0, 1] // 0 pour homme, 1 pour femme
    },
    firstname    : String,
    lastname     : String,
    phone        : String,
    phone_mobile : String,
    company      : {
        name        : String,
        siret       : String,
        intracom    : String,
        address     : String,
        postal_code : String,
        town        : String,
        country     : String,
        contact     : {
            first_name : String,
            last_name  : String,
            email      : String,
            phone      : String
        }
    },
    status               : String,
    delivery_address     : {type: Number, default: -1}, // index définissant l'addresse de livraison dans users.addresses
    billing_address      : {type: Number, default: -1}, // index définissant l'addresse de facturation dans users.addresses
    addresses            : [AddressSchema],
    isAdmin              : {type: Boolean, default: false},
    price                : String,
    taxDisplay           : {type: Boolean, default: true},
    isActive             : {type: Boolean, default: true},
    isActiveAccount      : {type: Boolean, default: false},
    activateAccountToken : {type: String, unique: true, sparse: true},
    resetPassToken       : {type: String, unique: true, sparse: true},
    birthDate            : Date,
    accessList           : [{type: String}],
    type                 : String,
    preferredLanguage    : String,
    set_attributes       : {type: ObjectId, ref: 'setAttributes', index: true},
    attributes           : [
        {
            id          : {type: ObjectId, ref: 'attributes', index: true},
            code        : String,
            visible     : {type: Boolean, default: true},
            param       : String,
            type        : {type: String, default: 'unset'},
            translation : {},
            position    : {type: Number, default: 1}
        }
    ],
    lastConnexion : Date,
    anonymized    : {type: Boolean, default: false}
}, {
    timestamps : true,
    id         : false
});

UserSchema.index({email: 1});
// Need all this index for BO listing
UserSchema.index({firstname: 1});
UserSchema.index({lastname: 1});
UserSchema.index({'company.name': 1});
UserSchema.index({createdAt: 1});

UserSchema.set('toJSON', {virtuals: true});
UserSchema.set('toObject', {virtuals: true});
UserSchema.virtual('fullname').get(function () {
    return `${this.firstname ? this.firstname : ''} ${this.lastname ? this.lastname : ''}`;
});

UserSchema.methods.hashPassword = async function () {
    this.password = await bcrypt.hash(this.password, 10);
};

UserSchema.post('validate', async function () {
    if (this.isNew || this.needHash) {
        await this.hashPassword();
    }
});

UserSchema.methods.validPassword = async function (password) {
    try {
        return bcrypt.compare(password, this.password);
    } catch (err) {
        return false;
    }
};

// RGPD : suppression des données associées à un user (orders et bills)
UserSchema.pre('remove', async function (next) {
    const {Orders, Bills} = require('../models');
    const bills           = await Bills.find({client: this._id});
    for (let i = 0; i < bills.length; i++) {
        bills[i].client = undefined;
        bills[i].save();
    }

    const orders = await Orders.find({'customer.id': this._id});
    for (let i = 0; i < orders.length; i++) {
        orders[i].customer.id = undefined;
        orders[i].save();
    }
    aquilaEvents.emit('aqRemoveUser', this);
    next();
});

UserSchema.pre('save', function (next) {
    this.wasNew = this.isNew;
    next();
});

UserSchema.pre('findOneAndUpdate', async function (next) {
    if (this._update && this._update.email && this._update._id) {
        const users = await mongoose.model('users').countDocuments({email: this._update.email, _id: {$nin: [this._update._id]}});
        if (users > 0) {
            throw NSErrors.LoginSubscribeEmailExisting;
        }
    }
    next();
});

UserSchema.post('save', async function (doc) {
    if (doc.wasNew) {
        aquilaEvents.emit('aqNewUser', doc);
    } else {
        aquilaEvents.emit('aqUpdateUser', doc);
    }
});

UserSchema.post('update', function (result) {
    if ((result.ok && result.nModified === 1) || (result.result && result.result.ok && result.result.nModified === 1)) {
        aquilaEvents.emit('aqUpdateUser', this._conditions, this._update);
    }
});

UserSchema.post('findOneAndUpdate', function (result) {
    if (result) {
        aquilaEvents.emit('aqUpdateUser', {_id: result._id}, this._update);
    }
});

aquilaEvents.emit('userSchemaInit', UserSchema);

module.exports = UserSchema;
