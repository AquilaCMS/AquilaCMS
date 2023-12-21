var currModule = {name: "cmsBlocks"};

angular.module('aq.' + currModule.name, [
    'aq.' + currModule.name + '.routes', 
    'aq.' + currModule.name + '.services', 
    'aq.' + currModule.name + '.controllers', 
    'aq.' + currModule.name + '.directives'
]);

angular.module('aq.' + currModule.name + '').constant("CstConfig", {name: currModule.name});

angular.module('aq.' + currModule.name + '').run(['CstConfig', function (CstConfig)
{
    // Module initialized
}]);