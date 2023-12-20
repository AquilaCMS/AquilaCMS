var AttributesRoutes = angular.module('aq.attribute.routes', ['ngRoute']);

AttributesRoutes.config(['$routeProvider', function ($routeProvider)
{
    $routeProvider.when('/users/attributes', {
            templateUrl: 'app/attribute/views/attribute-list.html',
            controller: 'AttributeListCtrl',
            resolve: {
                loggedin: checkLoggedin,
				checkAccess: checkAccess('attributes'),
            }
        }).when('/users/attributes/new/:code', {
            templateUrl: 'app/attribute/views/attribute-detail.html',
            controller: 'AttributeDetailCtrl',
            resolve: {
                loggedin: checkLoggedin,
				checkAccess: checkAccess('attributes'),
            }
        }).when('/users/attributes/:attributeCode', {
            templateUrl: 'app/attribute/views/attribute-detail.html',
            controller: 'AttributeDetailCtrl',
            resolve: {
                loggedin: checkLoggedin,
				checkAccess: checkAccess('attributes'),
            }
        }).when('/products/attributes', {
            templateUrl: 'app/attribute/views/attribute-list.html',
            controller: 'AttributeListCtrl',
            resolve: {
                loggedin: checkLoggedin,
				checkAccess: checkAccess('attributes'),
            }
        }).when('/products/attributes/new/:code', {
            templateUrl: 'app/attribute/views/attribute-detail.html',
            controller: 'AttributeDetailCtrl',
            resolve: {
                loggedin: checkLoggedin,
				checkAccess: checkAccess('attributes'),
            }
        }).when('/products/attributes/:attributeCode', {
            templateUrl: 'app/attribute/views/attribute-detail.html',
            controller: 'AttributeDetailCtrl',
            resolve: {
                loggedin: checkLoggedin,
				checkAccess: checkAccess('attributes'),
            }
        });
}]);