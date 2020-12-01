var currModule = {name: "system"};

angular.module('aq.' + currModule.name,
        ['aq.'+ currModule.name + '.routes',
        'aq.' + currModule.name + '.services',
        'aq.' + currModule.name + '.controllers',
        'aq.' + currModule.name + '.directives']);

angular.module('aq.' + currModule.name + '').constant("CstSystem", {name: currModule.name});

angular.module('aq.' + currModule.name + '').run(['CstSystem', function (CstSystem)
{
    // Module initialized
}]);