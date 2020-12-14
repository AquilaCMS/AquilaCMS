var SystemDirectives = angular.module('aq.system.directives', []);

SystemDirectives.directive('inputFileSsl', function() {
    return {
        require: 'ngModel',
        link: function postLink(scope, elem, attrs, ngModel) {
            elem.on('change', (e) => {
                const file = elem[0].files[0];
                if (!scope.system.ssl){
                    scope.system.ssl = {};
                }
                scope.system.ssl[e.target.id] = file;
                scope.ssl[e.target.id] = file.name;
                ngModel.$setViewValue(file);
            })
        }
    }
})
