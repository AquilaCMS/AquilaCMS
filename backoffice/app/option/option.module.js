var currModule = {name: "option"};

angular.module('aq.' + currModule.name, [
    'aq.' + currModule.name + '.controllers',
    'aq.' + currModule.name + '.routes'
]);