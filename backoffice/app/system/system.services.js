const SystemServices = angular.module('aq.system.services', ['ngResource']);

SystemServices.factory('System', ['$resource', function ($resource) {
    return $resource('/v2/log/:action', {}, {
        setFiles  : {method: 'POST', params: {action: 'setFiles'}},
        getFiles  : {method: 'GET', params: {action: 'file'}},
    });
}]);

