var SupplierServices = angular.module('aq.supplier.services', []);

SupplierServices.factory('Supplier', [
    '$resource', function ($resource)
    {
        return $resource('suppliers/:action/:code', {}, {
            query: {method: 'GET', params: {}, isArray: true},
            update: {method: 'POST', params: {}},
            getById: {method: 'GET', params: {action: 'getById'}}
        });
    }
]);

SupplierServices.factory('SuppliersV2', [
    '$resource', function ($resource)
    {
        return $resource('v2/:type/:id', {}, {
            list: {method: 'POST', params: {type: 'suppliers'}},
            query: {method: 'POST', params: {type: 'supplier'}},
            save: {method: 'PUT', params: {type: 'supplier'}},
            delete: {method: 'DELETE', params: {type: 'supplier'}}
        });
    }
]);

SupplierServices.factory('SupplierSearch', [
    '$resource', function ($resource)
    {
        return $resource('suppliers/search', {}, {
            query: {method: 'POST', params: {}}
        });
    }
]);

SupplierServices.factory('SupplierProducts', [
    '$resource', function ($resource)
    {
        return $resource('suppliers/products/:id', {}, {
            query: {method: 'GET', params: {}, isArray: true},
        });
    }
]);