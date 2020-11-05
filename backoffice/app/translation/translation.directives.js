const adminTranslateDirectives = angular.module('aq.translation');

adminTranslateDirectives.directive('nsTranslation', [
    '$rootScope', function ($rootScope) {
        return {
            restrict : 'E',
            require  : 'ngModel',
            template : '<select ng-show=\'languages.length > 1\' class=\'form-control\' ng-model=\'lang\' ng-options=\'lang.code as lang.name for lang in languages\' style=\'width: 121px\'></select>',
            link(scope, element) {
                scope.lang = $rootScope.languages.find(function (lang) {
                    return lang.defaultLanguage;
                }).code;

                if (scope.langChange) {
                    scope.langChange(scope.lang);
                }

                if (scope.langChange) {
                    element.bind('change', function () {
                        scope.langChange(scope.lang);
                    });
                }
            }
        };
    }
]);