var PromoServices = angular.module('aq.promo.services', ['ngResource']);

PromoServices.factory('PromoCheckOrderById', ['$resource', function ($resource) {
    return $resource('/v2/order/:_id', {}, {
        query: { method: 'POST'}
    });
}]);

PromoServices.factory('PromosV2', ['$resource', function ($resource) {
    return $resource('/v2/:type/:id', {}, {
        list: { method: 'POST', params: {type: 'promos'}  },
        query: { method: 'POST', params: {type: 'promo'}  },
        save: { method: 'PUT', params: {type: 'promo'}  },
        delete: { method: 'DELETE', params: {type: 'promo'}  }
    });
}]);

PromoServices.factory('PromoCodeV2', ['$resource', function ($resource) {
    return $resource('/v2/promo/:promoId/code/:codeId', {}, {
        delete: { method: 'DELETE', params: { }}
    });
}]);

PromoServices.factory('PromoGetById', ['$resource', function ($resource) {
    return $resource('/v2/promo/:_id', {}, {
        query: { method: 'POST', params: {} },
    });
}]);

PromoServices.factory('PromoClone', ['$resource', function ($resource) {
    return $resource('/v2/promo/:_id/clone', {}, {
        clone: { method: 'PUT', params: {_id:"_id"} },
    });
}]);
