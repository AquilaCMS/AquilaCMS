var Themes = angular.module('aq.themes.routes', ['ngRoute']);

Themes.config(['$routeProvider', function ($routeProvider) {
    $routeProvider.when('/themes', {
        templateUrl: 'app/themes/views/themes.html',
        controller: 'ThemesCtrl',
        resolve: {
            loggedin: checkLoggedin,
            checkAccess: checkAccess('themes'),
        }
    })
}]); 