
const UpdateRoutes = angular.module('aq.update.routes', ['ngRoute']);

// ROUTE ----------------------------------------------------------------------------------------
UpdateRoutes.config(['$routeProvider', function ($routeProvider) {
    $routeProvider.when('/update', {
        controller  : 'UpdateHomeCtrl',
        templateUrl : 'app/update/views/updateHome.html',
        resolve     : {
            loggedin    : checkLoggedin,
            checkAccess : checkAccess('update')
        }
    });
}]);
