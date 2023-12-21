angular.module("aq.gallery.routes", ["ngRoute"]).config([
    "$routeProvider", function ($routeProvider)
    {
        $routeProvider.when("/component/gallery", {
            templateUrl: "app/gallery/views/gallery-list.html",
            controller: "GalleryListCtrl",
            resolve: {
                loggedin: checkLoggedin,
                checkAccess: checkAccess("configComponent"),
                checkAccess: checkAccess('gallery')
            }
        }).when("/component/gallery/:id", {
            templateUrl: "app/gallery/views/gallery-detail.html",
            controller: "GalleryDetailCtrl",
            resolve: {
                loggedin: checkLoggedin,
                checkAccess: checkAccess("configComponent"),
                checkAccess: checkAccess('gallery')
            }
        });
    }
]);