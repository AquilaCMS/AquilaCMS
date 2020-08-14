/* eslint-disable arrow-body-style */
const fs   = require('fs');
const path = require('path');

/**
 * Synchronously reads the entire contents of a file.
 * @param {string | Number | Buffer | URL} path A path to a file. If a URL is provided, it must use the file: protocol. If a file descriptor is provided, the underlying file will not be closed automatically.
 * @param {string | { flags?: string; encoding?: string; fd?: number; mode?: number; autoClose?: boolean; start?: number; end?: number; highWaterMark?: number; }} options
 *  Either the encoding for the file, or an object optionally specifying the encoding, file mode, and flag. If `encoding` is not supplied, the default of `'utf8'` is used. If mode is not supplied, the default of `0o666` is used. If `mode` is a string, it is parsed as an octal integer. If `flag` is not supplied, the default of `'w'` is used.
 * @returns {Promise<string | Buffer> | Error}
 */
const readFile = (path, options = {encoding: 'utf8'}) => {
    return new Promise((resolve, reject) => {
        let readData = '';
        fs.createReadStream(path, options)
            .on('data', (data) => {
                readData += data;
            })
            .on('close', () => {
                resolve(readData);
            })
            .on('error', (err) => {
                reject(err);
            });
    });
};

/**
 * Synchronously writes data to a file, replacing the file if it already exists.
 * @param {string | Number | Buffer | URL} path A path to a file. If a URL is provided, it must use the `file:` protocol. URL support is experimental. If a file descriptor is provided, the underlying file will not be closed automatically.
 * @param {any} data The data to write.
 * @param {string | { flags?: string; encoding?: string; fd?: number; mode?: number; autoClose?: boolean; start?: number; highWaterMark?: number; }} options Either the encoding for the file, or an object optionally specifying the encoding, file mode, and flag. If `encoding` is not supplied, the default of `'utf8'` is used. If mode is not supplied, the default of `0o666` is used. If `mode` is a string, it is parsed as an octal integer. If `flag` is not supplied, the default of `'w'` is used.
 */
const writeFile = (path, data = '', options = 'utf8') => {
    return new Promise((resolve, reject) => {
        const cws = fs.createWriteStream(path, options);
        cws.on('finish', () => {
            resolve();
        });
        cws.on('error', (err) => {
            reject(err);
        });
        cws.write(data);
        cws.end();
    });
};

/**
 * Asynchronous readdir - read a directory.
 * @param {string | Buffer | URL} path  A path to a file. If a URL is provided, it must use the `file:` protocol.
 * @param {"ascii" | "utf8" | "utf-8" | "utf16le" | "ucs2" | "ucs-2" | "base64" | "latin1" | "binary" | "hex" | {encoding: BufferEncoding; withFileTypes?: false;}} options The encoding (or an object specifying the encoding), used as the encoding of the result. If not provided, `'utf8'` is used.
 */
const readdir = (path, options = 'utf8') => {
    return new Promise((resolve, reject) => {
        fs.readdir(path, options, (err, files) => {
            if (err) reject(err);
            resolve(files);
        });
    });
};

/**
 * Asynchronous unlink - delete a name and possibly the file it refers to.
 * @param {string | Buffer | URL} path A path to a file. If a URL is provided, it must use the `file:` protocol.
 */
const unlink = (path) => {
    return new Promise((resolve, reject) => {
        fs.unlink(path, (err) => {
            if (err) reject(err);
            resolve();
        });
    });
};

/**
 * Synchronous stat - Get file status.
 * @param {string | Buffer | URL} path A path to a file. If a URL is provided, it must use the `file:` protocol.
 * @returns {Promise<fs.Stats> | NodeJS.ErrnoException}
 */
const stat = (path) => {
    return new Promise((resolve, reject) => {
        fs.stat(path, function (err, stats) {
            if (err) reject(err);
            resolve(stats);
        });
    });
};

/**
 * Asynchronous mkdir - create a directory.
 * @param {string | Buffer | URL} path A path to a file. If a URL is provided, it must use the `file:` protocol.
 * @param {string | number | { recursive: boolean, mode: number}} options Either the file mode, or an object optionally specifying the file mode and whether parent folders should be created. If a string is passed, it is parsed as an octal integer. If not specified, defaults to `0o777`.
 */
const mkdir = (path, options = {recursive: false}) => {
    return new Promise((resolve, reject) => {
        fs.mkdir(path, options, (err) => {
            if (err) reject(err);
            resolve();
        });
    });
};

/**
 * Synchronously tests a user's permissions for the file specified by path.
 * @param {string | Buffer | URL} path A path to a file or directory. If a URL is provided, it must use the `file:` protocol. URL support is _experimental_.
 * @param {Number} mode see : https://nodejs.org/api/fs.html#fs_file_access_constants
 * @returns {Promise<Boolean>} Promise<boolean>
 */
const access = (path, mode = fs.constants.F_OK) => {
    return new Promise((resolve, reject) => {
        fs.access(path, mode, (err) => {
            if (err) {
                if (err.code === 'ENOENT') {
                    resolve(false);
                }
                reject(err);
            }
            resolve(true);
        });
    });
};

/**
 * ensure a directory exists and create the arborescence if not
 * @param {string | Buffer | URL} path A path to a file or directory.
 * If a URL is provided, it must use the `file:` protocol. URL support is _experimental_.
 */
const ensureDir = (path) => {
    return new Promise((resolve, reject) => {
        Promise.resolve(mkdir(path, {recursive: true}))
            .then(() => resolve())
            .catch((err) => reject(err));
    });
};

/**
 * Synchronously copies src to dest. By default, dest is overwritten if it already exists.
 * No arguments other than a possible exception are given to the callback function.
 * Node.js makes no guarantees about the atomicity of the copy operation.
 * If an error occurs after the destination file has been opened for writing, Node.js will attempt to remove the destination.
 * @param {string | Buffer | URL} src A path to the source file.
 * @param {string | Buffer | URL} dest A path to the destination file.
 * @param {number} mode An integer that specifies the behavior of the copy operation.
 * The only supported flag is fs.constants.COPYFILE_EXCL, which causes the copy operation to fail if dest already exists.
 */
const copyFile = async (src, dest, mode = 0) => {
    return new Promise((resolve, reject) => {
        fs.copyFile(src, dest, mode, (err) => {
            if (err) reject(err);
            resolve();
        });
    });
};

/**
 * Get file status synchronously. Does not dereference symbolic links.
 * @param {string | Buffer | URL} path A path to a file. If a URL is provided, it must use the `file:` protocol.
 * @returns {Promise<fs.Stats> | NodeJS.ErrnoException}
 */
const lstat = (path) => {
    return new Promise((resolve, reject) => {
        fs.lstat(path, (err, stats) => {
            if (err) reject(err);
            resolve(stats);
        });
    });
};

/**
 * copy all files in source directory to destination
 * @param {string | Buffer | URL} src A path to a file or directory.
 * If a URL is provided, it must use the `file:` protocol. URL support is _experimental_.
 * @param {string | Buffer | URL} dest A path to a file or directory.
 * If a URL is provided, it must use the `file:` protocol. URL support is _experimental_.
 * @param {string[]} except A path to a file or directory.
 * Array of names for excepted files and folders
 */
const copyRecursiveSync = async (src, dest, override = false, except = []) => {
    if (except !== [] && except.includes(src.split('\\')[src.split('\\').length - 1])) {
        return;
    }
    try {
        if (await access(src) && fs.statSync(src).isDirectory()) {
            if (!(await access(dest))) {
                await mkdir(dest, {recursive: true});
            }
            (await readdir(src)).forEach(async (childItemName) => {
                await copyRecursiveSync(
                    path.join(src, childItemName),
                    path.join(dest, childItemName),
                    override,
                    except
                );
            });
        } else if (!(await access(dest, fs.constants.W_OK))) {
            if (!(await access(path.dirname(dest), fs.constants.W_OK))) {
                await mkdir(path.dirname(dest), {recursive: true});
            }
            if (override) {
                console.log(src);
                await copyFile(src, dest);
            } else {
                try {
                    await copyFile(src, dest, fs.constants.COPYFILE_EXCL);
                // eslint-disable-next-line no-empty
                } catch (err) {}
            }
        }
    } catch (except) { console.error(except); }
};

/**
 * delete a folder recursively
 * @param {string | Buffer | URL} folder A path to a file or directory.
 * If a URL is provided, it must use the `file:` protocol. URL support is _experimental_.
 */
const deleteRecursiveSync = async (folder) => {
    const statDirectory = await lstat(folder);
    if (!statDirectory.isDirectory()) {
        console.error(`"${folder}" is not a directory`);
        return;
    }
    if (await access(folder)) {
        for (const file of await readdir(folder)) {
            const curPath = path.join(folder, file);
            const statSubDirectory = await lstat(curPath);
            if (statSubDirectory.isDirectory()) { // recurse
                await deleteRecursiveSync(curPath);
            } else { // delete file
                await unlink(curPath);
            }
        }
        fs.rmdirSync(folder);
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
        await mkdir(newPath, {recursive: true});
    }
    return new Promise((resolve, reject) => {
        fs.rename(oldPath, newPath, (err) => {
            if (err) {
                if (err.code === 'EXDEV') {
                    const readStream = fs.createReadStream(oldPath);
                    const writeStream = fs.createWriteStream(newPath);

                    readStream.on('error', (err) => reject(err));
                    writeStream.on('error', (err) => reject(err));

                    readStream.on('close', async () => {
                        try {
                            await unlink(oldPath);
                        } catch (err) {
                            reject(err);
                        }
                    });
                    readStream.pipe(writeStream);
                } else {
                    reject(err);
                }
            }
            resolve();
        });
    });
};

/**
 * Synchronous rename - Change the name or location of a file or directory.
 * @param {string | Buffer | URL} oldPath A path to a file. If a URL is provided, it must use the `file:` protocol. URL support is experimental.
 * @param {string | Buffer | URL} newPathA path to a file. If a URL is provided, it must use the `file:` protocol. URL support is experimental.
 */
const rename = async (oldPath, newPath) => {
    return new Promise((resolve, reject) => {
        try {
            fs.rename(oldPath, newPath, () => {
                resolve();
            });
        } catch (err) {
            reject(err);
        }
    });
};

module.exports = {
    ...fs,
    readFile,
    writeFile,
    readdir,
    unlink,
    stat,
    mkdir,
    access,
    ensureDir,
    copyRecursiveSync,
    deleteRecursiveSync,
    moveFile,
    lstat,
    rename,
    copyFile
};
