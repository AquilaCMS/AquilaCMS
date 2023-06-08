/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const {
    Types: {ObjectId: ObjectID},
    mongo: {MongoClient}
} = require('mongoose');
const {v4: uuidv4}                = require('uuid');
const mongoURI                    = require('mongodb-uri');
const bcrypt                      = require('bcrypt');
const rimraf                      = require('rimraf');
const path                        = require('path');
const faker                       = require('faker');
const moment                      = require('moment');
const {fs, aquilaEvents, execCmd} = require('aql-utils');
const NSErrors                    = require('../utils/errors/NSErrors');
const appdirname                  = path.dirname(require.main.filename);
faker.locale                      = 'fr';
const {
    Bills,
    Orders,
    Cart,
    Products,
    Users,
    Modules,
    Newsletters
} = require('../orm/models');
/*
RGPD : Example of a function to implement in a module using users data
*/

// const {aquilaEvents} = require('aql-utils');
// // We catch the event delete of a user
// aquilaEvents.on('aqRemoveUser', function(doc){
//     // Replace "id_user" by the name of the field referring to the user in the module model
//     model.find({'id_user': doc._id}).then(function (obj) {
//         for (let i = 0; i < obj.length; i++) {
//             // We delete the hamp referring to the user in the module model
//             obj[i].id_user = undefined;
//             // If necessary, anonymize other data
//             obj[i].save();
//         }
//     });
// });

const getOrdersByUser = async (id) => Orders.find({'customer.id': id}, '-__v').lean();

const anonymizeOrdersByUser = async (id) => {
    const firstName = faker.name.firstName();
    const lastName  = faker.name.lastName();
    const email     = `${faker.internet.email()}_`;
    return Orders.updateMany({'customer.id': id}, {
        $set : {
            'customer.email'    : email,
            'customer.phone'    : faker.phone.phoneNumber(),
            'customer.fullname' : `${firstName} ${lastName}`,
            addresses           : {
                billing  : generateFakeAddresses({firstname: firstName, lastname: lastName}),
                shipping : generateFakeAddresses({firstname: firstName, lastname: lastName})
            }
        }
    });
};

const getCartsByUser = async (id) => Cart.find({'customer.id': id}, '-__v').lean();

const getReviewsByUser = async (id) => {
    const products = await Products.find({'reviews.datas.id_client': id}).lean();
    const datas    = [];
    for (let i = 0; i < products.length; i++) {
        for (let j = 0; j < products[i].reviews.datas.length; j++) {
            if (products[i].reviews.datas[j].id_client.toString() === id.toString()) {
                datas.push(products[i].reviews.datas[j]);
            }
        }
    }
    return datas;
};

const anonymizeCartsByUser = async (id) => Cart.updateMany({'customer.id': id}, {
    $set : {
        'customer.email' : `${faker.internet.email()}_`,
        'customer.phone' : faker.phone.phoneNumber()
    }
});

const getUserById = async (id) => Users.findOne({_id: id}).lean();

const getBillsByUser = async (id) => Bills.find({client: id}, '-__v').lean();

const anonymizeModulesByUser = async (user) => {
    const _modules = await Modules.find({active: true});
    for (const module of _modules) {
        await new Promise(async (resolve, reject) => {
            // Retrieves rgpd.js files from modules
            if (await fs.hasAccess(`${appdirname}/modules/${module.name}/rgpd.js`)) {
                const rgpd = require(`${appdirname}/modules/${module.name}/rgpd.js`);
                await rgpd.anonymize(user, resolve, reject);
            }
            resolve();
        });
    }
};

const anonymizeBillsByUser = async (id) => Bills.updateMany({client: id}, {
    $set : {
        nom         : faker.name.lastName(),
        prenom      : faker.name.firstName(),
        societe     : faker.random.word(),
        coordonnees : faker.phone.phoneNumber(),
        email       : `${faker.internet.email()}_`
    }
});

const anonymizeReviewsByUser = async (id) => Products.updateMany({}, {
    $set : {
        'reviews.datas.$[data].ip_client' : faker.internet.ip(),
        'reviews.datas.$[data].name'      : faker.name.firstName()
    }
}, {
    arrayFilters : [{'data.id_client': id}]
});

const anonymizeUser = async (id) => {
    const firstName = faker.name.firstName();
    const lastName  = faker.name.lastName();
    const email     = `${faker.internet.email()}_`;
    return Users.updateOne({_id: id}, {
        $set : {
            email,
            code             : uuidv4(),
            title            : Math.random() < 0.5 ? 'M.' : 'Mme',
            firstname        : firstName,
            lastname         : lastName,
            phone            : faker.phone.phoneNumber(),
            company          : {},
            billing_address  : 0,
            delivery_address : 0,
            addresses        : [
                generateFakeAddresses({firstname: firstName, lastname: lastName, _id: new ObjectID()})
            ],
            birthDate : faker.date.past(),
            createdAt : new Date()
        }
    });
};

// !!!!!!!!!!!!!!!!!!!!!!!!!! Update fields as needed !!!!!!!!!!!!!!!!!!!!!!!!!!
/*
* Clone the database passed in parameter then replace the user data by fake data
 */
const copyDatabase = async () => {
    // Connection to the database
    try {
        await new Promise((resolve, reject) => {
            rimraf('dump', (err) => {
                if (err) return reject(err);
                resolve();
            });
        });
        try {
            await mongodump(global.aquila.envFile.db);
            await mongorestore(global.aquila.envFile.db);
        } catch (error) {
            throw NSErrors.CommandsMayNotInPath;
        }
        await new Promise((resolve, reject) => {
            rimraf('dump', (err) => {
                if (err) return reject(err);
                resolve();
            });
        });

        // Anonymization of the copied database
        await anonymizeDatabase();
    } catch (err) {
        console.error(err);
        throw err;
    }
};

async function mongodump(uri) {
    const data = mongoURI.parse(uri);
    let cmd    = await createConnectionStringMongoose(data);
    if (data.database) {
        cmd += ` --db ${data.database}`;
    }
    const {stdout} = await execCmd(`mongodump${cmd}`);
    return stdout;
}

async function mongorestore(uri) {
    const data     = mongoURI.parse(uri);
    const cmd      = await createConnectionStringMongoose(data);
    const {stdout} = await execCmd(`mongorestore${cmd} --db ${data.database}_anonymized --drop dump/${data.database}`);
    return stdout;
}

/*
* Replaces user data with fake data
 */
const anonymizeDatabase = async () => {
    // Connection to the new database
    const data     = mongoURI.parse(global.aquila.envFile.db);
    data.database += '_anonymized';
    const client   = new MongoClient(
        mongoURI.format(data),
        {
            useNewUrlParser    : true,
            useUnifiedTopology : true
        }
    );
    await client.connect();

    const database = client.db(data.database);

    // Generation of a common password
    const hash  = await bcrypt.hash('password', 10);
    const users = await database.collection('users').find({}).toArray();
    for (let i = 0; i < users.length; i++) {
        const firstName = faker.name.firstName();
        const lastName  = faker.name.lastName();
        const email     = faker.internet.email();
        await database.collection('newsletters').findOneAndUpdate({
            email : users[i].email
        }, {
            $set : {
                email
            }
        });
        await database.collection('users').findOneAndUpdate({
            _id : users[i]._id
        }, {
            $set : {
                email,
                password         : hash,
                code             : uuidv4(),
                title            : Math.random() < 0.5 ? 'M.' : 'Mme',
                firstname        : firstName,
                lastname         : lastName,
                phone            : faker.phone.phoneNumber(),
                company          : {},
                billing_address  : 0,
                delivery_address : 0,
                addresses        : [
                    generateFakeAddresses({firstname: firstName, lastname: lastName, _id: new ObjectID()})
                ],
                birthDate : faker.date.past(),
                createdAt : new Date()
            }
        });
    }
    const orders = await database.collection('orders').find({}).toArray();
    for (let i = 0; i < orders.length; i++) {
        await database.collection('orders').findOneAndUpdate({
            _id : orders[i]._id
        }, {
            $set : {
                'customer.email'    : faker.internet.email(),
                'customer.phone'    : faker.phone.phoneNumber(),
                'customer.fullname' : `${faker.name.firstName()} ${faker.name.lastName()}`,
                addresses           : {
                    delivery : generateFakeAddresses(),
                    billing  : generateFakeAddresses()
                }
            }
        });
    }
    const bills = await database.collection('bills').find({}).toArray();
    for (let i = 0; i < bills.length; i++) {
        await database.collection('bills').findOneAndUpdate({
            _id : bills[i]._id
        }, {
            $set : {
                nom         : faker.name.lastName(),
                prenom      : faker.name.firstName(),
                societe     : faker.random.word(),
                coordonnees : faker.phone.phoneNumber(),
                email       : faker.internet.email()
            }
        });
    }
    const carts = await database.collection('carts').find({}).toArray();
    for (let i = 0; i < carts.length; i++) {
        await database.collection('carts').findOneAndUpdate({
            _id : carts[i]._id
        }, {
            $set : {
                'customer.email' : faker.internet.email(),
                'customer.phone' : faker.phone.phoneNumber()
            }
        });
    }
    const products = await database.collection('products').find({}).toArray();
    for (let i = 0; i < products.length; i++) {
        const datas = products[i].reviews.datas;
        for (let j = 0; j < products[i].reviews.datas.length; j++) {
            datas[j].ip_client = faker.internet.ip();
            datas[j].name      = faker.name.firstName();
            await database.collection('products').findOneAndUpdate({_id: products[i]._id}, {
                $set : {
                    'reviews.datas' : datas
                }
            });
        }
    }
    const _modules = await Modules.find({active: true});
    for (const mod of _modules) {
        await new Promise(async (resolve, reject) => {
            if (await fs.hasAccess(`${appdirname}/modules/${mod.name}/rgpd.js`)) {
                const rgpd = require(`${appdirname}/modules/${mod.name}/rgpd.js`);
                await rgpd.anonymizeDatabase(database, resolve, reject);
            }
            resolve();
        });
    }
    await client.close();
};

/*
* Deletes the copy database
*/
const dropDatabase = async () => {
    const mongodbUri     = mongoURI.parse(global.aquila.envFile.db);
    mongodbUri.database += '_anonymized';
    const client         = new MongoClient(
        mongoURI.format(mongodbUri),
        {
            useNewUrlParser    : true,
            useUnifiedTopology : true
        }
    );
    await client.connect();
    const db = client.db(mongodbUri.database);
    await db.dropDatabase();
};

const deleteUserDatas = async (id) => {
    // User
    const thisUser = await Users.findOne({_id: id});
    const email    = thisUser.email;
    console.log(`User removed : ${email}`);
    await thisUser.remove();

    // Newletter
    const thisNL = await Newsletters.findOne({email});
    if (thisNL) {
        await thisNL.remove();
    }

    await anonymizeOrdersByUser(id);
    await anonymizeCartsByUser(id);
    await anonymizeBillsByUser(id);
    await anonymizeReviewsByUser(id);
    await anonymizeModulesByUser(thisUser);

    // Raises an event, which can be cached by any (data export) module
    aquilaEvents.emit('aqUserRemoved', id);
};

const anonymizeUserDatas = async (id) => {
    // User
    const thisUser = await Users.findOne({_id: id});
    const email    = thisUser.email;
    console.log(`User anonymized : ${email}`);

    // Newletter
    const thisNL = await Newsletters.findOne({email});
    if (thisNL) {
        await thisNL.remove();
    }

    await anonymizeOrdersByUser(id);
    await anonymizeCartsByUser(id);
    await anonymizeBillsByUser(id);
    await anonymizeReviewsByUser(id);
    await anonymizeModulesByUser(thisUser);
    await anonymizeUser(id);

    // Raises an event, which can be cached by any (data export) module
    aquilaEvents.emit('aqUserAnonymized', id);
};

const createConnectionStringMongoose = async (data) => {
    let cmd = '';
    if (data.hosts) {
        // we generate a string
        const commandLine = `${data.hosts.map((oneHost, i) => {
            let portOfDB = '';
            if (data && data.ports && data.ports[i]) {
                portOfDB = `:${data.ports[i]}`;
            }
            return `${oneHost.host}${portOfDB},`;
        })}`;
        if (data.options && data.options.replicaSet) {
            cmd += ` --host "${data.options.replicaSet}/${commandLine}"`;
        } else {
            cmd += ` --host "${commandLine}"`;
        }
    }
    cmd = cmd.replace(',"', '"');
    if (data.options && data.options.ssl) {
        cmd += ' --ssl';
    }
    if (data.username) {
        cmd += ` --username ${data.username}`;
    }
    if (data.password) {
        cmd += ` --password ${data.password}`;
    }
    if (data.options && data.options.authSource) {
        cmd += ` --authenticationDatabase ${data.options.authSource}`;
    }
    return cmd;
};

const generateFakeAddresses = async (options) => {
    const addr = {
        firstname         : faker.name.firstName(),
        lastname          : faker.name.lastName(),
        companyName       : faker.random.word(),
        line1             : faker.address.streetAddress(),
        line2             : faker.address.streetAddress(),
        zipcode           : faker.address.zipCode(),
        city              : faker.address.city(),
        country           : faker.address.country(),
        isoCountryCode    : faker.address.countryCode(),
        complementaryInfo : ''
    };
    if (options) {
        const opts = Object.keys(options);
        for (let i = 0; i < opts.length; i++) {
            addr[opts[i]] = Object.values[i];
        }
    }
    return addr;
};

const dumpAnonymizedDatabase = async () => {
    try {
        await copyDatabase();
        let uri = global.aquila.envFile.db;
        // ReplicaSet management
        if (uri.includes('replicaSet')) {
            uri = uri.replace('?', '_anonymized?');
        } else {
            uri += '_anonymized';
        }
        const pathUpload = require('../utils/server').getUploadDirectory();
        try {
            await execCmd(`mongodump --uri "${uri}" --gzip --archive=./${pathUpload}/temp/database_dump.gz`);
        } catch (err) {
            console.error(err);
        }
        // Removal of the copy database
        await dropDatabase();
        // Download the dump file
        const pathToArchive = path.join(global.aquila.appRoot, pathUpload, 'temp', 'database_dump.gz');
        const temp          = fs.readFile(pathToArchive, 'binary');
        fs.unlink(pathToArchive, function () {
            console.log('File was deleted'); // Callback
        });
        return temp;
    } catch (error) {
        if (error && error.name && error.name === 'NSError') {
            throw error;
        }
        throw NSErrors.InternalError;
    }
};

const anonymizeBillsById = async (id) => Bills.updateOne({_id: id}, {
    $set : {
        client      : new ObjectID(),
        nom         : faker.name.lastName(),
        prenom      : faker.name.firstName(),
        societe     : faker.random.word(),
        coordonnees : faker.phone.phoneNumber(),
        email       : faker.internet.email(),
        address     : {
            firstname      : faker.name.firstName(),
            lastname       : faker.name.lastName(),
            phone_mobile   : faker.phone.phoneNumber(),
            line1          : faker.address.streetAddress(),
            zipcode        : faker.address.zipCode(),
            city           : faker.address.city(),
            isoCountryCode : faker.address.countryCode()
        }
    }
});

// Check the age of the bills for RGPD restrictions
const checkDateBills = async () =>  {
    // 1.get all the bills from the database
    const bills = await Bills.find({});
    // 2.browse the array of bills
    for (let i = 0; i < bills.length; i++) {
        // 3.get the date of the bill
        const creationDate = moment(bills[i].createdAt);
        const now          = moment();
        // 4.calculate the difference between the current date and the date of the bill
        const diff = now.diff(creationDate, 'months');
        // 5.if the difference is superior to 120 months, the bill is deleted
        if (diff > 120 && bills[i].anonymized === false) {
            anonymizeBillsById(bills[i]._id);
            await Bills.updateOne({_id: bills[i]._id}, {$set: {anonymized: true}});
        }
    }
};

// Check the last connexion of the user for RGPD restrictions
const checkLastConnexion = async () => {
    // 1.get all the users from the database
    const users = await Users.find({$or: [{anonymized: {$exists: false}}, {anonymized: false}], isAdmin: false, lastConnexion: {$lte: new Date(Date.now() - (/* 3 ans */ 3 * 365) * 24 * 60 * 60 * 1000)}});
    // 2.browse the array of users
    for (let i = 0; i < users.length; i++) {
        anonymizeUser(users[i]._id);
        await Users.updateOne({_id: users[i]._id}, {$set: {anonymized: true}});
    }
};

module.exports = {
    getOrdersByUser,
    anonymizeOrdersByUser,
    dumpAnonymizedDatabase,
    getCartsByUser,
    getReviewsByUser,
    anonymizeCartsByUser,
    getUserById,
    getBillsByUser,
    anonymizeModulesByUser,
    anonymizeBillsByUser,
    anonymizeReviewsByUser,
    anonymizeUser,
    copyDatabase,
    anonymizeDatabase,
    dropDatabase,
    deleteUserDatas,
    anonymizeUserDatas,
    checkDateBills,
    anonymizeBillsById,
    checkLastConnexion
};