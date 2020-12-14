const SystemServices = angular.module('aq.system.services', ['ngResource']);

SystemServices.factory('System', ['$resource', function ($resource) {
    return $resource('/v2/system/:tab/:action', {}, {
        setFiles                : {method: 'POST', params: {tab: 'log',  action: 'setFiles'}},
        getFilesRoute           : {method: 'GET',  params: {tab: 'log',  action: 'file'}},
        getNextVersionRoute     : {method: 'GET',  params: {tab: 'next', action: 'get'}},
        changeNextVersionRoute  : {method: 'POST', params: {tab: 'next', action: 'change'}},
    });
}]);

