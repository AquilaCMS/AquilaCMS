const StaticPageServices = angular.module('aq.staticPage.services', []);

StaticPageServices.factory('StaticV2', ['$resource', function ($resource) {
    return $resource('v2/:type/:id', {}, {
        list : {method: 'POST', params: {type: 'statics'}},
        query : {method: 'POST', params: {type: 'static'}},
        save : {method: 'PUT', params: {type: 'static'}},
        delete : {method: 'DELETE', params: {type: 'static'}},
        preview : {method: 'POST', params: {type: 'static', id: "preview"}}
    });
}]);

StaticPageServices.service('HookPageInfo', function ()
{
    return [];
});