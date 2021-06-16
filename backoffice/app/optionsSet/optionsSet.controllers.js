var OptionsSetControllers = angular.module("aq.optionsSet.controllers", []);

OptionsSetControllers.controller("OptionsSetListCtrl", [
    "$scope", "$location", "$rootScope", "OptionsSetServices",
    function ($scope, $location, $rootScope, OptionsSetServices) {
        $scope.sortType = "name"; // set the default sort type
        $scope.sortReverse = false;  // set the default sort order

        $scope.getData = function () {
            OptionsSetServices.list({}, function (response) {
                $scope.optionsSet = response.datas;
            });
        }

        $scope.getData();

        $scope.gotToDetail = function (code) {
            $location.path(`/optionsSet/${code}`);
        };
    }
]);



OptionsSetControllers.controller("OptionsSetDetailCtrl", [
    "$scope", "$location", "$rootScope", "$routeParams",
    function ($scope, $location, $rootScope, $routeParams) {

    }
]);