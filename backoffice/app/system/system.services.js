const SystemServices = angular.module('aq.system.services', ['ngResource']);

SystemServices.factory('System', ['$resource', function ($resource) {
    return $resource('system/log/:action', {}, {
        setLinks  : {method: 'POST', params: {action: 'setlinks'}},
        getLinks  : {method: 'GET', params: {action: 'links'}},
        getFiles  : {method: 'GET', params: {action: 'file'}},
    });
}]);

