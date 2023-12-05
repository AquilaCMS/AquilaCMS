var currModule = {name: "aq.contact"};

angular.module(currModule.name, [
    currModule.name + ".routes",
    currModule.name + ".services",
    currModule.name + ".controllers"
]);

angular.module("aq.dependencies").requires.push(currModule.name);