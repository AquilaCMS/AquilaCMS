var currModule = { name: "invoices" };

angular.module('aq.' + currModule.name, [
    'aq.' + currModule.name + '.controllers',
    'aq.' + currModule.name + '.services',
    'aq.' + currModule.name + '.routes'
]);
