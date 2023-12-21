angular.module("aq.stock.routes", []).config([
    "$routeProvider",
    function ($routeProvider) {
        $routeProvider.when("/stock", {
            templateUrl: "app/stock/stock.html",
            controller: "StockCtrl",
            resolve: {
                loggedin: checkLoggedin,
                checkAccess: checkAccess("stock")
            }
        });
    }
]);