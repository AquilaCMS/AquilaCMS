/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const imagemin                    = require('imagemin');
const imageminGifsicle            = require('imagemin-gifsicle');
const imageminJpegtran            = require('imagemin-jpegtran');
const imageminMozjpeg             = require('imagemin-mozjpeg');
const {default: imageminPngquant} = require('imagemin-pngquant');
const imageminSvgo                = require('imagemin-svgo');
const path                        = require('path');
const fsp                         = require('./fsp');
const utilsModules                = require('./modules');

const compressImg = async (pathIn, pathOut, filename, quality = 80) => {
    const filePathOut = pathOut + path.basename(pathIn);
    const extension   = path.extname(filename);
    const filePathIn  = pathIn.replace(extension, '');
    if (quality > 100) {
        quality = 100;
    } else if (quality < 10) {
        quality = 10;
    }

    try {
        // We remove the extension, we let imagemin check if the extension matches well
        const files = await imagemin([`${filePathIn}.{jpg,JPG,jpeg,JPEG,png,PNG,svg,SVG,gif,GIF}`], {
            destination : pathOut,
            plugins     : [
                imageminGifsicle(),
                imageminJpegtran({progressive: false}),
                imageminMozjpeg({quality, progressive: false}),
                imageminPngquant({quality: [(quality - 10) / 100, (quality + 10) / 100], speed: 1, strip: true}),
                imageminSvgo()
            ]
        });
        let pathToReturn;
        if (files.length) {
            pathToReturn = files[0].sourcePath;
        } else {
            await fsp.rename(pathIn, filePathOut);
            pathToReturn = filePathOut;
        }
        return pathToReturn.replace(/\\/g, '/');
    } catch (error) {
        console.error('error =>', error);
        await fsp.rename(pathIn, filePathOut);
        return filePathOut.replace(/\\/g, '/');
    }
};

const getProductImageUrl = (product) => {
    if (product.selected_variant && product.selected_variant.images) {
        return product.selected_variant.images.find((img) => img.default) ? product.selected_variant.images.find((img) => img.default).url : '';
    }
    return product.images.find((i) => i.default) ? product.images.find((i) => i.default).url : '';
};

// Generic file deletion function
const deleteFile = async (filePath) => {
    if (filePath) {
        await utilsModules.modulesLoadFunctions('removeFile', {key: filePath}, async () => {
            // Since the execution context is different, we can't use the imports at the top
            const pathUpload   = require('./server').getUploadDirectory();
            const pathToRemove = path.resolve(pathUpload, filePath);
            if (pathToRemove && fsp.existsSync(pathToRemove)) {
                try {
                    await fsp.unlink(pathToRemove);
                } catch (err) {
                    console.error(err);
                    throw err;
                }
            }
        });
    }
};

// Generic folder deletion function
const deleteFolder = async (folderPath) => {
    if (folderPath) {
        await utilsModules.modulesLoadFunctions('removeFolder', {folder: folderPath}, async () => {
            // Since the execution context is different, we can't use the imports at the top
            const pathUpload   = require('./server').getUploadDirectory();
            const pathToRemove = path.resolve(pathUpload, folderPath);
            if (fsp.existsSync(pathToRemove)) {
                await fsp.deleteRecursive(pathToRemove);
            }
        });
    }
};

// Generic file renaming function
const renameFile = async (pathIn, filePathOut) => {
    if (pathIn && filePathOut) {
        await utilsModules.modulesLoadFunctions('renameFile', {
            inPath  : pathIn,
            outPath : filePathOut
        }, async () => {
            // Since the execution context is different, we can't use the imports at the top
            const pathUpload = require('./server').getUploadDirectory();
            const oldPath    = path.resolve(pathUpload, pathIn);
            const newPath    = path.resolve(pathUpload, filePathOut);
            if (oldPath && fsp.existsSync(oldPath)) {
                try {
                    await fsp.rename(pathIn, newPath);
                } catch (err) {
                    console.error(err);
                    throw err;
                }
            }
        });
    }
};

// Generic file presence test function
const existsFile = async (key) => {
    if (key) {
        return utilsModules.modulesLoadFunctions('existsFile', {key}, async () => {
            // Since the execution context is different, we can't use the imports at the top
            const pathUpload  = require('./server').getUploadDirectory();
            const pathToCheck = path.resolve(pathUpload, key);
            if (pathToCheck && await fsp.existsSync(pathToCheck)) {
                return true;
            }
            return false;
        });
    }
};

module.exports = {
    compressImg,
    getProductImageUrl,
    deleteFile,
    deleteFolder,
    renameFile,
    existsFile
};