/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const AdmZip        = require('adm-zip');
const moment        = require('moment');
const path          = require('path');
const mongoose      = require('mongoose');
const {fs, slugify} = require('aql-utils');
const ObjectID      = mongoose.Types.ObjectId;
const slash         = require('slash');

const {
    Medias,
    Products,
    ProductSimple,
    Categories,
    Pictos,
    Languages,
    News,
    Gallery,
    Slider,
    Mail,
    Trademarks
}                  = require('../orm/models');
const utilsModules = require('../utils/modules');
const QueryBuilder = require('../utils/QueryBuilder');
const NSErrors     = require('../utils/errors/NSErrors');
const server       = require('../utils/server');
const utilsMedias  = require('../utils/medias');
const {getChar}    = require('./cache');

const restrictedFields = [];
const defaultFields    = ['*'];
const queryBuilder     = new QueryBuilder(Medias, restrictedFields, defaultFields);

/**
 * Allows you to download a zip containing all the "upload" folder
 */
const downloadAllDocuments = async () => {
    console.log('Preparing downloadAllDocuments...');
    const uploadDirectory = server.getUploadDirectory();

    await utilsModules.modulesLoadFunctions('downloadAllDocuments', {}, () => {
        if (!fs.existsSync(`./${uploadDirectory}/temp`)) {
            fs.mkdirSync(`./${uploadDirectory}/temp`);
        }
        const zip = new AdmZip();
        if (fs.existsSync(path.resolve(uploadDirectory, 'documents'))) {
            zip.addLocalFolder(path.resolve(uploadDirectory, 'documents'), 'documents');
        }
        if (fs.existsSync(path.resolve(uploadDirectory, 'medias'))) {
            zip.addLocalFolder(path.resolve(uploadDirectory, 'medias'), 'medias');
        }
        if (fs.existsSync(path.resolve(uploadDirectory, 'photos'))) {
            zip.addLocalFolder(path.resolve(uploadDirectory, 'photos'), 'photos');
        }
        if (fs.existsSync(path.resolve(uploadDirectory, 'fonts'))) {
            zip.addLocalFolder(path.resolve(uploadDirectory, 'fonts'), 'fonts');
        }
        zip.writeZip(path.resolve(uploadDirectory, 'temp/documents.zip'), (err) => {
            if (err) console.error(err);
        });
    });
    console.log('Finalize downloadAllDocuments..');
    return path.resolve(uploadDirectory, 'temp/documents.zip');
};

/**
 * @description Upload zip with all medias
 */
const uploadAllMedias = async (reqFile, insertDB, group = '', deleteTempFolder = true) => {
    console.log('Upload medias start...');

    // Specify the full path to the file to be sure to have an absolute path (which is not the case when calling this service from a module for example)
    reqFile.path      = path.resolve(global.aquila.appRoot, reqFile.path);
    const path_init   = reqFile.path;
    const path_unzip  = path_init.split('.')
        .slice(0, -1)
        .join('.');
    const target_path = `./${server.getUploadDirectory()}/medias`;

    const zip = new AdmZip(path_init);
    // Extract files from zip to 'temp' folder
    zip.extractAllTo(path_unzip);
    let filenames = '';
    // check if zip is totaly empty
    try {
        filenames = fs.readdirSync(path_unzip).filter((file) => fs.statSync(path.resolve(path_unzip, file)).isFile());
    } catch (e) {
        if (deleteTempFolder) deleteTempFiles(path_unzip, path_init);
        throw NSErrors.MediaNotFound;
    }
    // check if zip have folder but no file
    if (filenames.length === 0) {
        if (deleteTempFolder) deleteTempFiles(path_unzip, path_init);
        throw NSErrors.MediaNotInRoot;
    }
    // filenames.forEach(async (filename) => { // Don't use forEach because of async (when it's call by a module in initAfter)
    for (let index = 0; index < filenames.length; index++) {
        try {
            let filename                 = filenames[index];
            const init_file              = path.resolve(path_unzip, filename);
            let target_file              = path.resolve(target_path, filename);
            let name_file                = filename.split('.').slice(0, -1).join('.');
            const now                    = Date.now();
            const ext_file               = filename.split('.').pop();
            const filename_duplicated    = `${name_file + now}.${ext_file}`;
            const name_file_duplicated   = filename_duplicated.split('.').slice(0, -1).join('.');
            const target_file_duplicated = path.resolve(target_path, filename_duplicated);

            // Check if folder
            if (fs.lstatSync(init_file)
                .isDirectory()) {
                return;
            }

            // if target_file exists use the target_file_duplicated variable
            if (fs.existsSync(target_file)) {
                target_file = target_file_duplicated;
            }
            // Copy files to /medias and delete the original files from 'temp' folder
            try {
                await fs.copyRecursive(init_file, target_file);
                await fs.deleteRecursive(init_file);
            } catch (e) {
                console.error(e);
                throw NSErrors.MediaNotFound;
            }

            // Insert it in the database
            if (insertDB) {
                // check if filename already exist in the database OR if link already exist in the database
                if (await Medias.findOne({$or: [{name: name_file}, {link: `medias/${filename}`}]})) {
                    name_file = name_file_duplicated;
                    filename  = filename_duplicated;
                }
                await Medias.updateOne({name: name_file}, {
                    link  : `medias/${filename}`,
                    name  : name_file,
                    group : group || path.parse(reqFile.originalname).name
                }, {upsert: true});
            }
        } catch (e) {
            console.error(e);
            throw NSErrors.InvalidFile;
        }
    }

    if (deleteTempFolder) deleteTempFiles(path_unzip, path_init);
    console.log('Upload medias done !');
};

const deleteTempFiles = async (path_unzip, path_init) => {
    fs.deleteRecursive(path_unzip);
    fs.deleteRecursive(path_init);
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
 * @param {string} type - data type(ie: 'products', 'medias', 'slider', 'gallery')
 * @param {string} _id  - /!\ IMAGE's GUID /!\
 * @param {string} size  - `${width}x${height}` (ex: '300x200')
 * @param {string} extension - file extension (ex: 'png', 'jpeg', 'jpg')
 * @param {number} quality the quality of the result image - default 80
 */
const getImagePathCache = async (type, _id, size, extension, quality = 80, options = {}) => {
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
    _path              = path.join(global.aquila.appRoot, _path);
    const cacheFolder  = path.join(_path, '/cache/');
    let filePath       = '';
    let filePathCache  = '';
    let fileName       = '';
    let imageObj       = {};
    let fileNameOption = '';

    if (options.position) {
        fileNameOption = options.position.replace(/ /g, '_');
    } else if (options.background) {
        fileNameOption = options.background;
    }

    if (ObjectID.isValid(_id)) {
        try {
            switch (type) {
            // if a product image is requested
            case 'products':
                const product = await Products.findOne({'images._id': _id});
                imageObj      = product.images.find((img) => img._id.toString() === _id.toString());
                // we get the name of the file
                fileName      = path.basename(imageObj.url);
                filePath      = path.join(_path, imageObj.url);
                fileName      = `${product.code}_${imageObj._id}_${size}_${quality}_${fileNameOption}${path.extname(fileName)}`;
                filePathCache = path.join(cacheFolder, 'products', getChar(product.code, 0), getChar(product.code, 1), fileName);
                await fs.mkdir(path.join(cacheFolder, 'products', getChar(product.code, 0), getChar(product.code, 1)), {recursive: true});
                break;
                // if a media is requested
            case 'productsVariant':
                const prd = await ProductSimple.findOne({'variants_values.images._id': _id});
                let variant;
                for (let i = 0; i < prd.variants_values.length; i++) {
                    if (prd.variants_values[i].images.findIndex((img) => img._id.toString() === _id) > -1) {
                        imageObj = prd.variants_values[i].images.find((img) => img._id.toString() === _id);
                        variant  = prd.variants_values[i];
                    }
                }
                // we get the name of the file
                fileName      = path.basename(imageObj.url);
                filePath      = path.join(_path, imageObj.url);
                fileName      = `${variant.code}_${imageObj._id}_${size}_${quality}_${fileNameOption}${path.extname(fileName)}`;
                filePathCache = path.join(cacheFolder, 'products', getChar(prd.code, 0), getChar(prd.code, 1), fileName);
                await fs.mkdir(path.join(cacheFolder, 'products', getChar(prd.code, 0), getChar(prd.code, 1)), {recursive: true});
                break;
                // if a media is requested
            case 'medias':
                imageObj      = await Medias.findOne({_id});
                fileName      = path.basename(imageObj.link, `${path.extname(imageObj.link)}`);
                filePath      = path.join(_path, imageObj.link);
                fileName      = `${fileName}_${size}_${quality}_${fileNameOption}${path.extname(imageObj.link)}`;
                filePathCache = path.join(cacheFolder, 'medias', fileName);
                await fs.mkdir(path.join(cacheFolder, 'medias'), {recursive: true});
                break;
            case 'slider':
            case 'gallery':
                const obj     = await mongoose.model(type).findOne({'items._id': _id});
                imageObj      = obj.items.find((item) => item._id.toString() === _id.toString());
                fileName      = path.basename(imageObj.src, `${path.extname(imageObj.src)}`);
                filePath      = path.resolve(_path, imageObj.src);
                fileName      = `${fileName}_${size}_${quality}_${fileNameOption}${path.extname(imageObj.src)}`;
                filePathCache = path.resolve(cacheFolder, type, fileName);
                await fs.mkdir(path.join(cacheFolder, type), {recursive: true});
                break;
            case 'blog':
                const blog    = await mongoose.model('news').findOne({_id});
                fileName      = path.basename(blog.img, `${path.extname(blog.img)}`);
                filePath      = path.join(_path, blog.img);
                fileName      = `${fileName}_${size}_${quality}_${fileNameOption}${path.extname(blog.img)}`;
                filePathCache = path.join(cacheFolder, type, fileName);
                await fs.mkdir(path.join(cacheFolder, type), {recursive: true});
                break;
            case 'category':
                const category = await mongoose.model('categories').findOne({_id});
                fileName       = path.basename(category.img, `${path.extname(category.img)}`);
                filePath       = path.join(_path, category.img);
                fileName       = `${fileName}_${size}_${quality}_${fileNameOption}${path.extname(category.img)}`;
                filePathCache  = path.join(cacheFolder, type, fileName);
                await fs.mkdir(path.join(cacheFolder, type), {recursive: true});
                break;
            case 'picto':
                const picto   = await mongoose.model('pictos').findOne({_id});
                fileName      = path.basename(picto.filename, path.extname(picto.filename));
                filePath      = path.join(_path, 'medias/picto', picto.filename);
                fileName      = `${fileName}_${size}_${quality}_${fileNameOption}${path.extname(picto.filename)}`;
                filePathCache = path.join(cacheFolder, type, fileName);
                await fs.mkdir(path.join(cacheFolder, type), {recursive: true});
                break;
            case 'trademark':
                const trademark = await mongoose.model('trademarks').findOne({_id});
                fileName        = path.basename(trademark.logo, path.extname(trademark.logo));
                filePath        = path.join(_path, 'medias/trademark', trademark.logo);
                fileName        = `${fileName}_${size}_${quality}_${fileNameOption}${path.extname(trademark.logo)}`;
                filePathCache   = path.join(cacheFolder, type, fileName);
                await fs.mkdir(path.join(cacheFolder, type), {recursive: true});
                break;
            default:
                return null;
            }
        } catch (err) {
            console.warn('No image (or item) found. Default image used.');
        }
    }
    if (!(await utilsMedias.existsFile(filePath)) && global.aquila.envConfig.environment.defaultImage) {
        fileName      = `default_image_cache_${size}${path.extname(global.aquila.envConfig.environment.defaultImage)}`;
        filePath      = path.join(_path, global.aquila.envConfig.environment.defaultImage);
        filePathCache = path.join(cacheFolder, fileName);
    }
    // if the requested image is already cached, it is returned direct
    if (filePathCache && await fs.existsSync(filePathCache)) {
        return filePathCache;
    }
    if (size === 'max' || size === 'MAX') {
        await utilsModules.modulesLoadFunctions('downloadFile', {
            key     : filePath.substr(_path.length + 1).replace(/\\/g, '/'),
            outPath : filePathCache
        }, () => fs.copyFileSync(filePath, filePathCache));
    } else {
    // otherwise, we recover the original image, we resize it, we compress it and we return it
    // resize
        filePath = await utilsModules.modulesLoadFunctions('getFile', {
            key : filePath.substr(_path.length + 1).replace(/\\/g, '/')
        }, () => filePath);

        try {
            sharpOptions.width  = Number(size.split('x')[0]);
            sharpOptions.height = Number(size.split('x')[1]);

            if (!filePath || !filePathCache) {
                return;
            }
            await require('sharp')(filePath).resize(sharpOptions).toFile(filePathCache);
        } catch (exc) {
            console.error('Image not resized : ', exc);

            try {
                // Take the original file size
                await utilsModules.modulesLoadFunctions('downloadFile', {
                    key     : filePath.substr(_path.length + 1).replace(/\\/g, '/'),
                    outPath : filePathCache
                }, async () => fs.copyFileSync(filePath, filePathCache));
            } catch (err) {
                return '/';
            }
        }
    }
    // compress
    filePathCache = await utilsMedias.compressImg(filePathCache, `${path.dirname(filePathCache)}/`, fileName, quality);
    return filePathCache;
};

const uploadFiles = async (body, files) => {
    const pathFinal = `${server.getUploadDirectory()}/`;
    const tmp_path  = slash(files[0].path);
    const extension = body.extension;
    let target_path = `medias/${body.type}/`;

    switch (body.type) {
    case 'productsVariant':
    case 'products': {
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
        if (!fs.existsSync(path.resolve(pathFinal, target_path_full))) {
            target_path_full = pathFinal + target_path_full;
        } else {
            name             = `${files[0].originalname}_${Date.now()}`;
            target_path_full = `${pathFinal + target_path}${name}${extension}`;
        }

        const absoluteTargetPath = slash(path.resolve(global.aquila.appRoot, target_path_full));
        await fs.copyRecursive(tmp_path, absoluteTargetPath);
        if ((await fs.stat(tmp_path)).isDirectory()) {
            await fs.deleteRecursive(tmp_path);
        } else {
            await fs.unlink(tmp_path);
        }

        return target_path_full.replace(pathFinal, '');
    });
    switch (body.type) {
    case 'products': {
        const image = {
            default  : body.default,
            position : body.position ? body.position : false,
            alt      : body.alt,
            name     : name + extension,
            title    : slugify(files[0].originalname),
            url      : target_path_full,
            extension
        };
        await Products.updateOne({_id: body._id}, {$push: {images: image}});
        const product = await Products.findOne({_id: body._id});
        image._id     = product.images.find((img) => img.name === name + extension)._id;
        return image;
    }
    case 'productsVariant': {
        const image = {
            default  : body.default,
            position : body.position ? body.position : false,
            alt      : body.alt,
            name     : name + extension,
            title    : name,
            url      : target_path_full,
            extension
        };
        await ProductSimple.updateMany({variants_values: {$exists: true}}, {$push: {'variants_values.$[vv].images': image}}, {arrayFilters: [{'vv._id': body._id}]});
        const product = await ProductSimple.findOne({variants_values: {$exists: true}, 'variants_values._id': body._id});
        image._id     = product.variants_values.find((vv) => vv._id.toString() === body._id).images.find((img) => img.name === name + extension)._id;
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
        await Mail.updateOne({_id: body._id}, {$set: {translation: result.translation}});
        return result.translation;
    }
    case 'picto': {
        const result = await Pictos.findOne({_id: body._id});
        await deleteFileAndCacheFile(`medias/picto/${result.filename}`, 'picto');
        await Pictos.updateOne({_id: body._id}, {$set: {filename: name + extension}});
        return {name: name + extension};
    }
    case 'trademark': {
        const result = await Trademarks.findOne({_id: body._id});
        await deleteFileAndCacheFile(`medias/trademark/${result.logo}`, 'trademark');
        await Trademarks.updateOne({_id: body._id}, {$set: {logo: name + extension}});
        return {name: name + extension};
    }
    case 'language': {
        const result = await Languages.findOne({_id: body._id});
        if (result.img) {
            await utilsMedias.deleteFile(result.img);
        }
        await Languages.updateOne({_id: body._id}, {$set: {img: target_path_full}});
        return {name: name + extension, path: target_path_full};
    }
    case 'article': {
        const result = await News.findOne({_id: body._id});
        await deleteFileAndCacheFile(result.img, 'blog');
        await News.updateOne({_id: body._id}, {$set: {img: target_path_full, extension: path.extname(target_path_full)}});
        return {name: name + extension, path: target_path_full};
    }
    case 'media': {
        if (body._id && body._id !== '') {
            const result = await Medias.findOne({_id: body._id});
            await deleteFileAndCacheFile(result.link, 'medias');
            await Medias.updateOne({_id: body._id}, {$set: {link: target_path_full, extension: path.extname(target_path_full)}});
            return {name: name + extension, path: target_path_full, id: body._id};
        }
        const media = await Medias.create({link: target_path_full, extension: path.extname(target_path_full), name});
        return {name, path: target_path_full, id: media._id};
    }
    case 'gallery': {
        if (body.entity._id) { // When you change the image of an item
            const gallery = await Gallery.findOne({_id: body._id});
            // == necessary
            const item    = gallery.items.find((i) => i._id.toString() === body.entity._id);
            const oldPath = item.src;
            item.src      = target_path_full;
            item.alt      = body.alt && body.alt !== '' ? body.alt : item.alt;
            item.srcset   = [target_path_full];
            await Gallery.updateOne({
                _id : body._id
            }, {
                $set : {
                    'items.$[item].src'       : target_path_full,
                    'items.$[item].alt'       : body.alt && body.alt !== '' ? body.alt : item.alt,
                    'items.$[item].srcset'    : [target_path_full],
                    'items.$[item].extension' : path.extname(target_path_full)
                }
            }, {
                arrayFilters : [{'item._id': body.entity._id}]
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
        if (body.entity._id) { // When you change the image of an item
            const slider = await Slider.findOne({_id: body._id});
            // == necessary
            const item    = slider.items.find((i) => i.id.toString() === body.entity._id);
            const oldPath = item.src;
            item.src      = target_path_full;
            item.name     = body.alt && body.alt !== '' ? body.alt : item.name;
            item.text     = body.alt && body.alt !== '' ? body.alt : item.text;
            await Slider.updateOne({
                _id : body._id
            }, {
                $set : {
                    'items.$[item].src'       : target_path_full,
                    'items.$[item].name'      : item.name,
                    'items.$[item].text'      : item.text,
                    'items.$[item].extension' : path.extname(target_path_full)
                }
            }, {
                arrayFilters : [{'item._id': body.entity._id}]
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

    case 'category': {
        const result = await Categories.findOne({_id: body._id});
        if (result.img) await deleteFileAndCacheFile(result.img, 'category');
        await Categories.updateOne({_id: body._id}, {$set: {img: target_path_full, extension: path.extname(target_path_full), alt: body.alt}});
        return {name: name + extension, path: target_path_full};
    }
    default:
        break;
    }
};

const listMedias = async (PostBody) => queryBuilder.find(PostBody, true);

const getMedia = async (PostBody) => queryBuilder.findOne(PostBody, true);

const saveMedia = async (media) => {
    if (media._id) {
        // we need to update the media
        if (media.link && media.link !== '') {
            const result = await Medias.findOneAndUpdate({link: media.link}, media);
            return result;
        }
        const result = await Medias.findOneAndUpdate({_id: media._id}, media);
        return result;
    }
    // we need to create the media
    media.name   = slugify(media.name);
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
    const medias       = await Medias.find(filter).lean();
    const sortedGroups = ([...new Set(medias.map((media) => (!media.group ? 'general' : media.group)))]).sort((a, b) => a - b);
    // if it is there, we put "general" in the first index
    if (sortedGroups.includes('general')) {
        sortedGroups.splice(sortedGroups.indexOf('general'), 1);
        sortedGroups.unshift('general');
    }
    return sortedGroups.filter((group) => group.match(new RegExp(query || '', 'gim')));
};

const deleteFileAndCacheFile = async (link, type) => {
    if (link && path.basename(link).includes('.')) {
        await utilsMedias.deleteFile(link);
        require('./cache').deleteCacheImage(type, {filename: path.basename(link).split('.')[0], extension: path.extname(link)});
    }
};

const getImageStream = async (url, res) => {
    const type    = url.split('/')[2];
    let quality;
    const option  = {};
    const options = url.split('/')[3];

    if (options.includes('crop')) {
        if (options.split('-crop')[0].split('-').length > 1) {
            quality = options.split('-')[1];
        } else {
            quality = 80;
        }
        for (let i = options.split('-').length; options.split('-')[i - 1] !== 'crop'; i--) {
            if (option.position) {
                option.position += `${options.split('-')[i - 1]} `;
            } else {
                option.position = `${options.split('-')[i - 1]} `;
            }
        }

        if (!option.position) {
            option.position = 'center';
        } else {
            option.position = option.position.slice(0, -1);
        }
    } else {
        if (options.split('-').length > 2) {
            quality           = options.split('-')[1];
            option.background = options.split('-')[2];
        } else if (options.split('-').length > 1) {
            if (options.split('-')[1].includes(',')) {
                option.background = options.split('-')[1];
            } else {
                quality = options.split('-')[1];
            }
        }
    }

    const size      = url.split('/')[3].split('-')[0];
    const _id       = url.split('/')[4];
    const extension = path.extname(url).replace('.', '') || 'png';
    if (type && size && extension) {
        res.set('Content-Type', `image/${extension}`);
        let imagePath = '';

        try {
            imagePath = await getImagePathCache(type, _id, size, extension, quality ? Number(quality) : undefined, option || undefined );
        } catch (e) {
            console.log(NSErrors.MediaNotFound);
            res.status(404);
        }
        if (imagePath && imagePath.includes('default_image_cache')) {
            res.status(404);
            res.set('Content-Type', `image/${imagePath.split('.').pop()}`);
        }
        if (imagePath && await fs.existsSync(imagePath) && (await fs.lstat(imagePath)).isFile()) {
            return res.sendFile(imagePath);
        }
        res.status(404).send('Not found');
    } else {
        res.status(404).send('Not found');
    }
};

module.exports = {
    downloadAllDocuments,
    uploadAllMedias,
    uploadAllDocuments,
    getImagePathCache,
    uploadFiles,
    listMedias,
    getMedia,
    saveMedia,
    removeMedia,
    getMediasGroups,
    getImageStream
};