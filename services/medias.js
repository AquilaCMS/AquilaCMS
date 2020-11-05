const AdmZip       = require('adm-zip');
const moment       = require('moment');
const path         = require('path');
const mongoose     = require('mongoose');
const {
    Medias,
    Products,
    Categories,
    Pictos,
    Languages,
    News,
    Gallery,
    Slider,
    Opts,
    Mail
}                      = require('../orm/models');
const utils        = require('../utils/utils');
const utilsModules = require('../utils/modules');
const QueryBuilder = require('../utils/QueryBuilder');
const fsp          = require('../utils/fsp');
const NSErrors     = require('../utils/errors/NSErrors');
const server       = require('../utils/server');
const utilsMedias  = require('../utils/medias');
const {getChar}    = require('./cache');

const restrictedFields = [];
const defaultFields    = ['*'];
const queryBuilder     = new QueryBuilder(Medias, restrictedFields, defaultFields);

/**
 * Permet de télécharger un zip contenant tous le dossier "upload"
 */
const downloadAllDocuments = async () => {
    console.log('Preparing downloadAllDocuments...');
    const uploadDirectory = server.getUploadDirectory();

    await utilsModules.modulesLoadFunctions('downloadAllDocuments', {}, () => {
        if (!fsp.existsSync(`./${uploadDirectory}/temp`)) {
            fsp.mkdirSync(`./${uploadDirectory}/temp`);
        }
        const zip = new AdmZip();
        if (fsp.existsSync(path.resolve(uploadDirectory, 'documents'))) {
            zip.addLocalFolder(path.resolve(uploadDirectory, 'documents'), 'documents');
        }
        if (fsp.existsSync(path.resolve(uploadDirectory, 'medias'))) {
            zip.addLocalFolder(path.resolve(uploadDirectory, 'medias'), 'medias');
        }
        if (fsp.existsSync(path.resolve(uploadDirectory, 'photos'))) {
            zip.addLocalFolder(path.resolve(uploadDirectory, 'photos'), 'photos');
        }
        if (fsp.existsSync(path.resolve(uploadDirectory, 'fonts'))) {
            zip.addLocalFolder(path.resolve(uploadDirectory, 'fonts'), 'fonts');
        }
        zip.writeZip(path.resolve(uploadDirectory, 'temp/documents.zip'), (err) => {
            if (err) console.error(err);
        });
    });
    console.log('Finalize downloadAllDocuments..');
    return fsp.readFile(path.resolve(uploadDirectory, 'temp/documents.zip'), 'binary');
};

/**
 * @description Upload zip with all medias
 */
const uploadAllMedias = async (reqFile, insertDB) => {
    console.log('Upload medias start...');

    const path_init   = reqFile.path;
    const path_unzip  = path_init.split('.')
        .slice(0, -1)
        .join('.');
    const target_path = `./${server.getUploadDirectory()}/medias`;

    const zip = new AdmZip(path_init);
    zip.extractAllTo(path_unzip);
    // Parcourir l'ensemble des fichiers pour les ajouter à la table medias
    const filenames = fsp.readdirSync(path_unzip);
    filenames.forEach(async (filename) => {
        const init_file   = path.resolve(path_unzip, filename);
        const target_file = path.resolve(target_path, filename);
        const name_file   = filename.split('.')
            .slice(0, -1)
            .join('.');

        // Check if folder
        if (fsp.lstatSync(init_file)
            .isDirectory()) {
            return;
        }

        // Déplacer le fichier dans /medias
        require('mv')(init_file, target_file, {mkdirp: true}, (err) => {
            if (err) console.error(err);
        });

        // L'inserer dans la base de données
        if (insertDB) {
            await Medias.create({
                link : `medias/${filename}`,
                name : name_file
            });
        }
    });

    console.log('Upload medias done !');
};

/* **************** Documents **************** *

/**
 * @description Upload zip with all documents
 */
const uploadAllDocuments = async (reqFile) => {
    console.log('Uploading Documents for unzip...');

    const path_init   = reqFile.path;
    const target_path = path.resolve(server.getUploadDirectory());

    const zip = new AdmZip(path_init);
    zip.extractAllTo(target_path);
    console.log('Upload Documents is done !');
};

/**
 *
 * http://localhost/images/:type/:size/:id.:extension
 *
 * @param {string} type - type de données (ex: 'products', 'medias', 'slider', 'gallery')
 * @param {string} _id  - /!\ GUID de l'IMAGE /!\
 * @param {string} size  - `${width}x${height}` (ex: '300x200')
 * @param {string} extension - extension du fichier (ex: 'png', 'jpeg', 'jpg')
 * @param {number} quality the quality of the result image - default 80
 */
// const downloadImage = async (type, _id, size, extension, quality = 80, background = '255,255,255,1') => {
const downloadImage = async (type, _id, size, extension, quality = 80, options = {}) => {
    const sharpOptions = {};

    if (options.position) {
        sharpOptions.position = options.position;
    } else if (options.background) {
        const background        = options.background.split(',');
        sharpOptions.background = {};
        sharpOptions.fit        = 'contain';
        sharpOptions.background = {
            r     : parseFloat(background[0]),
            g     : parseFloat(background[1]),
            b     : parseFloat(background[2]),
            alpha : parseFloat(background[3])
        };
    } else {
        sharpOptions.fit        = 'contain';
        sharpOptions.background = {
            r     : 255,
            g     : 255,
            b     : 255,
            alpha : 1
        };
    }

    let _path          = server.getUploadDirectory();
    _path              = path.join(process.cwd(), _path);
    const cacheFolder  = path.join(_path, '/cache/');
    let filePath       = '';
    let filePathCache  = '';
    let fileName       = '';
    let imageObj       = {};
    let relativePath   = '';
    let fileNameOption = '';

    if (options.position) {
        fileNameOption = options.position.replace(/ /g, '_');
    } else if (options.background) {
        fileNameOption = options.background;
    } else {
        fileNameOption = '';
    }
    switch (type) {
    // si une image produit est requêtée
    case 'products':
        const product = await Products.findOne({'images._id': _id});
        imageObj      = product.images.find((img) => img._id.toString() === _id.toString());
        // on recupere le nom du fichier
        fileName      = path.basename(imageObj.url);
        relativePath  = imageObj.url;
        filePath      = path.join(_path, imageObj.url);
        fileName      = `${product.code}_${imageObj._id}_${size}_${quality}_${fileNameOption}${path.extname(fileName)}`;
        filePathCache = path.join(cacheFolder, 'products', getChar(product.code, 0), getChar(product.code, 1), fileName);
        await fsp.mkdir(path.join(cacheFolder, 'products', getChar(product.code, 0), getChar(product.code, 1)), {recursive: true});
        break;
        // si un media est requêté
    case 'medias':
        imageObj      = await Medias.findOne({_id});
        fileName      = path.basename(imageObj.link, `.${extension}`);
        relativePath  = imageObj.link;
        filePath      = path.join(_path, imageObj.link);
        fileName      = `${fileName}_${size}_${quality}_${fileNameOption}.${extension}`;
        filePathCache = path.join(cacheFolder, 'medias', fileName);
        await fsp.mkdir(path.join(cacheFolder, 'medias'), {recursive: true});
        break;
    case 'slider':
    case 'gallery':
        const obj     = await mongoose.model(type).findOne({'items._id': _id});
        imageObj      = obj.items.find((item) => item._id.toString() === _id.toString());
        fileName      = path.basename(imageObj.src, `.${extension}`);
        relativePath  = imageObj.src;
        filePath      = path.resolve(_path, imageObj.src);
        fileName      = `${fileName}_${size}_${quality}_${fileNameOption}.${extension}`;
        filePathCache = path.resolve(cacheFolder, type, fileName);
        await fsp.mkdir(path.join(cacheFolder, type), {recursive: true});
        break;
    case 'blog':
        const blog    = await mongoose.model('news').findOne({_id});
        fileName      = path.basename(blog.img, `.${extension}`);
        relativePath  = blog.img;
        filePath      = path.join(_path, blog.img);
        fileName      = `${fileName}_${size}_${quality}_${fileNameOption}.${extension}`;
        filePathCache = path.join(cacheFolder, type, fileName);
        await fsp.mkdir(path.join(cacheFolder, type), {recursive: true});
        break;
    case 'category':
        const category = await mongoose.model('categories').findOne({_id});
        fileName       = path.basename(category.img, `.${extension}`);
        relativePath   = category.img;
        filePath       = path.join(_path, category.img);
        fileName       = `${fileName}_${size}_${quality}_${fileNameOption}.${extension}`;
        filePathCache  = path.join(cacheFolder, type, fileName);
        await fsp.mkdir(path.join(cacheFolder, type), {recursive: true});
        break;
    case 'picto':
        const picto   = await mongoose.model('pictos').findOne({_id});
        fileName      = path.basename(picto.filename, path.extname(picto.filename));
        relativePath  = path.join('medias/picto', picto.filename);
        filePath      = path.join(_path, 'medias/picto', picto.filename);
        fileName      = `${fileName}_${size}_${quality}_${fileNameOption}${path.extname(picto.filename)}`;
        filePathCache = path.join(cacheFolder, type, fileName);
        await fsp.mkdir(path.join(cacheFolder, type), {recursive: true});
        break;
    default:
        return null;
    }

    // global aux sections
    // ./global aux sections
    // si le dossier de cache n'existe pas, on le créé
    await fsp.mkdir(cacheFolder, {recursive: true});

    // si l'image demandée est deja en cache, on la renvoie direct
    if (fsp.existsSync(filePathCache)) {
        return filePathCache;
    }
    if (await utilsMedias.existsFile(relativePath)) {
        if (size === 'max' || size === 'MAX') {
            await utilsModules.modulesLoadFunctions('downloadFile', {
                key     : filePath.substr(_path.length + 1).replace(/\\/g, '/'),
                outPath : filePathCache
            }, () => {
                fsp.copyFileSync(filePath, filePathCache);
            });
        } else {
        // sinon, on recupere l'image original, on la resize, on la compresse et on la retourne
        // resize
            filePath = await utilsModules.modulesLoadFunctions('getFile', {
                key : filePath.substr(_path.length + 1).replace(/\\/g, '/')
            }, () => {
                return filePath;
            });

            try {
                sharpOptions.width  = Number(size.split('x')[0]);
                sharpOptions.height = Number(size.split('x')[1]);
                await require('sharp')(filePath).resize(sharpOptions).toFile(filePathCache);
            } catch (exc) {
                console.error('Image not resized : Sharp may not be installed');

                // Take the original file size
                await utilsModules.modulesLoadFunctions('downloadFile', {
                    key     : filePath.substr(_path.length + 1).replace(/\\/g, '/'),
                    outPath : filePathCache
                }, () => {
                    fsp.copyFileSync(filePath, filePathCache);
                });
            }
        }
        // compressage
        filePathCache = await utilsMedias.compressImg(filePathCache, filePathCache.replace(fileName, ''), fileName, quality);
        return filePathCache;
    }
    throw NSErrors.MediaNotFound;
};

const uploadFiles = async (body, files) => {
    const pathFinal = `${server.getUploadDirectory()}/`;
    const tmp_path  = files[0].path;
    const extension = body.extension;
    let target_path = `medias/${body.type}/`;

    switch (body.type) {
    case 'product': {
        const code  = body.code.substring(0, 2);
        target_path = `photos/${body.type}/${code[0]}/${code[1]}/`;
        break;
    }
    case 'article': {
        const date  = moment().format('YYYYMMDD');
        target_path = `photos/${body.type}/${date}/`;
        break;
    }
    case 'media': {
        target_path = 'medias/';
        break;
    }
    case 'attribute': {
        target_path = `medias/attributes/${body.code}/`;
        break;
    }
    case 'option': {
        const code  = body.code.substring(0, 2);
        target_path = `medias/options/${code[0]}/${code[1]}/`;
        break;
    }
    case 'mail': {
        target_path = 'documents/mail/';
        break;
    }
    case 'language': {
        target_path = 'language/';
        break;
    }
    default:
        break;
    }

    let target_path_full = target_path + files[0].originalname + extension;
    let name             = files[0].originalname;
    target_path_full     = await utilsModules.modulesLoadFunctions('uploadFile', {
        target_path,
        target_path_full,
        file : files[0],
        extension
    }, async () => {
        // Check if the name is already used
        if (!(await fsp.existsSync(pathFinal, target_path_full))) {
            target_path_full = pathFinal + target_path_full;
        } else {
            name             = `${files[0].originalname}_${Date.now()}`;
            target_path_full = `${pathFinal + target_path}${name}${extension}`;
        }

        await fsp.copyRecursiveSync(tmp_path, target_path_full);
        if ((await fsp.stat(tmp_path)).isDirectory()) {
            await fsp.deleteRecursiveSync(tmp_path);
        } else {
            await fsp.unlink(tmp_path);
        }

        return target_path_full.replace(pathFinal, '');
    });
    switch (body.type) {
    case 'product': {
        const image = {
            default  : body.default,
            position : 0,
            alt      : body.alt,
            name     : name + extension,
            title    : name,
            url      : target_path_full,
            extension
        };
        await Products.updateOne({_id: body._id}, {$push: {images: image}});
        const product = await Products.findOne({_id: body._id});
        image._id     = product.images.find((img) => img.name === name + extension)._id;
        return image;
    }
    case 'mail': {
        const result = await Mail.findOne({_id: body._id});
        if (result.translation[body.lang] === undefined) {
            result.translation[body.lang] = {};
        }
        if (result.translation[body.lang].attachments === undefined) {
            result.translation[body.lang].attachments = [];
        }

        result.translation[body.lang].attachments.push({path: target_path_full, name: files[0]});
        await Mail.updateOne({_id: body._id}, {translation: result.translation});
        return result.translation;
    }
    case 'picto': {
        const result = await Pictos.findOne({_id: body._id});
        await deleteFileAndCacheFile(`medias/picto/${result.filename}`, 'picto');
        await Pictos.updateOne({_id: body._id}, {filename: name + extension});
        return {name: name + extension};
    }
    case 'language': {
        const result = await Languages.findOne({_id: body._id});
        if (result.img) {
            await utilsMedias.deleteFile(result.img);
        }
        await Languages.updateOne({_id: body._id}, {img: target_path_full});
        return {name: name + extension, path: target_path_full};
    }
    case 'article': {
        const result = await News.findOne({_id: body._id});
        await deleteFileAndCacheFile(result.img, 'blog');
        await News.updateOne({_id: body._id}, {img: target_path_full, extension: path.extname(target_path_full)});
        return {name: name + extension, path: target_path_full};
    }
    case 'media': {
        if (body._id && body._id !== '') {
            const result = await Medias.findOne({_id: body._id});
            await deleteFileAndCacheFile(result.link, 'medias');
            await Medias.updateOne({_id: body._id}, {link: target_path_full, extension: path.extname(target_path_full)});
            return {name: name + extension, path: target_path_full, id: body._id};
        }
        const media = await Medias.create({link: target_path_full, extension: path.extname(target_path_full)});
        return {name: name + extension, path: target_path_full, id: media._id};
    }
    case 'gallery': {
        if (body.entity._id) {
            const gallery = await Gallery.findOne({_id: body._id});
            // == necessary
            const item    = gallery.items.find((i) => i._id === body.entity._id);
            const oldPath = item.src;
            item.src      = target_path_full;
            item.alt      = body.alt && body.alt !== '' ? body.alt : item.alt;
            item.srcset   = [target_path_full];
            await Gallery.updateOne({'items._id': body.entity._id}, {
                $set : {
                    'items.$.src'       : target_path_full,
                    'items.$.alt'       : body.alt && body.alt !== '' ? body.alt : item.alt,
                    'items.$.srcset'    : [target_path_full],
                    'items.$.extension' : path.extname(target_path_full)
                }
            });
            await deleteFileAndCacheFile(oldPath, 'gallery');
            return item;
        }
        const galleryNumber = await Gallery.findOne({_id: body._id});
        let maxOrder        = 0;
        if (galleryNumber.items.length !== 0) {
            maxOrder = Math.max.apply(null, galleryNumber.items.map((i) => i.order));
        }
        const item = {
            src       : target_path_full,
            srcset    : [target_path_full],
            sizes     : [],
            alt       : body.alt,
            order     : maxOrder + 1,
            type      : 'photo',
            extension : path.extname(target_path_full)
        };
        await Gallery.updateOne({_id: body._id}, {$push: {items: item}});
        const gallery = await Gallery.findOne({_id: body._id});
        item._id      = gallery.items.find((img) => img.src === target_path_full)._id;
        return item;
    }
    case 'slider': {
        if (body.entity._id) {
            const slider = await Slider.findOne({_id: body._id});
            // == necessary
            const item    = slider.items.find((i) => i.id === body.entity._id);
            const oldPath = item.src;
            item.src      = target_path_full;
            item.name     = body.alt && body.alt !== '' ? body.alt : item.name;
            item.text     = body.alt && body.alt !== '' ? body.alt : item.text;
            await Slider.updateOne({'items._id': body.entity._id}, {
                $set : {
                    'items.$.src'  : target_path_full,
                    'items.$.name' : item.name,
                    'items.$.text' : item.text,
                    extension      : path.extname(target_path_full)
                }
            });
            await deleteFileAndCacheFile(oldPath, 'slider');
            return item;
        }
        const sliderNumber = await Slider.findOne({_id: body._id});
        let maxOrder       = 0;
        if (sliderNumber.items.length !== 0 ) {
            maxOrder = Math.max.apply(null, sliderNumber.items.map((i) => i.order));
        }
        const item = {
            order     : maxOrder + 1,
            src       : target_path_full,
            text      : name,
            name,
            href      : '',
            extension : path.extname(target_path_full)
        };
        await Slider.updateOne({_id: body._id}, {$push: {items: item}});
        const slider = await Slider.findOne({_id: body._id});
        item._id     = slider.items.find((img) => img.src === target_path_full)._id;
        return item;
    }
    case 'attribute': {
        if (body.entity.value && body.entity.value !== '') {
            await utilsMedias.deleteFile(body.entity.value);
        }

        const product                                          = await Products.findOne({_id: body._id});
        const index                                            = product.attributes.findIndex(((attr) => attr.translation[body.lang].name === body.entity.name));
        product.attributes[index].translation[body.lang].value = target_path_full;
        await Products.updateOne({_id: body._id}, {$set: {attributes: product.attributes}});

        return {name: name + extension, path: target_path_full};
    }
    case 'option': {
        const values = body.entity.values;
        for (let i = 0; i < values.length; i++) {
            delete values[i].$hashKey;
        }

        const path = body.entity.value[body.entity.line];
        await utilsMedias.deleteFile(path);

        values[body.entity.lineIndex][body.entity.line] = target_path_full;

        await Opts.updateOne({_id: body._id}, {$set: {values}});

        return {name: name + extension, path: target_path_full};
    }
    case 'category': {
        const result = await Categories.findOne({_id: body._id});
        await deleteFileAndCacheFile(result.img, 'category');
        await Categories.updateOne({_id: body._id}, {img: target_path_full, extension: path.extname(target_path_full), alt: body.alt});
        return {name: name + extension, path: target_path_full};
    }
    default:
        break;
    }
};

const listMedias = async (PostBody) => {
    return queryBuilder.find(PostBody);
};

const getMedia = async (PostBody) => {
    return queryBuilder.findOne(PostBody);
};

const saveMedia = async (media) => {
    if (media.link && media.link !== '') {
        const result = await Medias.findOneAndUpdate({link: media.link}, media);
        return result;
    }
    media.name   = utils.slugify(media.name);
    const result = Medias.create(media);
    return result;
};

const removeMedia = async (_id) => {
    const result = await Medias.findOneAndDelete({_id});
    if (!result) throw NSErrors.MediaNotFound;

    if (result.link) {
        await utilsMedias.deleteFile(result.link);
        require('./cache').deleteCacheImage('medias', {filename: path.basename(result.link).split('.')[0]});
    }
    return result;
};

const getMediasGroups = async (query, filter = {}) => {
    const medias       = await Medias.find(filter);
    const sortedGroups = ([...new Set(medias.map((media) => (media.group === '' ? 'general' : media.group)))]).sort((a, b) => a - b);
    // s'il est la, on place "general" en premier index
    if (sortedGroups.includes('general')) {
        sortedGroups.splice(sortedGroups.indexOf('general'), 1);
        sortedGroups.unshift('general');
    }
    if (query) {
        return sortedGroups.filter((group) => group.match(new RegExp(query, 'gim')));
    }
    return sortedGroups;
};

const deleteFileAndCacheFile = async (link, type) => {
    if (link && path.basename(link).includes('.')) {
        await utilsMedias.deleteFile(link);
        require('./cache').deleteCacheImage(type, {filename: path.basename(link).split('.')[0], extension: path.extname(link)});
    }
};

module.exports = {
    downloadAllDocuments,
    uploadAllMedias,
    uploadAllDocuments,
    downloadImage,
    uploadFiles,
    listMedias,
    getMedia,
    saveMedia,
    removeMedia,
    getMediasGroups
};