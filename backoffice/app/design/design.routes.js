
const DesignRoutes = angular.module('aq.design.routes', ['ngRoute']);

// ROUTE ----------------------------------------------------------------------------------------
DesignRoutes.config(['$routeProvider', function ($routeProvider) {
    $routeProvider.when('/site/design', {
        controller  : 'DesignHomeCtrl',
        templateUrl : 'app/design/views/designHome.html',
        resolve     : {
            loggedin    : checkLoggedin,
            checkAccess : checkAccess('design')
        }
    });
}]);
