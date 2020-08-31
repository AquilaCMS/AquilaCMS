
/**
 * @apiDefine ProductSchemaDefault
 * @apiSuccess {String} _visible TODO
 * @apiSuccess {Boolean} active TODO
 * @apiSuccess {String} associated_prds TODO
 * @apiSuccess {Object[]} attributes TODO
 * @apiSuccess {String} code TODO
 * @apiSuccess {String} downloadLink TODO
 * @apiSuccess {String} downloadInfos TODO
 * @apiSuccess {String} is_new TODO
 * @apiSuccess {Object[]} images TODO
 * @apiSuccess {String} kind Type of product : SimpleProduct | BundleProduct | VirtualProduct
 * @apiSuccess {Object[]} pictos TODO
 * @apiSuccess {String} set_attributes TODO
 * @apiSuccess {Object[]} slugMenus TODO
 * @apiSuccess {String} type Type of product : simple | bundle | virtual
 * @apiSuccess {String} universe TODO
 * @apiSuccess {number} weight TODO
 */

 /**
 * @apiDefine ProductStats
 * @apiSuccess {Object} stats TODO
 * @apiSuccess {String} stats.views TODO
 */


 /**
 * @apiDefine ProductReviews
 * @apiSuccess {Object} reviews TODO
 * @apiSuccess {String} reviews.average TODO
 * @apiSuccess {String} reviews.reviews_nb TODO
 * @apiSuccess {String} reviews.questions TODO
 * @apiSuccess {String} reviews.datas TODO
 */

 /**
 * @apiDefine ProductTranslation
 * @apiSuccess {Object} translation TODO
 * @apiSuccess {String} translation._lang_ TODO
 * @apiSuccess {String} translation._lang_.name TODO
 * @apiSuccess {String} translation._lang_.slug TODO
 * @apiSuccess {String} translation._lang_.description1 TODO
 * @apiSuccess {String} translation._lang_.description1.text TODO
 * @apiSuccess {String} translation._lang_.description1.title TODO
 * @apiSuccess {String} translation._lang_.description2 TODO
 * @apiSuccess {String} translation._lang_.description2.text TODO
 * @apiSuccess {String} translation._lang_.description2.title TODO
 * @apiSuccess {String} translation._lang_.canonical TODO
 */


 /**
 * @apiDefine ProductPrice
 * @apiSuccess {Object} price TODO
 * @apiSuccess {String} price.et TODO
 * @apiSuccess {String} price.et.normal TODO
 * @apiSuccess {String} price.ati TODO
 * @apiSuccess {String} price.ati.normal TODO
 * @apiSuccess {String} price.priceSort TODO
 * @apiSuccess {String} price.purchase TODO
 * @apiSuccess {String} price.tax TODO
 */




/**
 * @apiDefine ProductSchema
 * @apiSuccess {Array}  datas                           Array of users
 * @apiSuccess {String} datas.lastname                  lastname of user
 * @apiSuccess {Object} datas.firstname                 firstname of user
 * @apiSuccess {String} datas.fullname                  fullname of user
 * @apiSuccess {String} datas.email                     email of user
 * @apiSuccess {Number} datas.civility                  civility of user
 * @apiSuccess {Boolean} datas.isActiveAccount          Is active account
 * @apiSuccess {Boolean} datas.taxDisplay               Display taxe (true = ATI)
 * @apiSuccess {String} datas.preferredLanguage         Preferred language of user
 * @apiSuccess {Number} datas.creationDate              Creation date of user
 * @apiSuccess {Number} datas.delivery_address          Delivery address number (in array addresses)
 * @apiSuccess {Number} datas.billing_address           Billing address number (in array addresses)
 * @apiSuccess {Object[]} datas.attributes              List of user attributes
 */
