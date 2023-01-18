const ConfigsServices = angular.module('aq.config.services', ['ngResource']);

ConfigsServices.factory('Config', ['$resource', function ($resource) {
    return $resource('config/:module/:action', {}, {
        query       : {method: 'GET', params: {}, isArray: true},
        save        : {method: 'POST', params: {module: 'save'}},
        import      : {method: 'POST', params: {module: 'imports', action: 'import'}},
        environment : {method: 'GET', params: {module: 'environment', action: 'environment'}}
    });
}]);

ConfigsServices.factory('ConfigV2', ['$resource', function ($resource) {
    return $resource('v2/config/:option', {}, {
        get  : {method: 'POST'},
        save : {method: 'PUT'},
    });
}]);
