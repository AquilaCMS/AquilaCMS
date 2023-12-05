var StaticPageRoutes = angular.module('aq.staticPage.routes', []);

StaticPageRoutes.config(['$routeProvider',
    function ($routeProvider) {

        $routeProvider
        .when('/staticPage', {
            templateUrl: 'app/staticPage/views/staticPage-list.html',
            controller: 'StaticPageListCtrl',
            resolve: {
                loggedin: checkLoggedin,
				checkAccess: checkAccess('staticPage'),
            }
        }).when('/staticPage/new', {
            templateUrl: 'app/staticPage/views/staticPage-new.html',
            controller: 'StaticPageNewCtrl',
            resolve: {
                loggedin: checkLoggedin,
				checkAccess: checkAccess('staticPage'),
            }
        }).when('/staticPage/:code', {
            templateUrl: 'app/staticPage/views/staticPage-detail.html',
            controller: 'StaticPageDetailCtrl',
            resolve: {
                loggedin: checkLoggedin,
				checkAccess: checkAccess('staticPage'),
            }
        })

    }]);