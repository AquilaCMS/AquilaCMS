
const TranslateRoutes = angular.module('aq.translate.routes', ['ngRoute']);

// ROUTE ----------------------------------------------------------------------------------------
TranslateRoutes.config(['$routeProvider', function ($routeProvider) {
    $routeProvider.when('/site/translate', {
        controller  : 'TranslateHomeCtrl',
        templateUrl : 'app/translate/views/translateHome.html',
        resolve     : {
            loggedin    : checkLoggedin,
            checkAccess : checkAccess('translate')
        }
    });
}]);
