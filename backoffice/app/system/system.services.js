const SystemServices = angular.module('aq.system.services', ['ngResource']);

SystemServices.factory('System', ['$resource', function ($resource) {
    return $resource('system/:module/:action', {}, {
        query      : {method: 'GET', params: {}, isArray: true},
        save       : {method: 'POST', params: {module: 'save'}},
        import     : {method: 'POST', params: {module: 'imports', action: 'import'}},
        environment: {method: 'GET', params: {module: 'environment', action: 'environment'}}
    });
}]);


SystemServices.service('EnvBlocks', function () {
    return [];
});
