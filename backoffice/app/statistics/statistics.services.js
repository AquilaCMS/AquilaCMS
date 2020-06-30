angular.module("aq.statistics.services", []);

let StatsServices = angular.module('aq.statistics.services', ['ngResource']);


StatsServices.factory('Statistics', ['$resource', function ($resource) {
    return $resource('/v2/statistics/generate', {}, {
        generate: {method: 'POST', params: {}},
    });
}]);


