var ClientRoutes = angular.module('aq.client.routes', ['ngRoute']);

ClientRoutes.config(['$routeProvider', function ($routeProvider)
{
    $routeProvider
        .when('/clients', {
            templateUrl: 'app/client/views/client-list.html',
            controller: 'ClientCtrl',
            resolve: {
                loggedin: checkLoggedin,
				checkAccess: checkAccess('clients'),
            }
        }).when('/clients/:clientId', {
            templateUrl: 'app/client/views/client-detail.html',
            controller: 'ClientDetailCtrl',
            resolve: {
                loggedin: checkLoggedin,
				checkAccess: checkAccess('clients'),
            }
        });
}]);