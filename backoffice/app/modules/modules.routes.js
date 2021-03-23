var ConfigRoutes = angular.module('aq.modules.routes', ['ngRoute']);

// ROUTE ----------------------------------------------------------------------------------------
ConfigRoutes.config(['$routeProvider',
    function ($routeProvider) {
        $routeProvider
            .when('/modules', {
                controller  : 'ModulesCtrl',
                templateUrl : 'app/modules/views/modules.html',
                resolve     : {
                    loggedin    : checkLoggedin,
                    checkAccess : checkAccess('modules')
                }
            });
    }]);