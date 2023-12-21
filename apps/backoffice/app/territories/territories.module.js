var currModule = {
    name: "territories"
};

angular.module('aq.' + currModule.name, [
    'aq.' + currModule.name + '.routes',
    'aq.' + currModule.name + '.services',
    'aq.' + currModule.name + '.controllers',
    'aq.' + currModule.name + '.directives'
]);

angular.module('aq.' + currModule.name + '').constant("CstTerritories", {
    name: currModule.name
});

angular.module('aq.' + currModule.name + '').run(
    ['CstTerritories',
    function (CstConfig) {

        // Module initialized


    }]);

