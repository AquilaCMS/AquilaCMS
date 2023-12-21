var currModule = {
    name: "medias"
};

angular.module('aq.' + currModule.name, [
    'aq.' + currModule.name + '.routes',
    'aq.' + currModule.name + '.services',
    'aq.' + currModule.name + '.controllers',
    'aq.' + currModule.name + '.directives'
]);

angular.module('aq.' + currModule.name + '').constant("CstMedias", {
    name: currModule.name
});

angular.module('aq.' + currModule.name + '').run(
    ['CstMedias',
    function (CstConfig) {

        // Module initialized


    }]);

