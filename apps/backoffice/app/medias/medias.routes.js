var MediasRoutes = angular.module('aq.medias.routes', ['ngRoute']);

MediasRoutes.config(['$routeProvider',
    function ($routeProvider) {

        $routeProvider

            .when('/medias', {
                name: 'medias',
                controller: 'MediasCtrl',
                templateUrl: 'app/medias/views/medias.html',
                resolve: {
                    loggedin: checkLoggedin,
					checkAccess: checkAccess('medias'),
                }
            })
            .when('/medias/:id', {
                name: 'medias',
                controller: 'MediasDetailsCtrl',
                templateUrl: 'app/medias/views/medias-new.html',
                resolve: {
                    loggedin: checkLoggedin,
					checkAccess: checkAccess('medias'),
                }
            })

    }]);