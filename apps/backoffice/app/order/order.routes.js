var OrderRoutes = angular.module('aq.order.routes', ['ngRoute']);

OrderRoutes.config(['$routeProvider',

    function ($routeProvider) {

        $routeProvider
        .when('/orders', {
            templateUrl: 'app/order/views/order-list.html',
            controller: 'OrderListCtrl',
            resolve: {
                loggedin: checkLoggedin,
				checkAccess: checkAccess('orders'),
            }
        })
        .when('/orders/:orderId', {
            templateUrl: 'app/order/views/order-detail.html',
            controller: 'OrderDetailCtrl',
            resolve: {
                loggedin: checkLoggedin,
				checkAccess: checkAccess('orders'),
            }
        });

    }]);