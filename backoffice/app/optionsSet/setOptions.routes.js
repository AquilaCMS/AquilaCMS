var SetOptionsRoutes = angular.module('aq.setOptions.routes', ['ngRoute']);

SetOptionsRoutes.config(['$routeProvider',
    function ($routeProvider) {

        $routeProvider
        .when('/setOptions', {
            templateUrl: 'app/optionsSet/views/setOption-list.html',
            controller: 'SetOptionListCtrl',
            resolve: {
                loggedin: checkLoggedin,
		checkAccess: checkAccess('options'),
            }
        }).when('/setOptions/new', {
            templateUrl: 'app/optionsSet/views/setOption-new.html',
            controller: 'SetOptionNewCtrl',
            resolve: {
                loggedin: checkLoggedin,
		checkAccess: checkAccess('options'),
            }
        }).when('/setOptions/:setOptionCode', {
            templateUrl: 'app/optionsSet/views/setOption-detail.html',
            controller: 'SetOptionDetailCtrl',
            resolve: {
                loggedin: checkLoggedin,
		checkAccess: checkAccess('options'),
            }
        });

    }]);