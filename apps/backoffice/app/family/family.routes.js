var FamilyRoutes = angular.module('aq.family.routes', ['ngRoute']);

FamilyRoutes.config(['$routeProvider', function ($routeProvider)
{
    $routeProvider.when('/families', {
            templateUrl: 'app/family/views/family-list.html',
            controller: 'FamilyListCtrl',
            resolve: {
                loggedin: checkLoggedin,
				checkAccess: checkAccess('families'),
            }
        }).when('/families/new', {
            templateUrl: 'app/family/views/family-new.html',
            controller: 'FamilyNewCtrl',
            resolve: {
                loggedin: checkLoggedin,
				checkAccess: checkAccess('families'),
            }
        }).when('/families/:familyId', {
            templateUrl: 'app/family/views/family-detail.html',
            controller: 'FamilyDetailCtrl',
            resolve: {
                loggedin: checkLoggedin,
				checkAccess: checkAccess('families'),
            }
        });
}]);