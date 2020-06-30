var SetAttributesRoutes = angular.module('aq.setAttributes.routes', ['ngRoute']);

SetAttributesRoutes.config(['$routeProvider', function ($routeProvider)
{
    $routeProvider.when('/users/setAttributes', {
            templateUrl: 'app/attributesSet/views/setAttribute-list.html',
            controller: 'SetAttributesListCtrl',
            resolve: {
                loggedin: checkLoggedin,
				checkAccess: checkAccess('attributes'),
            }
        }).when('/users/setAttributes/new', {
            templateUrl: 'app/attributesSet/views/setAttribute-new.html',
            controller: 'SetAttributesNewCtrl',
            resolve: {
                loggedin: checkLoggedin,
				checkAccess: checkAccess('attributes'),
            }
        }).when('/users/setAttributes/:setAttributeCode', {
            templateUrl: 'app/attributesSet/views/setAttribute-detail.html',
            controller: 'SetAttributesDetailCtrl',
            resolve: {
                loggedin: checkLoggedin,
				checkAccess: checkAccess('attributes'),
            }
        }).when('/products/setAttributes', {
            templateUrl: 'app/attributesSet/views/setAttribute-list.html',
            controller: 'SetAttributesListCtrl',
            resolve: {
                loggedin: checkLoggedin,
				checkAccess: checkAccess('attributes'),
            }
        }).when('/products/setAttributes/new', {
            templateUrl: 'app/attributesSet/views/setAttribute-new.html',
            controller: 'SetAttributesNewCtrl',
            resolve: {
                loggedin: checkLoggedin,
				checkAccess: checkAccess('attributes'),
            }
        }).when('/products/setAttributes/:setAttributeCode', {
            templateUrl: 'app/attributesSet/views/setAttribute-detail.html',
            controller: 'SetAttributesDetailCtrl',
            resolve: {
                loggedin: checkLoggedin,
				checkAccess: checkAccess('attributes'),
            }
        })
}]);