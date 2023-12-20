var SimpleProductRoutes = angular.module("aq.simpleProduct.routes", ["ngRoute"]);

SimpleProductRoutes.config([
    "$routeProvider",
    function ($routeProvider)
    {
        $routeProvider
            .when("/products/simple/:code", {
                templateUrl: "app/productSimple/views/simpleProduct.html",
                controller: "SimpleProductCtrl",
                resolve: {
                    loggedin: checkLoggedin,
                    checkAccess: checkAccess("products")
                }
            });
    }
]);