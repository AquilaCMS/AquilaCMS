var PaymentRoutes = angular.module('aq.payment.routes', ['ngRoute']);

PaymentRoutes.config(['$routeProvider', function ($routeProvider) {
        $routeProvider.when('/payments', {
            templateUrl: 'app/payment/views/payment-list.html',
            controller: 'PaymentListCtrl',
            resolve: {
                loggedin: checkLoggedin,
				checkAccess: checkAccess('payments'),
            }

        });
    }]);