var currModule = {name: "attribute"};

angular.module('aq.' + currModule.name, [
    'aq.' + currModule.name + '.controllers', 
    'aq.' + currModule.name + '.services',
    'aq.' + currModule.name + '.routes'
]);