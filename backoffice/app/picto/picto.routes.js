var PictoRoutes = angular.module('aq.picto.routes', ['ngRoute']);

// ROUTE ----------------------------------------------------------------------------------------
PictoRoutes.config([
    '$routeProvider',
    function($routeProvider) {
        $routeProvider
            .when('/picto', {
                controller: 'PictoListCtrl',
                templateUrl: 'app/picto/views/picto-list.html',
                resolve: {
                    loggedin: checkLoggedin,
                    checkAccess : checkAccess('picto'),
                }
            })
            .when('/picto/new', {
                controller: 'PictoNewCtrl',
                templateUrl: 'app/picto/views/picto-details.html',
                resolve: {
                    loggedin: checkLoggedin,
                    checkAccess : checkAccess('picto'),
                }
            })
            .when('/picto/:id', {
                controller: 'PictoDetailsCtrl',
                templateUrl: 'app/picto/views/picto-details.html',
                resolve: {
                    loggedin: checkLoggedin,
                    checkAccess : checkAccess('picto'),
                }
            });
    }
]);
