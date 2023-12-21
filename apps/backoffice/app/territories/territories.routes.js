var TerritoriesRoutes = angular.module('aq.territories.routes', ['ngRoute']);

TerritoriesRoutes.config(['$routeProvider',
    function ($routeProvider) {

        $routeProvider

            .when('/territories', {
                name: 'territories',
                controller: 'TerritoriesCtrl',
                templateUrl: 'app/territories/views/territories.html',
                resolve: {
                    loggedin: checkLoggedin,
					checkAccess: checkAccess('territories'),
                }
            })
            .when('/territories/new', {
                name: 'territories',
                controller: 'TerritoriesDetailCtrl',
                templateUrl: 'app/territories/views/territories.details.html',
                resolve: {
                    loggedin: checkLoggedin,
					checkAccess: checkAccess('territories'),
                }
            })
            .when('/territories/:territoryId', {
                name: 'territories',
                templateUrl: 'app/territories/views/territories.details.html',
                controller: 'TerritoriesDetailCtrl',
                resolve: {
                    loggedin: checkLoggedin,
                    checkAccess: checkAccess('territories'),
                }
            })

    }]);