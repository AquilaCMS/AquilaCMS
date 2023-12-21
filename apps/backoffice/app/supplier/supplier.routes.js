var SupplierRoutes = angular.module('aq.supplier.routes', []);

SupplierRoutes.config(['$routeProvider',
    function ($routeProvider) {

        $routeProvider
        .when('/suppliers', {
            templateUrl: 'app/supplier/views/supplier-list.html',
            controller: 'SupplierListCtrl',
            resolve: {
                loggedin: checkLoggedin,
				checkAccess: checkAccess('suppliers'),
            }
        }).when('/suppliers/new', {
            templateUrl: 'app/supplier/views/supplier-new.html',
            controller: 'SupplierNewCtrl',
            resolve: {
                loggedin: checkLoggedin,
				checkAccess: checkAccess('suppliers'),
            }
        }).when('/suppliers/:supplierId', {
            templateUrl: 'app/supplier/views/supplier-detail.html',
            controller: 'SupplierDetailCtrl',
            resolve: {
                loggedin: checkLoggedin,
				checkAccess: checkAccess('suppliers'),
            }
        })

    }]);