const OptionsControllers = angular.module("aq.options.controllers", []);

OptionsControllers.controller("OptionsListCtrl", [
    "$scope", "$rootScope", "$location",
    function ($scope, $rootScope, $location) {

    }
]);


OptionsControllers.controller("nsNewOptionsController", [
    "$scope", "$rootScope", "$location", "$modalInstance",
    function ($scope, $rootScope, $location, $modalInstance) {
        $scope.close = function (value) {
            $modalInstance.close(value);
        }

        $scope.save = function () {
            $scope.close(true);
        }

        $scope.cancel = function () {
            $scope.close(false);
        }
    }
]);