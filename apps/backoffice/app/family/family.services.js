var FamilyServices = angular.module('aq.family.services', ['ngResource']);

FamilyServices.factory('FamilyV2', ['$resource', function ($resource)
{
    return $resource('v2/:type/:id', {}, {
        list: {method: 'POST', params: {type: 'families'}}, 
        query: {method: 'POST', params: {type: 'family'}}, 
        save: {method: 'PUT', params: {type: 'family'}}, 
        delete: {method: 'DELETE', params: {type: 'family'}}, 
    });
}]);

FamilyServices.factory('Family', ['$resource', function ($resource)
{
    return $resource('families/:familyId', {}, {
        query: {method: 'GET', params: {familyId: ''}, isArray: true}, 
        update: {method: 'POST', params: {}}
    });
}]);

FamilyServices.factory('Familytype', ['$resource', function ($resource)
{
    return $resource('families/t/:familyType/:parent', {}, {
        query: {method: 'GET', params: {familyType: ''}, isArray: true}
    });
}]);

FamilyServices.factory('childrenfamily', ['$resource', function ($resource)
{
    return $resource('family/:id', {}, {
        query: {method: 'POST', params: {id: ''}, isArray: true}
    });
}]);