const MongoClient  = require('mongodb').MongoClient;
const ObjectID     = require('mongodb').ObjectID;
const {v4: uuidv4} = require('uuid');
const MongoURI     = require('mongo-uri');
const bcrypt       = require('bcrypt');
const rimraf       = require('rimraf');
const path         = require('path');
const {exec}       = require('child_process');
const faker        = require('faker');
const fs           = require('../utils/fsp');
const {
    Bills,
    Orders,
    Cart,
    Products,
    Users,
    Modules,
    Newsletters
}                  = require('../orm/models');
const aquilaEvents = require('../utils/aquilaEvents');
const appdirname   = path.dirname(require.main.filename);
faker.locale       = 'fr';
/*
RGPD : Exemple de fonction à implémenter dans un module utilisant les données users
*/

// const aquilaEvents = require('../../../utils/aquilaEvents');
// // On catch l'évènement de suppression d'un user
// aquilaEvents.on('aqRemoveUser', function(doc){
//     // Remplacer "id_user" par le nom du champ faisant référence à l'user dans le modèle du module
//     model.find({'id_user': doc._id}).then(function (obj) {
//         for (let i = 0; i < obj.length; i++) {
//             // On supprime le hamp faisant référence à l'user dans le modèle du module
//             obj[i].id_user = undefined;
//             // Si besoin, anonymiser d'autres données
//             obj[i].save();
//         }
//     });
// });

const getOrdersByUser = async (id) => {
    return Orders.find({'customer.id': id}, '-__v').lean();
};

const anonymizeOrdersByUser = async (id) => {
    const firstName = faker.name.firstName();
    const lastName  = faker.name.lastName();
    const email  = faker.internet.email();
    return Orders.updateMany({'customer.id': id}, {
        $set : {
            "customer.email"    : email,
            "customer.phone"    : faker.phone.phoneNumber(),
            "customer.fullname" : `${firstName} ${lastName}`,
            addresses           : {
                billing  : generateFakeAddresses({firstname: firstName, lastname: lastName}),
                shipping : generateFakeAddresses({firstname: firstName, lastname: lastName})
            }
        }
    });
};

const getCartsByUser = async (id) => {
    return Cart.find({'customer.id': id}, '-__v').lean();
};

const getReviewsByUser = async (id) => {
    const products = await Products.find({"reviews.datas.id_client": id}).lean();
    const datas = [];
    for (let i = 0; i < products.length; i++) {
        for (let j = 0; j < products[i].reviews.datas.length; j++) {
            if (products[i].reviews.datas[j].id_client.toString() === id.toString()) {
                datas.push(products[i].reviews.datas[j]);
            }
        }
    }
    return datas;
};

const anonymizeCartsByUser = async (id) => {
    return Cart.updateMany({'customer.id': id}, {
        $set : {
            "customer.email" : faker.internet.email(),
            "customer.phone" : faker.phone.phoneNumber()
        }
    });
};

const getUserById = async (id) => {
    return Users.findOne({_id: id}).lean();
};

const getBillsByUser = async (id) => {
    return Bills.find({client: id}, '-__v').lean();
};

const anonymizeModulesByUser = async (user) => {
    const _modules = await Modules.find({active: true});
    if (_modules.length >= 0) {
        for (const module of _modules) {
            await new Promise(async (resolve, reject) => {
                // Récupère les fichiers rgpd.js des modules
                if (await fs.access(`${appdirname}/modules/${module.name}/rgpd.js`)) {
                    const rgpd = require(`${appdirname}/modules/${module.name}/rgpd.js`);
                    await rgpd.anonymize(user, resolve, reject);
                }
                resolve();
            });
        }
    }
};

const anonymizeBillsByUser = async (id) => {
    return Bills.updateMany({client: id}, {
        $set : {
            nom         : faker.name.lastName(),
            prenom      : faker.name.firstName(),
            societe     : faker.random.word(),
            coordonnees : faker.phone.phoneNumber(),
            email       : faker.internet.email()
        }
    });
};

const anonymizeReviewsByUser = async (id) => {
    return Products.updateMany({'reviews.datas.id_client': id}, {
        $set : {
            "reviews.datas.$.ip_client" : faker.internet.ip(),
            "reviews.datas.$.name"      : faker.name.firstName()
        }
    });
};

const anonymizeUser = async (id) => {
    const firstName = faker.name.firstName();
    const lastName  = faker.name.lastName();
    const email  = faker.internet.email();
    return Users.updateOne({_id: id}, {
        $set : {
            email,
            code             : uuidv4(),
            title            : Math.random() < 0.5 ? "M." : "Mme",
            firstname        : firstName,
            lastname         : lastName,
            phone            : faker.phone.phoneNumber(),
            company          : {},
            billing_address  : 0,
            delivery_address : 0,
            addresses        : [
                generateFakeAddresses({firstname: firstName, lastname: lastName, _id: new ObjectID()})
            ],
            birthDate    : faker.date.past(),
            creationDate : new Date()
        }
    });
};

// !!!!!!!!!!!!!!!!!!!!!!!!!! Mettre à jour les champs si besoin !!!!!!!!!!!!!!!!!!!!!!!!!!
/*
* Clone la base de données passée en paramètre puis remplace les données utilisateurs par des données fake
 */
const copyDatabase = async (cb) => {
    // Connexion à la database
    try {
        await rimraf('dump');
        await mongodump(global.envFile.db);
        await mongorestore(global.envFile.db);
        await rimraf('dump');

        // Anonymisation de la base de données copiée
        await anonymizeDatabase(cb);
    } catch (err) {
        console.error(err);
        throw err;
    }
};

function mongodump(uri) {
    const data = MongoURI.parse(uri);
    let cmd = createConnectionStringMongoose(data);
    if (data.database) {
        cmd += ` --db ${data.database}`;
    }
    return new Promise((resolve, reject) => {
        exec(`mongodump${cmd}`, (error, stdout) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(stdout);
        });
    });
}

function mongorestore(uri) {
    const data = MongoURI.parse(uri);
    const cmd = createConnectionStringMongoose(data);
    return new Promise((resolve, reject) => {
        exec(`mongorestore${cmd} --db ${data.database}_anonymized --drop dump/${data.database}`, (error, stdout) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(stdout);
        });
    });
}

/*
* Remplace les données utilisateurs par des données fake
 */
const anonymizeDatabase = async (cb) => {
    // Connexion à la nouvelle database
    const databaseName = global.envFile.db.replace(/mongodb:\/\/(.*@)?/g, "").replace(/\?.*/g, '').split('/')[1];
    const client = await MongoClient.connect(
        global.envFile.db.replace(
            databaseName,
            `${databaseName}_anonymized`
        ),
        {
            useNewUrlParser    : true,
            useUnifiedTopology : true
        }
    );
    const database = client.db(`${databaseName}_anonymized`);

    // Génération d'un mot de passe commun
    const hash = await bcrypt.hash("password", 10);
    const users = await database.collection('users').find({}).toArray();
    for (let i = 0; i < users.length; i++) {
        const firstName = faker.name.firstName();
        const lastName = faker.name.lastName();
        const email = faker.internet.email();
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
                title            : Math.random() < 0.5 ? "M." : "Mme",
                firstname        : firstName,
                lastname         : lastName,
                phone            : faker.phone.phoneNumber(),
                company          : {},
                billing_address  : 0,
                delivery_address : 0,
                addresses        : [
                    generateFakeAddresses({firstname: firstName, lastname: lastName, _id: new ObjectID()})
                ],
                birthDate    : faker.date.past(),
                creationDate : new Date()
            }
        });
    }
    const orders = await database.collection('orders').find({}).toArray();
    for (let i = 0; i < orders.length; i++) {
        await database.collection('orders').findOneAndUpdate({
            _id : orders[i]._id
        }, {
            $set : {
                "customer.email"    : faker.internet.email(),
                "customer.phone"    : faker.phone.phoneNumber(),
                "customer.fullname" : `${faker.name.firstName()} ${faker.name.lastName()}`,
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
                "customer.email" : faker.internet.email(),
                "customer.phone" : faker.phone.phoneNumber()
            }
        });
    }
    const products = await database.collection('products').find({}).toArray();
    for (let i = 0; i < products.length; i++) {
        const datas = products[i].reviews.datas;
        for (let j = 0; j < products[i].reviews.datas.length; j++) {
            datas[j].ip_client = faker.internet.ip();
            datas[j].name = faker.name.firstName();
            await database.collection('products').findOneAndUpdate({_id: products[i]._id}, {
                $set : {
                    "reviews.datas" : datas
                }
            });
        }
    }
    const _modules = await Modules.find({active: true});
    if (_modules.length >= 0) {
        for (const mod of _modules) {
            await new Promise(async (resolve, reject) => {
                if (await fs.access(`${appdirname}/modules/${mod.name}/rgpd.js`)) {
                    const rgpd = require(`${appdirname}/modules/${mod.name}/rgpd.js`);
                    await rgpd.anonymizeDatabase(database, resolve, reject);
                }
                resolve();
            });
        }
        await client.close();
        if (cb !== undefined) {
            cb();
        }
    } else {
        await client.close();
        if (cb !== undefined) {
            cb();
        }
    }
};

/*
* Supprime la base de données de copie
 */
const dropDatabase = async () => {
    const client = await MongoClient.connect(
        global.envFile.db.replace(
            global.envFile.db.replace(/mongodb:\/\/(.*@)?/g, "").replace(/\?.*/g, '').split('/')[1],
            `${global.envFile.db.replace(/mongodb:\/\/(.*@)?/g, "").replace(/\?.*/g, '').split('/')[1]}_anonymized`
        ),
        {
            useNewUrlParser    : true,
            useUnifiedTopology : true
        }
    );
    const db = client.db(`${global.envFile.db.replace(/mongodb:\/\/(.*@)?/g, "").replace(/\?.*/g, '').split('/')[1]}_anonymized`);
    await db.dropDatabase();
};

const deleteUserDatas = async (id) => {
    // User
    const thisUser = await Users.findOne({_id: id});
    const email = thisUser.email;
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

    // Leve un evenement, qui peut etre catché par n'importe quel module (d'export de datas)
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

    // Leve un evenement, qui peut etre catché par n'importe quel module (d'export de datas)
    aquilaEvents.emit('aqUserAnonymized', id);
};

const createConnectionStringMongoose = async (data) => {
    let cmd = "";
    if (data.options && data.options.replicaSet && data.hosts) {
        cmd += ` --host "${data.options.replicaSet}/${data.hosts.map((h, i) => `${h}${data.ports[i] ? (`:${data.ports[i]}`) : ''},`)}"`;
    } else {
        cmd += ` --host "${data.hosts.map((h, i) => `${h}${data.ports[i] ? (`:${data.ports[i]}`) : ''},`)}"`;
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
        complementaryInfo : ""
    };
    if (options) {
        for (let i = 0; i < Object.keys(options).length; i++) {
            addr[Object.keys(options)[i]] = Object.values[i];
        }
    }
    return addr;
};

module.exports = {
    getOrdersByUser,
    anonymizeOrdersByUser,
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
    anonymizeUserDatas
};
