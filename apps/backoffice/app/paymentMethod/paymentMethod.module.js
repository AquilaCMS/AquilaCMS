var currModule = {name: "paymentMethod"};

angular.module('aq.' + currModule.name, [
    'aq.' + currModule.name + '.controllers',
    'aq.' + currModule.name + '.services',
    'aq.' + currModule.name + '.routes',
    'aq.' + currModule.name + '.directives'
]);