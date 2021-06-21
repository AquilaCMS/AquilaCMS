let OptionsDirectives = angular.module("aq.options.directives", []);

OptionsDirectives.directive("nsNewOptions", function () {
    return {
        restrict: "E",
        scope: false,
        templateUrl: "app/options/views/options-new-modal.html",
        controller: 'nsNewOptionsController'
    };
});