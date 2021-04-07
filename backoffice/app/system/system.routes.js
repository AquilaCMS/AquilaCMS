var SystemRoutes = angular.module('aq.system.routes', ['ngRoute']);

// ROUTE ----------------------------------------------------------------------------------------
SystemRoutes.config(['$routeProvider', function ($routeProvider) {

    $routeProvider
        .when('/system', {
            name: 'systemImport',
            controller: 'systemGeneralController',
            templateUrl: 'app/system/views/system.html',
            resolve: {
                loggedin: checkLoggedin,
                checkAccess: checkAccess('system'),
            }
        });

}]);