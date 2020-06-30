const crypto = require("crypto");

exports.cipher = function (dataToEncrypt) {
    if (global.envFile.encryption && global.envFile.encryption.method && global.envFile.encryption.password) {
        const cipher = crypto.createCipher(global.envFile.encryption.method, global.envFile.encryption.password);
        let encrypted = cipher.update(dataToEncrypt, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return encrypted;
    }

    console.error("Encryption config is empty. Please read the instruction");
    console.info(`=== Utilisation ===
        Dans "env.js" :
        - faire un objet "encryption" avec "method" et "password"
        - method = voir encryption list au démarrage du serveur :
        - password = mot de passe utilisé pour généré la clé de chiffrement
        Si les champs devant être chiffré ne le sont pas, une route est disponible dans "devScripts.js", ex: http://local.host:3010/api/encryption/cipher (dans postman, ne pas oublier le JWT admin).`);
    console.info("Encryption list : ", crypto.getCiphers());

    return dataToEncrypt;
};

exports.decipher = function (dataToDecrypt) {
    if (global.envFile.encryption && global.envFile.encryption.method && global.envFile.encryption.password) {
        const decipher = crypto.createDecipher(global.envFile.encryption.method, global.envFile.encryption.password);
        let decrypted = decipher.update(dataToDecrypt, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
    return dataToDecrypt;
};