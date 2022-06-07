/* eslint-disable no-empty */
/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2022 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

/* eslint-disable arrow-body-style */
const fs   = require('fs');
const fsp  = require('fs').promises;
const path = require('path');

/**
 * Asynchronously tests a user's permissions for the file specified by path.
 * @param path A path to a file or directory. If a URL is provided, it must use the `file:` protocol.
 * URL support is _experimental_.
 */
const access = async (path, mode = fs.constants.R_OK) => {
    return fsp.access(path, mode);
};

const hasAccess = async (path, mode) => {
    try {
        await access(path, mode);
        return true;
    } catch (err) {
        if (err.code === 'ENOENT') {
            return false;
        }
        throw err;
    }
};

/**
 * ensure a directory exists and create the arborescence if not
 * @param {string | Buffer | URL} path A path to a file or directory.
 * If a URL is provided, it must use the `file:` protocol. URL support is _experimental_.
 */
const ensureDir = (path) => {
    return fsp.mkdir(path, {recursive: true});
};

/**
 * copy all files in source directory to destination
 * @param {string | Buffer | URL} src A path to a file or directory.
 * If a URL is provided, it must use the `file:` protocol. URL support is _experimental_.
 * @param {string | Buffer | URL} dest A path to a file or directory.
 * If a URL is provided, it must use the `file:` protocol. URL support is _experimental_.
 * @param {string[]} excludes Array of paths to exclude (does not support glob/pattern).
 */
const copyRecursive = async (src, dest, override = false, excludes = []) => {
    if (Array.isArray(excludes)) {
        for (const pth of excludes) {
            if (path.resolve(pth) === path.resolve(src)) return;
        }
    }
    if (excludes !== [] && excludes.includes(src.split('\\')[src.split('\\').length - 1])) {
        return;
    }
    try {
        let srcAccess = false;
        try {
            await fsp.access(src, fs.constants.R_OK);
            srcAccess = true;
        } catch (err) {}
        const srcStat = await fsp.stat(src);
        if (srcAccess && srcStat.isDirectory()) {
            await fsp.mkdir(path.dirname(dest), {recursive: true});
            for (const childItemName of await fsp.readdir(src, 'utf-8')) {
                await copyRecursive(
                    path.resolve(src, childItemName),
                    path.resolve(dest, childItemName),
                    override,
                    excludes
                );
            }
        } else {
            await fsp.mkdir(path.dirname(dest), {recursive: true});
            if (override) {
                await fsp.copyFile(src, dest);
            } else {
                try {
                    await fsp.copyFile(src, dest, fs.constants.COPYFILE_EXCL);
                } catch (err) {}
            }
        }
    } catch (err) {
        console.error(err);
    }
};

/**
 * delete a file or a folder recursively
 * @param {string | Buffer | URL} filePath A path to a file or directory.
 * If a URL is provided, it must use the `file:` protocol. URL support is _experimental_.
 */
const deleteRecursive = async (filePath) => {
    if (await hasAccess(filePath)) {
        const statFile = await fsp.lstat(filePath);
        if (statFile.isFile()) {
            await fsp.unlink(filePath);
        } else if (statFile.isDirectory()) {
            if (await hasAccess(filePath)) {
                for (const file of await fsp.readdir(filePath, 'utf-8')) {
                    await deleteRecursive(path.resolve(filePath, file));
                }
                await fsp.rmdir(filePath);
            }
        }
    }
};

/**
 * @see https://stackoverflow.com/questions/8579055/how-do-i-move-files-in-node-js/29105404#29105404
 * @param {string | Buffer | URL} oldPath path to be moved
 * @param {string | Buffer | URL} newPath path were to move
 * @param {{ mkdirp: boolean }} options
 */
const moveFile = async (oldPath, newPath, options = {}) => {
    if (options.mkdirp) {
        await fsp.mkdir(newPath, {recursive: true});
    }
    try {
        await fsp.rename(oldPath, newPath);
    } catch (err) {
        if (err.code === 'EXDEV') {
            const readStream  = fs.createReadStream(oldPath);
            const writeStream = fs.createWriteStream(newPath);

            readStream.on('error', (err) => {throw err;});
            writeStream.on('error', (err) => {throw err;});

            readStream.on('close', async () => {
                await fsp.unlink(oldPath);
            });
            readStream.pipe(writeStream);
        } else {
            throw err;
        }
    }
};

module.exports = {
    ...fs,
    ...fsp,
    access,
    hasAccess,
    ensureDir,
    moveFile,
    copyRecursive,
    deleteRecursive
};
