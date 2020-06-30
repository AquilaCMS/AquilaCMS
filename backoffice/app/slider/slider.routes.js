angular.module("aq.slider.routes", ["ngRoute"]).config([
    "$routeProvider", function ($routeProvider)
    {
        $routeProvider.when("/component/slider", {
            templateUrl: "app/slider/views/slider-list.html",
            controller: "SliderListCtrl",
            resolve: {
                loggedin: checkLoggedin,
                checkAccess: checkAccess("slider")
            }
        }).when("/component/slider/:id", {
            templateUrl: "app/slider/views/slider-detail.html",
            controller: "SliderDetailCtrl",
            resolve: {
                loggedin: checkLoggedin,
                checkAccess: checkAccess("slider"),
            }
        });
    }
]);