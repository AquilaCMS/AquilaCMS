var currModule = {
    name: "product"
};

angular.module('aq.' + currModule.name, [
    'aq.' + currModule.name + '.routes',
    'aq.' + currModule.name + '.services',
    'aq.' + currModule.name + '.controllers',
    'aq.' + currModule.name + '.directives',
    'aq.' + currModule.name + '.filters'
]);

angular.module('aq.' + currModule.name + '').constant("CstProduct", {
    name: currModule.name
});

angular.module('aq.' + currModule.name + '').run(
    ['CstProduct',
    function (CstConfig) {

        // Module initialized

    }]);

