var ConfigRoutes = angular.module('aq.config.routes', ['ngRoute']);

// ROUTE ----------------------------------------------------------------------------------------
ConfigRoutes.config(['$routeProvider', function ($routeProvider) {

    $routeProvider
        .when('/config/imports', {
            name: 'import',
            controller: 'ImportConfigCtrl',
            templateUrl: 'app/config/views/imports.config.html',
            resolve: {loggedin: checkLoggedin,
				checkAccess: checkAccess('config'),}
        })
        .when('/config/environment', {
            name: 'environment',
            controller: 'EnvironmentConfigCtrl',
            templateUrl: 'app/config/views/environment.config.html',
            resolve: {
              loggedin: checkLoggedin,
              checkAccess: checkAccess('config'),
            }
        })
        // Page avec un simple bouton qui appelle la route (temporaire cb)
        .when('/import', {
            name: 'importTmp',
            controller: 'ImportTmpConfigCtrl',
            templateUrl: 'app/config/views/import.config.html',
            resolve: {
              loggedin: checkLoggedin,
              checkAccess: checkAccess('config'),
            }
        });

}]);