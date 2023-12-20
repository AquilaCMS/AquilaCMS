var AdminListRoutes = angular.module('aq.adminList.routes', ['ngRoute']);

AdminListRoutes.config(['$routeProvider',
    function ($routeProvider) {
        $routeProvider.when("/list", {
            templateUrl: "app/adminList/views/admin-list.html",
            controller: "AdminCtrl",
            resolve: {
                loggedin: checkLoggedin,
                checkAccess: checkAccess("admin")
            }
        })
            .when("/list/new", {
                templateUrl: "app/adminList/views/admin-list-new.html",
                controller: "AdminNewCtrl",
                resolve: {
                    loggedin: checkLoggedin,
                    checkAccess: checkAccess("admin")
                }
            })
            .when("/list/detail/:id", {
                templateUrl: "app/adminList/views/admin-list-detail.html",
                controller: "AdminDetailCtrl",
                resolve: {
                    loggedin: checkLoggedin,
                    checkAccess: checkAccess("admin")
                }
            })
    }
]);