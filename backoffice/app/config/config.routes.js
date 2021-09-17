var ConfigRoutes = angular.module('aq.config.routes', ['ngRoute']);

// ROUTE ----------------------------------------------------------------------------------------
ConfigRoutes.config(['$routeProvider', function ($routeProvider) {

    $routeProvider
        .when('/config/environment', {
            name: 'environment',
            controller: 'EnvironmentConfigCtrl',
            templateUrl: 'app/config/views/environment.config.html',
            resolve: {
                loggedin: checkLoggedin,
                checkAccess: checkAccess('config'),
            }
        });
}]);