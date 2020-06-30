var CmsBlocksRoutes = angular.module('aq.cmsBlocks.routes', ['ngRoute']);

// ROUTE ----------------------------------------------------------------------------------------
CmsBlocksRoutes.config(['$routeProvider', function ($routeProvider)
{
    $routeProvider.when('/cmsBlocks', {
        controller: 'CmsBlocksListCtrl', 
        templateUrl: 'app/cmsBlocks/views/cmsBlocksList.html', 
        resolve: {
            loggedin: checkLoggedin,
			checkAccess: checkAccess('cmsBlocks'),
        }
    }).when('/cmsBlocks/:code', {
        controller: 'CmsBlocksDetailCtrl', 
        templateUrl: 'app/cmsBlocks/views/cmsBlocksDetail.html', 
        resolve: {
            loggedin: checkLoggedin,
			checkAccess: checkAccess('cmsBlocks'),
        }
    });
}]);