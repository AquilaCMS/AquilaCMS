var OptionRoutes = angular.module('aq.option.routes', ['ngRoute']);

OptionRoutes.config(['$routeProvider',
    function ($routeProvider) {

        $routeProvider
        .when('/opts', {
            templateUrl: 'app/option/views/option-list.html',
            controller: 'OptListCtrl',
            resolve: {
                loggedin: checkLoggedin,
				checkAccess: checkAccess('options'),
            }
        }).when('/opts/new', {
            templateUrl: 'app/option/views/option-new.html',
            controller: 'OptNewCtrl',
            resolve: {
                loggedin: checkLoggedin,
				checkAccess: checkAccess('options'),
            }
        }).when('/opts/new/:code', {
            templateUrl: 'app/option/views/option-new.html',
            controller: 'OptNewCtrl',
            resolve: {
                loggedin: checkLoggedin,
				checkAccess: checkAccess('options'),
            }
        }).when('/opts/:optCode', {
            templateUrl: 'app/option/views/option-detail.html',
            controller: 'OptDetailCtrl',
            resolve: {
                loggedin: checkLoggedin,
				checkAccess: checkAccess('options'),
            }
        });

    }]);