var InvoicesRoutes = angular.module('aq.invoices.routes', ['ngRoute']);

InvoicesRoutes.config(['$routeProvider', function ($routeProvider) {
    $routeProvider.when("/invoices", {
        templateUrl: "app/invoices/views/invoices-list.html",
        controller: "InvoicesController",
        resolve: {
            loggedin: checkLoggedin,
            checkAccess: checkAccess('invoices')
        }
    })
}]);