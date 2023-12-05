var currModule = {name: 'modules'};

angular.module(`aq.${currModule.name}`, [
    "aq." + currModule.name + ".routes",
    "aq." + currModule.name + ".services",
    "aq." + currModule.name + ".controllers"
]);

angular.module(`aq.${currModule.name}`).constant('CstModules', {
    name : currModule.name
});

angular.module(`aq.${currModule.name}`).run(['CstModules', function (CstModules) {
    // Module initialized
}]);