const ProductVirtualRoutes = angular.module('aq.productVirtual.routes', ['ngRoute']);

ProductVirtualRoutes.config(['$routeProvider',

    function ($routeProvider) {
        $routeProvider
            .when('/products/virtual/:code', {
                templateUrl : 'app/productVirtual/views/product-virtual.html',
                controller  : 'ProductVirtualCtrl',
                resolve     : {
                    loggedin : checkLoggedin,
                    checkAccess: checkAccess("products")
                }
            });
    }]);
