const SystemServices = angular.module('aq.system.services', ['ngResource']);

SystemServices.factory('System', ['$resource', function ($resource) {
    return $resource('/v2/system/:tab/:action', {}, {
        getFilesLogAndErrorRoute : {method: 'POST',  params: {tab: 'log',  action: 'file'}}
    });
}]);

SystemServices.service('EnvBlocks', function () {
    return [];
});
