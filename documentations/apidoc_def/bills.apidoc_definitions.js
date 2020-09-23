/**
 * @apiDefine BillSchema
 * @apiSuccess {String} order_id (required, ref: 'orders')
 * @apiSuccess {String} facture (required)
 * @apiSuccess {String} montant (required)
 * @apiSuccess {Boolean} withTaxes (required)
 * @apiSuccess {String} client (required, ref: 'users')
 * @apiSuccess {String} nom (required)
 * @apiSuccess {String} prenom (required)
 * @apiSuccess {String} societe
 * @apiSuccess {String} coordonnees
 * @apiSuccess {String} email (required)
 * @apiSuccess {Date} creationDate (default: Date.now)
 * @apiSuccess {String} filename
 * @apiSuccess {Date} paymentDate
 * @apiSuccess {String} checksum
 * @apiSuccess {Boolean} isPaid (required)
 * @apiSuccess {String} lang
 * @apiSuccess {ItemSchema[]} items
 * @apiSuccess {Object} taxes
 * @apiSuccess {AddressSchema} address
 * @apiSuccess {Object} delivery
 * @apiSuccess {Object} delivery.price
 * @apiSuccess {Number} delivery.price.ati
 * @apiSuccess {Number} delivery.price.et
 * @apiSuccess {Number} delivery.price.vat
 * @apiSuccess {String} delivery.code
 * @apiSuccess {String} delivery.name
 * @apiSuccess {Object} promos
 * @apiSuccess {String} promos.promoId (ref: 'promo')
 * @apiSuccess {ObjectId} promos.promoCodeId L'id d'un promo.codes[i].code
 * @apiSuccess {Number} promos.discountATI (default: null)
 * @apiSuccess {Number} promos.discountET (default: null)
 * @apiSuccess {String} promos.name
 * @apiSuccess {String} promos.description
 * @apiSuccess {String} promos.code
 * @apiSuccess {PromoProductsId[]} promos.productsId Si des items sont dans ce tableau alors la promo s'appliquera a ces produits
 * @apiSuccess {Boolean} avoir (default: false)
 * @apiSuccess {Object} additionnalFees
 * @apiSuccess {Number} additionnalFees.ati (default: 0)
 * @apiSuccess {Number} additionnalFees.et (default: 0)
 * @apiSuccess {Number} additionnalFees.tax (default: 0)
 * @apiSuccess {Object} priceSubTotal
 * @apiSuccess {Number} priceSubTotal.ati (default: 0)
 * @apiSuccess {Number} priceSubTotal.et (default: 0)
 */

/**
 * @apiDefine ItemSchema
 * @apiSuccess {String} elem
 */

/**
 * @apiDefine PromoProductsId
 * @apiSuccess {String} productId (ref: 'products')
 * @apiSuccess {Number} discountATI (default: null) Chaque produit a une discount différente car son prix est différent
 * @apiSuccess {Number} discountET (default: null)
 * @apiSuccess {Number} basePriceET (default: null)
 * @apiSuccess {Number} basePriceATI (default: null)
 */