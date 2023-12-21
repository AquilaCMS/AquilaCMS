const ProductVirtualServices = angular.module('aq.productVirtual.services', ['ngResource']);

ProductVirtualServices.factory('ProductVirtual', ['$resource', function ($resource) {
    return $resource('/v2/products', {}, {
        query : { method: 'POST', params: {} },
    });
}]);
