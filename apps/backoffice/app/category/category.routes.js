var CategoryRoutes = angular.module('aq.category.routes', ['ngRoute']);

CategoryRoutes.config(['$routeProvider',
    function ($routeProvider) {

        $routeProvider
        .when('/categories', {
            templateUrl: 'app/category/views/category-list.html',
            controller: 'CategoryListCtrl',
            resolve: {
                loggedin: checkLoggedin,
		        checkAccess: checkAccess('categories'),
            }
        }).when('/categories/new', {
            templateUrl: 'app/category/views/modals/category-new.html',
            controller: 'CategoryNewCtrl',
            resolve: {
                loggedin: checkLoggedin,
		        checkAccess: checkAccess('categories'),
            }
        }).when('/categories/:id', {
            templateUrl: 'app/category/views/category-detail.html',
            controller: 'CategoryDetailCtrl',
            resolve: {
                loggedin: checkLoggedin,
		        checkAccess: checkAccess('categories'),
            }
        });

    }]);