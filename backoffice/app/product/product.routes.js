var ProductRoutes = angular.module('aq.product.routes', ['ngRoute']);

ProductRoutes.config(['$routeProvider',
    function ($routeProvider) {

        $routeProvider
                .when('/products', {
                    templateUrl: 'app/product/views/product-list.html',
                    controller: 'ProductListCtrl',
                    resolve: {
                        loggedin: checkLoggedin,
						checkAccess: checkAccess('products'),
                    }
                })
    }]);