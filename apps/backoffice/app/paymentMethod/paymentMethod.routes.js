var PaymentMethodRoutes = angular.module('aq.paymentMethod.routes', ['ngRoute']);

PaymentMethodRoutes.config(['$routeProvider',

    function ($routeProvider) {

        $routeProvider
        .when('/paymentMethods', {
            templateUrl: 'app/paymentMethod/views/paymentMethod-list.html',
            controller: 'PaymentMethodListCtrl',
            resolve: {
                loggedin: checkLoggedin,
				checkAccess: checkAccess('paymentMethods'),
            }
        })
        .when('/paymentMethods/:methodId', {
            templateUrl: 'app/paymentMethod/views/paymentMethod-detail.html',
            controller: 'PaymentMethodDetailCtrl',
            resolve: {
                loggedin: checkLoggedin,
				checkAccess: checkAccess('paymentMethods'),
            }
        });

    }]);