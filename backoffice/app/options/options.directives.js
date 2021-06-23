let OptionsDirectives = angular.module("aq.options.directives", []);

OptionsDirectives.directive("nsOptionsDetails", function () {
    return {
        restrict: "E",
        scope: {
            options: "="
        },
        templateUrl: "app/options/views/templates/options.html",
        controller: 'nsNewOptionsController'
    };
});

OptionsDirectives.directive("nsOptionsList", function () {
    return {
        restrict: "E",
        scope: {
            optionsList: "=",
            onClickItem: "="
        },
        templateUrl: "app/options/views/templates/options-list.html",
        controller: 'nsListOptionsController'
    };
});