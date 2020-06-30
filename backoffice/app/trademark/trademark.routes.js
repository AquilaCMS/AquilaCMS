var TrademarkRoutes = angular.module('aq.trademark.routes', ['ngRoute']);

TrademarkRoutes.config(['$routeProvider',
    function ($routeProvider) {

        $routeProvider
        .when('/trademarks', {
            templateUrl: 'app/trademark/views/trademark-list.html',
            controller: 'TrademarkListCtrl',
            resolve: {
                loggedin: checkLoggedin,
				checkAccess: checkAccess('trademarks'),
            }
        }).when('/trademarks/new', {
            templateUrl: 'app/trademark/views/trademark-new.html',
            controller: 'TrademarkNewCtrl',
            resolve: {
                loggedin: checkLoggedin,
				checkAccess: checkAccess('trademarks'),
            }
        }).when('/trademarks/:trademarkId', {
            templateUrl: 'app/trademark/views/trademark-detail.html',
            controller: 'TrademarkDetailCtrl',
            resolve: {
                loggedin: checkLoggedin,
				checkAccess: checkAccess('trademarks'),
            }
        })

    }]);