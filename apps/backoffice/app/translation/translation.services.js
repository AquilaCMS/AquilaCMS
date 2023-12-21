var TranslationServices = angular.module('aq.translation.services', ['ngResource']);

TranslationServices.service('LanguagesApi', ['$resource', function ($resource)
{
    return $resource('languages/:id', {}, {});
}]);

TranslationServices.service('LanguagesApiV2', ['$resource', function ($resource)
{
    return $resource('v2/:type/:id', {}, {
        list: {method: 'POST', params: {type: 'languages'}},
        query: {method: 'POST', params: {type: 'language'}},
        save: {method: 'PUT', params: {type: 'language'}},
        delete: {method: 'DELETE', params: {type: 'language'}},
    });
}]);