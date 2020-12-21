/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const crypto    = require('crypto');
const IV_LENGTH = 16;

const cipher = (dataToEncrypt) => {
    if (global.envFile.encryption && global.envFile.encryption.method && global.envFile.encryption.password) {
        const {method, password} = global.envFile.encryption;
        const iv                 = crypto.randomBytes(IV_LENGTH);
        const cipher             = crypto.createCipheriv(method, Buffer.from(password, 'hex'), iv);
        let encrypted            = cipher.update(dataToEncrypt);
        encrypted                = Buffer.concat([encrypted, cipher.final()]);
        return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
    }

    console.error('Encryption config is empty. Please read the instruction');
    console.info(`=== Usage ===
        In "env.json" :
        - make an "encryption" object with "method" and "password"
        - method = see encryption list when starting the server
        - password = password used to generate the encryption key
        If the fields to be encrypted are not, a route is available in "devScripts.js",
        ex: http://localhost:3010/api/encryption/cipher`);
    console.info('Encryption list : ', crypto.getCiphers());

    return dataToEncrypt;
};

const decipher = (dataToDecrypt) => {
    if (global.envFile.encryption && global.envFile.encryption.method && global.envFile.encryption.password) {
        const {method, password} = global.envFile.encryption;
        const textParts          = dataToDecrypt.split(':');
        const iv                 = Buffer.from(textParts.shift(), 'hex');
        const encryptedText      = Buffer.from(textParts.join(':'), 'hex');
        const decipher           = crypto.createDecipheriv(method, Buffer.from(password, 'hex'), iv);
        let decrypted            = decipher.update(encryptedText);
        decrypted                = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    }
    return dataToDecrypt;
};

module.exports = {
    cipher,
    decipher
};