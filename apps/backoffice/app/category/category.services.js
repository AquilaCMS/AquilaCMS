var CategoryServices = angular.module('aq.category.services', ['ngResource']);

CategoryServices.factory('Category', ['$resource', function ($resource)
{
    return $resource('categories/:action/:id', {}, {
        getRoots: {method: 'GET', params: {action: 'roots', id: ''}, isArray: true},
        getChildren: {method: 'GET', params: {action: 'children'}, isArray: true},
        update: {method: 'PUT', params: {}}
    });
}]);

CategoryServices.factory('CategoryV2', ['$resource', function ($resource)
{
    return $resource('/v2/:type/:id', {}, {
        list: {method: 'POST', params: {type: 'categories'}},
        get: {method: 'POST', params: {type: 'category'}},
        canonical: {method: 'POST', params: {type: 'category', id: 'canonical'}},
        save: {method: 'PUT', params: {type: 'category'}},
        delete: {method: 'DELETE', params: {type: 'category'}},
        applyTranslatedAttribs: {method: 'POST', params: {type: 'category', id: 'applyTranslatedAttribs'}}
    });
}]);

CategoryServices.factory('CategoryById', ['$resource', function ($resource)
{
    return $resource('/categories/i/:id', {}, {
        query: {method: 'GET', params: {id: ''}, isArray: true}
    });
}]);

CategoryServices.factory('CategoryGetAttributesUsedInFilters', ['$resource', function ($resource)
{
    return $resource('/v2/attributes', {}, {
        query: {method: 'POST', params: {}/*, isArray: true*/}
    });
}]);

CategoryServices.factory('CategoryProducts', ['$resource', function ($resource)
{
    return $resource('/categories/:action/:id', {}, {
        query: {method: 'POST', params: {action: "products"}, isArray: true},
        getPos: {method: 'GET', params: {action: "pp", id: ""}, isArray: true},
        move: {method: 'POST', params: {action: "moveProduct"}}
    });
}]);