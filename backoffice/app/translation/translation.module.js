var currModule = {
    name: "translation"
};

angular.module('aq.' + currModule.name, [
    'aq.' + currModule.name + '.controllers',
    'aq.' + currModule.name + '.routes',
    'aq.' + currModule.name + '.services',
]);

angular.module('aq.' + currModule.name + '').constant("CstTranslation", {
    name: currModule.name
});

angular.module('aq.' + currModule.name + '').run(
    ['CstTranslation',
    function (CstConfig) {

        // Module initialized

    }]);

