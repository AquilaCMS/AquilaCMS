var optionsSetRoutes = angular.module('aq.optionsSet.routes', ['ngRoute']);

optionsSetRoutes.config(['$routeProvider',
    function ($routeProvider) {
        $routeProvider
            .when('/optionsSet', {
                templateUrl: 'app/optionsSet/views/optionsSet-list.html',
                controller: 'OptionsSetListCtrl',
                resolve: {
                    loggedin: checkLoggedin,
                    checkAccess: checkAccess('optionsSet'),
                }
            })
            .when('/optionsSet/:code', {
                templateUrl: 'app/optionsSet/views/optionsSet-detail.html',
                controller: 'OptionsSetDetailCtrl',
                resolve: {
                    loggedin: checkLoggedin,
                    checkAccess: checkAccess('optionsSet'),
                }
            });
    }]);