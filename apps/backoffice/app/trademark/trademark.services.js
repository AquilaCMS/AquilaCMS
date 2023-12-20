var TrademarkServices = angular.module('aq.trademark.services', ['ngResource']);

TrademarkServices.factory('Trademark', ['$resource', function ($resource)
{
    return $resource('trademarks/:id', {}, {
        query: {method: 'GET', params: {}, isArray: true},
        update: {method: 'POST', params: {}}
    });
}]);

TrademarkServices.factory('TrademarksV2', ['$resource', function ($resource)
{
    return $resource('v2/:type/:id', {}, {
        list: {method: 'POST', params: {type: 'trademarks'}},
        query: {method: 'POST', params: {type: 'trademark'}},
        save: {method: 'PUT', params: {type: 'trademark'}},
        delete: {method: 'DELETE', params: {type: 'trademark'}}
    });
}]);

TrademarkServices.factory('TrademarkSearch', ['$resource', function ($resource)
{
    return $resource('trademarks/search', {}, {
        query: {method: 'GET', params: {}, isArray: true}
    });
}]);