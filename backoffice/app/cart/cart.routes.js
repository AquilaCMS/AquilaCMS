var CartRoutes = angular.module('aq.cart.routes', ['ngRoute']);

CartRoutes.config(['$routeProvider',

    function ($routeProvider) {

        $routeProvider
        .when('/cart', {
            templateUrl: 'app/cart/views/cart-list.html',
            controller: 'CartListCtrl',
            resolve: {
                loggedin: checkLoggedin,
				checkAccess: checkAccess('orders'),
            }
        }).when('/cart/:cartId', {
            templateUrl: 'app/cart/views/cart-detail.html',
            controller: 'CartListDetails',
            resolve: {
                loggedin: checkLoggedin,
				checkAccess: checkAccess('orders'),
            }
        });

    }]);