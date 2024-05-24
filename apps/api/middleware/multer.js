const multer       = require('multer');
const path         = require('path');
const {v1: uuidv1} = require('uuid');
const serverUtils  = require('../utils/server');

const photoPath = serverUtils.getUploadDirectory();

const storage = multer.diskStorage({
    destination : path.join(global.aquila.aqlPath, photoPath, 'temp'),
    filename(req, file, cb) {
        cb(null, uuidv1() + path.extname(file.originalname));
    }
});

const storageMemory = multer.memoryStorage();

exports.multerUpload       = multer({storage, limits: {fileSize: 1048576000}});
exports.multerUploadMemory = multer({storage: storageMemory, limits: {fileSize: 1048576000}});
