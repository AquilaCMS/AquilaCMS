let OptionsDirectives = angular.module("aq.options.directives", []);

OptionsDirectives.directive("nsOptionsDetails", function () {
    return {
        restrict: "E",
        scope: false,
        templateUrl: "app/options/views/templates/options.html",
        controller: 'nsNewOptionsController'
    };
});

OptionsDirectives.directive("nsOptionsList", function () {
    return {
        restrict: "E",
        scope: {
            optionsSetList: "=",
        },
        templateUrl: "app/options/views/templates/options-list.html",
        controller: 'nsListOptionsController'
    };
});