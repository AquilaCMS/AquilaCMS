const mongoose         = require('mongoose');
const {
    Categories,
    Products,
    Attributes
}                      = require("../orm/models");
const QueryBuilder     = require('../utils/QueryBuilder');
const NSErrors         = require('../utils/errors/NSErrors');
const ServiceRules     = require("./rules");
const ServiceLanguages = require("./languages");
const {isAdmin}        = require('./auth');

const restrictedFields = ["clickable"];
const defaultFields    = ["_id", "code", "action", "translation"];
const queryBuilder     = new QueryBuilder(Categories, restrictedFields, defaultFields);

const getCategories = async (PostBody) => {
    return queryBuilder.find(PostBody);
};

const generateFilters = async (res, lang = "") => {
    lang = ServiceLanguages.getDefaultLang(lang);
    if (res && res.filters && res.filters.attributes && res.filters.attributes.length > 0) {
        const attributes = [];
        const values = {};
        const pictos = [];
        for (const filter of res.filters.attributes) {
            attributes.push(filter.id_attribut.toString());
        }
        let productsList = res.datas;
        // Si productsList n'existe pas ou que products.id n'est pas populate on va populate l'objet
        // productsList[i].id est soit un id soit un Products si ce n'est pas un Products on le populate
        if (!productsList || (productsList.length && typeof productsList[0] !== 'object')) {
            const category = await Categories.findById(res._id).populate({
                path  : 'productsList.id',
                match : {_visible: true, active: true}
            }).lean();
            productsList = category.productsList;
        }
        for (const products of productsList) {
            let prd = null;
            // products peut être soit un objet de type Product soit
            // un objet de type category.productList contenant l'id du produit populate par le produit
            if (products.attributes !== undefined || (products.id != null && products.id.attributes !== undefined)) {
                if (products.id != null && products.id.attributes !== undefined) {
                    prd = products.id;
                } else {
                    prd = products;
                }
            } else {
                prd = await Products.findOne({_id: products.id, active: true, _visible: true}).lean();
            }

            if (prd && prd.attributes) {
                if (prd.pictos) {
                    for (const picto of prd.pictos) {
                        pictos.push(picto);
                    }
                }

                for (const attr of prd.attributes) {
                    if (attributes.includes(attr.id.toString())) {
                        if (attr.translation && attr.translation[lang]) {
                            const value = attr.translation[lang].value;

                            if (!values[attr.id]) {
                                values[attr.id] = [];
                            }

                            if (value && typeof value === "object" && value.length > 0) {
                                for (let i = 0; i < value.length; i++) {
                                    if (values[attr.id].includes(value[i]) === false) {
                                        values[attr.id].push(value[i]);
                                    }
                                }
                            } else {
                                if (values[attr.id].includes(value) === false) {
                                    values[attr.id].push(value);
                                }
                            }
                        }
                    }
                }
            }
        }
        // Si emptyValues alors on supprime les labels des filtres
        let emptyValues = true;
        // On tri le tableau (distinct et sort)
        for (const key in values) {
            if (!values.hasOwnProperty(key)) continue;
            emptyValues = false;
            const obj = values[key];
            values[key] = obj.sort((a, b) => {
                if (a > b) return 1;
                if (a < b) return -1;
                return 0;
            }).filter((value, index, self) => self.findIndex((o) => o === value) === index);
            const tValuesValid = [];
            values[key].forEach((value) => {
                if (value !== "" && value !== undefined && value !== null && typeof value !== "object") {
                    tValuesValid.push(value);
                }
            });
            values[key] = tValuesValid;
            // Si le filtre a moins de deux on ne l'affichera pas leur valeur
            if (values[key].length < 2) {
                delete values[key];
                const idx = res.filters.attributes.findIndex((attrLabel) => attrLabel.id === key);
                if (idx >= 0) {
                    res.filters.attributes.splice(idx, 1);
                }
            }
            if (values[key] && values[key].length > 0) {
                const attribute = res.filters.attributes.find((_attr) => _attr.id_attribut.toString() === key.toString());
                if (attribute && attribute.type === "Intervalle") {
                    const min   = Math.min(...values[key]);
                    const max   = Math.max(...values[key]);
                    values[key] = [min, max];
                }
            }
        }
        if (emptyValues) {
            res.filters.attributes = [];
        }
        res.filters.attributesValues = values;
        if (pictos.length > 0) {
            res.filters.pictos = pictos.sort((a, b) => {
                if (a.title > b.title) return 1;
                if (a.title < b.title) return -1;
                return 0;
            }).filter((value, index, self) => self.findIndex((o) => o.code === value.code) === index);
        }
    }
    return res;
};

const getCategory = async (PostBody, withFilter = null, lang = "") => {
    lang      = ServiceLanguages.getDefaultLang(lang);
    const res =  await queryBuilder.findOne(PostBody);
    return withFilter ? generateFilters(res, lang) : res;
};

const getCategoryById = async (id, PostBody = null) => {
    require("../utils/utils").tmp_use_route("categories_service", "getCategoryById");
    return queryBuilder.findById(id, PostBody);
};
const setCategory = async (req) => {
    return Categories.updateOne({_id: req.body._id}, req.body);
};

const createCategory = async (req) => {
    const newMenu   = new Categories(req.body);
    const id_parent = req.body.id_parent;
    const _menu     = await Categories.findOne({_id: id_parent});
    if (id_parent) {
        newMenu.ancestors = [..._menu.ancestors, id_parent];
        if (!_menu) throw NSErrors.CategoryParentMissing;
    }
    if (_menu) {
        if (!_menu.children.includes(newMenu._id)) {
            _menu.children.push(newMenu._id);
        }
        _menu.save();
    }
    return newMenu.save();
};

const deleteCategory = async (id) => {
    const _menu = await Categories.findOne({_id: mongoose.Types.ObjectId(id)});
    if (!_menu) {
        throw NSErrors.NotFound;
    }
    await removeChildren(_menu);
    const result = await Categories.deleteOne({_id: _menu._id});
    const rule   = await ServiceRules.queryRule({filter: {owner_id: id}});
    if (rule) {
        await ServiceRules.deleteRule(rule._id);
    }

    if (_menu.ancestors.length > 0) {
        await Categories.updateOne({_id: _menu.ancestors[_menu.ancestors.length - 1]}, {$pull: {children: _menu._id}});
    }
    return result.ok === 1;
};

const getCategoryChild = async (code, childConds, authorization = null) => {
    const queryCondition = {
        ancestors : {$size: 0},
        code
    };

    if (!isAdmin(authorization)) {
        const date = new Date();
        queryCondition.$and = [
            {openDate: {$lte: date}},
            {$or: [{closeDate: {$gte: date}}, {closeDate: {$eq: undefined}}]}
        ];
        childConds.$and = [
            {openDate: {$lte: date}},
            {$or: [{closeDate: {$gte: date}}, {closeDate: {$eq: undefined}}]}
        ];
    }

    // TODO P5 gérer récurisvité du populate (actuellement que 3 niveaux)
    // le populate dans le pre ne fonctionne pas
    return Categories.findOne(queryCondition)
        .select("-productsList")
        .populate({
            path     : 'children',
            match    : childConds,
            options  : {sort: {displayOrder: "asc"}},
            populate : {
                path     : 'children',
                match    : childConds,
                options  : {sort: {displayOrder: "asc"}},
                populate : {
                    path     : 'children',
                    match    : childConds,
                    options  : {sort: {displayOrder: "asc"}},
                    populate : {path: 'children'}
                }
            }
        });
};

/**
 * Permet de mettre à jour un filtre dont l'id est passé en parametre
 * @param {*} _id id de la categorie
 */
const setFilter = async (_id, filter) => {
    require("../utils/utils").tmp_use_route("categories_service", "setFilter");
    // On check si l'_id de la categorie existe
    if (!mongoose.Types.ObjectId.isValid(_id)) throw NSErrors.InvalidIdObjectIdError;
    // le filtre existe déjà, alors on le modifie
    let result;
    if (filter._id) {
        if (!mongoose.Types.ObjectId.isValid(filter._id)) throw NSErrors.InvalidIdObjectIdError;
        filter._id = filter.id_attribut;
        result = await Categories.findOneAndUpdate(
            {_id, "filters._id": filter._id},
            {$set: {"filters.$": filter}},
            {new: true, runValidators: true}
        );
        if (!result) throw NSErrors.CategoryNotFound;
    } else {
        // Le filtre n'existe pas, alors on l'ajoute
        filter._id = filter.id_attribut;
        result = await Categories.findByIdAndUpdate({_id}, {$push: {filters: filter}}, {new: true, runValidators: true});
        if (!result) throw NSErrors.CategoryNotFound;
    }
    return result;
};

/**
 * Permet de mettre à jour les filtres des categories
 * @param {*} _id id de la categorie
 * @param {*} tFilters liste des filtres
 */
const setFilters = async (_id, tFilters) => {
    require("../utils/utils").tmp_use_route("categories_service", "setFilters");
    if (!mongoose.Types.ObjectId.isValid(_id)) throw NSErrors.InvalidIdObjectIdError;
    const result = await Categories.findByIdAndUpdate(_id, {$set: {filters: tFilters}}, {new: true, runValidators: true});
    if (!result) throw NSErrors.AgendaUpdateError;
    return result;
};

const execRules = async () => {
    return ServiceRules.execRules('category');
};

/**
 * Permet de mettre à jour les canonical de tous les produits
 */
const execCanonical = async () => {
    try {
        // Toutes les catégorie actives
        const categories             = await Categories.find({active: true}).sort({canonical_weight: 'desc'}); // le poid le plus lourd d'abord
        const products_canonicalised = [];
        const languages              = await ServiceLanguages.getLanguages({filter: {status: "visible"}, limit: 100});
        const tabLang                = languages.datas.map((_lang) => _lang.code);

        // Pour chaque catégorie
        for (let iCat = 0; iCat < categories.length; iCat++) {
            const current_category = categories[iCat];

            // Construire le slug complet : [{"fr" : "fr/parent1/parent2/"}, {"en": "en/ancestor1/ancestor2/"}]
            const current_category_slugs = await getCompleteSlugs(current_category._id, tabLang);

            // Pour chaque produit de cette catégorie
            const cat_with_products = await current_category.populate({path: "productsList.id"}).execPopulate();
            for (let iProduct = 0; iProduct < cat_with_products.productsList.length; iProduct++) {
                const product = cat_with_products.productsList[iProduct].id;

                // Construction du slug
                let bForceForOtherLang = false;
                for (let iLang = 0; iLang < tabLang.length; iLang++) {
                    const currentLang = tabLang[iLang];
                    if (product && (bForceForOtherLang || products_canonicalised.indexOf(product._id.toString()) === -1) && typeof product.translation[currentLang] !== "undefined" && typeof product.translation[currentLang].slug !== "undefined") { // Le produit existe et on l'a pas déjà traité pour cette langue
                        await Products.updateOne(
                            {_id: product._id},
                            {$set: {[`translation.${currentLang}.canonical`]: `${current_category_slugs[currentLang]}/${product.translation[currentLang].slug}`}}
                        );
                        products_canonicalised.push(product._id.toString());
                        bForceForOtherLang = true; // On est passé une fois, on passe pour les autres langues
                    }
                }
            }
        }

        // Mettre le canonical à vide pour tous les produits non traité
        const productsNotCanonicalised = await Products.find({_id: {$nin: products_canonicalised}});
        let   productsNotCanonicaliedString = "";
        for (let productNC = 0; productNC < productsNotCanonicalised.length; productNC++) {
            for (let iLang = 0; iLang < tabLang.length; iLang++) {
                if (typeof productsNotCanonicalised[productNC].translation[tabLang[iLang]] !== "undefined") {
                    productsNotCanonicalised[productNC].translation[tabLang[iLang]].canonical = "";
                }
            }
            await productsNotCanonicalised[productNC].save();
            productsNotCanonicaliedString += `${productsNotCanonicalised[productNC].code}, `;
        }

        require('./fix_auto').fixCanonical();

        return `${productsNotCanonicalised.length} products not canonicalised : ${productsNotCanonicaliedString}`;
    } catch (error) {
        return error.message;
    }
};

/**
 * Construit le slug d'une catégorie par rapport à ses parents
 * @param {guid} categorie_id id de la categorie
 * @param {guid} tabLang Tableau des langues
 */
const getCompleteSlugs = async (categorie_id, tabLang) => {
    // /!\ Le slug de la langue par défaut ne contient pas le préfix de lang : en/parent1/parent2 vs /parent1/parent2
    const current_category_slugs = []; // [{"fr" : "parent1/parent2/"}, {"en": "en/ancestor1/ancestor2/"}]
    // Pour la catégorie courante
    const current_category       = await Categories.findOne({_id: categorie_id});
    const lang                   = ServiceLanguages.getDefaultLang();

    if (typeof current_category !== "undefined") {
        // On ajoute la catégorie courante à la liste des catégories à parcourrir
        const categoriesToBrowse = current_category.ancestors;
        categoriesToBrowse.push(categorie_id);

        // Pour chaque "grand parent"
        for (let iCat = 0; iCat < categoriesToBrowse.length; iCat++) {
            const parent_category_id = categoriesToBrowse[iCat];
            const parent_category    = await Categories.findOne({_id: parent_category_id});

            // On l'ajoute au slug
            if (typeof parent_category !== "undefined" && parent_category.active) { // Généralement la racine n'est pas prise, donc elle doit etre désactivée
                // Pour chacune des langues
                for (let iLang = 0; iLang < tabLang.length; iLang++) {
                    const currentLang = tabLang[iLang];
                    if (typeof parent_category.translation[currentLang] !== "undefined") {
                        if (typeof current_category_slugs[currentLang] === "undefined") { // 1ere fois
                            current_category_slugs[currentLang] = (lang === currentLang) ? "" : `/${currentLang}`; // On commence par le "/lang" sauf pour la langue par défaut !
                        }
                        current_category_slugs[currentLang] = `${current_category_slugs[currentLang]}/${parent_category.translation[currentLang].slug}`;
                    }
                }
            }
        }
    }

    return current_category_slugs;
};

const applyTranslatedAttribs = async (PostBody) => {
    try {
        // const res = {n: 0, nModified: 0, ok: 0};
        // On récupere ts les produits
        let _categories = [];
        if (PostBody === undefined || PostBody === {}) {
            _categories = await Categories.find({});
        } else {
            _categories = [await queryBuilder.findOne(PostBody)];
        }
        // On récupere ts les attributs
        const _attribs = await Attributes.find({});

        // On boucle sur les produits
        for (let i = 0; i < _categories.length; i++) {
            if (_categories[i].filters && _categories[i].filters.attributes !== undefined) {
                // On boucle sur les attributs du produit [i]
                for (let j = 0; j < _categories[i].filters.attributes.length; j++) {
                    // On recupere l'attribut original correspondant a l'attribut [j] du produit [i]
                    const attrib = _attribs.find((attrib) => attrib._id.toString() === _categories[i].filters.attributes[j].id_attribut);

                    if (attrib && attrib.translation) {
                        // On boucle sur chaque langue dans laquelle l'attribut original est traduit
                        for (let k = 0; k < Object.keys(attrib.translation).length; k++) {
                            const lang = Object.keys(attrib.translation)[k];
                            if (_categories[i].filters.attributes[j].translation[lang] === undefined) {
                                _categories[i].filters.attributes[j].translation[lang] = {name: ''};
                            }
                            _categories[i].filters.attributes[j].translation[lang].name = attrib.translation[lang].name;
                        }
                    }
                }
                await Categories.updateOne({_id: _categories[i]._id}, {$set: {filters: _categories[i].filters}});
            }
        }
        return 'OK';
    } catch (e) {
        console.error(e);
        return 'ERROR';
    }
};

// On supprime les enfants récursivement
async function removeChildren(menu) {
    for (const childId of menu.children) {
        const removedChild = await Categories.findOneAndRemove({_id: childId});
        await removeChildren(removedChild);
    }
}

module.exports = {
    getCategories,
    generateFilters,
    getCategory,
    getCategoryById,
    setCategory,
    createCategory,
    getCategoryChild,
    setFilter,
    setFilters,
    execRules,
    execCanonical,
    getCompleteSlugs,
    applyTranslatedAttribs,
    removeChildren,
    deleteCategory
};