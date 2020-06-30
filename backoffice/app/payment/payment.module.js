var currModule = {name: "payment"};

angular.module('aq.' + currModule.name, [
    'aq.' + currModule.name + '.controllers', 
    'aq.' + currModule.name + '.routes'
]);