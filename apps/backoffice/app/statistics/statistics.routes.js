angular.module("aq.statistics.routes", []).config([
    "$routeProvider", function ($routeProvider)
    {
        $routeProvider.when("/statistics", {
            templateUrl: "app/statistics/views/statistics.html",
            controller: "StatisticsCtrl",
            resolve: {
                loggedin: checkLoggedin,
                checkAccess: checkAccess("statistics")
            }
        }).when("/statistics/sells", {
            templateUrl: "app/statistics/views/stats-sell.html",
            controller: "StatisticsCtrl",
            resolve: {
                loggedin: checkLoggedin,
                checkAccess: checkAccess("statistics")
            }
        }).when("/statistics/clients", {
            templateUrl: "app/statistics/views/stats-clients.html",
            controller: "StatisticsCtrl",
            resolve: {
                loggedin: checkLoggedin,
                checkAccess: checkAccess("statistics")
            }
        });
    }
]);