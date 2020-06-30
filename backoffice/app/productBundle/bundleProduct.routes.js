var BundleProductRoutes = angular.module("aq.bundleProduct.routes", ["ngRoute"]);

BundleProductRoutes.config([
    "$routeProvider",
    function ($routeProvider)
    {
        $routeProvider
            .when("/products/bundle/:code", {
                templateUrl: "app/productBundle/views/bundleProduct.html",
                controller: "BundleProductCtrl",
                resolve: {
                    loggedin: checkLoggedin,
                    checkAccess: checkAccess("products")
                }
            });
    }
]);