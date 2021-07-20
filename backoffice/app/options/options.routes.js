var OptionsRoutes = angular.module('aq.options.routes', ['ngRoute']);

OptionsRoutes.config(['$routeProvider',
    function ($routeProvider) {
        $routeProvider
            .when('/options', {
                templateUrl: 'app/options/views/options-list.html',
                controller: 'OptionsListCtrl',
                resolve: {
                    loggedin: checkLoggedin,
                    checkAccess: checkAccess('options'),
                }
            })
            .when('/options/details/:code', {
                templateUrl: 'app/options/views/options-detail.html',
                controller: 'OptionsDetailCtrl',
                resolve: {
                    loggedin: checkLoggedin,
                    checkAccess: checkAccess('options'),
                }
            })
    }
]);