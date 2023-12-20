var TranslationRoutes = angular.module('aq.translation.routes', ['ngRoute']);

TranslationRoutes.config(['$routeProvider',
    function ($routeProvider) {

        $routeProvider

            .when('/languages', {
                controller: 'LanguagesCtrl',
                templateUrl: 'app/translation/views/languages.html',
                resolve: {
				    checkAccess: checkAccess('languages'),
                }
            });


    }]);