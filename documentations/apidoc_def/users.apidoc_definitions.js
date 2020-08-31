



/**
 * @apiDefine UserSchemaDefault
 * @apiSuccess {Array}  datas           Array of users
 * @apiSuccess {String} datas.lastname  lastname of user
 * @apiSuccess {Object} datas.firstname firstname of user
 * @apiSuccess {String} datas.fullname  fullname of user
 * @apiSuccess {String} datas.email     email of user
 * @apiSuccess {Number} count           Total users matched
 */

/**
 * @apiDefine UserSchema
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

 /**
 * @apiDefine UserAddressSchema
 * @apiSuccess {Object[]} datas.addresses               List of user addresses
 * @apiSuccess {String} datas.addresses.line1           Line1 of address
 * @apiSuccess {Number} datas.addresses.line2           Line2 of address
 * @apiSuccess {String} datas.addresses.zipcode         Zipcode of address
 * @apiSuccess {String} datas.addresses.city            City of address
 * @apiSuccess {String} datas.addresses.phone_mobile    Mobile of address
 * @apiSuccess {String} datas.addresses.isoCountryCode  Country code ISO  of address
 * @apiSuccess {String} datas.addresses.firstname       Firstname of address
 * @apiSuccess {String} datas.addresses.lastname        Lastname of address
 * @apiSuccess {Number} datas.addresses.civility        Civility of address
 */
