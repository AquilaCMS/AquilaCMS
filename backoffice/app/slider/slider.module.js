var currModule = {name: "slider"};

angular.module("aq." + currModule.name, [
    "aq." + currModule.name + ".routes",
    "aq." + currModule.name + ".services",
    "aq." + currModule.name + ".controllers"
]);