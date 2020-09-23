var ConfigDirectives = angular.module('aq.config.directives', []);

ConfigDirectives.directive('inputNgFile', function() {
    return {
        require: 'ngModel',
        link: function postLink(scope, elem, attrs, ngModel) {
            elem.on('change', (e) => {
                const file = elem[0].files[0];
                if (!scope.config.ssl) scope.config.ssl = {};
                scope.config.ssl[e.target.id] = file;
                scope.ssl[e.target.id] = file.name;
                ngModel.$setViewValue(file);
            })
        }
    }
})
