var OptionsSetControllers = angular.module("aq.optionsSet.controllers", []);

OptionsSetControllers.controller("OptionsSetListCtrl", [
    "$scope", "$location", "$rootScope", "OptionsSetServices", "$modal",
    function ($scope, $location, $rootScope, OptionsSetServices, $modal) {
        $scope.sortType = "name"; // set the default sort type
        $scope.sortReverse = false;  // set the default sort order
        $scope.lang = $rootScope.languages.find((lang) => lang.defaultLanguage).code;

        $scope.getData = function () {
            OptionsSetServices.list({ PostBody: { limit: 10, page: 1 } }, function (response) {
                $scope.optionsSet = response.datas;
            });
        }

        $scope.gotToDetail = function (code) {
            $location.path(`/optionsSet/${code}`);
        };

        $scope.createNew = function () {
            var modalInstance = $modal.open({
                templateUrl: "app/optionsSet/views/modals/optionsSet-new.html",
                controller: "OptionsSetNewCtrl",
                resolve: {
                    lang: function () {
                        return $scope.lang;
                    },
                }
            });

            modalInstance.result.then(function (returnedValue) {
                $scope.getData();
            });
        }

        $scope.getData(); // get list of optionsSet
    }
]);

OptionsSetControllers.controller("OptionsSetNewCtrl", [
    "$scope", "$location", "$rootScope", "$routeParams", "OptionsSetServices", "$modalInstance", "toastService", "lang",
    function ($scope, $location, $rootScope, $routeParams, OptionsSetServices, $modalInstance, toastService, lang) {
        $scope.optionsSet = {
            name: {},
            code: ""
        };

        $scope.lang = lang;

        $scope.save = function () {
            OptionsSetServices.set($scope.optionsSet, function () {
                $modalInstance.close();
            }, function (err) {
                if (err.data.code === "Conflict") {
                    toastService.toast("danger", err.data.message);
                } else {
                    toastService.toast("danger", err.data.message);
                }
            });
        };

        $scope.cancel = function () {
            $modalInstance.dismiss("cancel");
        };
    }
]);


OptionsSetControllers.controller("OptionsSetDetailCtrl", [
    "$scope", "$location", "$rootScope", "$routeParams", "OptionsSetServices", "$modal",
    function ($scope, $location, $rootScope, $routeParams, OptionsSetServices, $modal) {

        $scope.lang = $rootScope.languages.find((lang) => lang.defaultLanguage).code;

        $scope.getOptionsSet = function () {
            OptionsSetServices.get({
                PostBody: {
                    filter: {
                        code: $routeParams.code
                    }
                }
            }, function (response) {
                $scope.optionsSet = response;
            });
        }

        $scope.save = function (quit) {
            if (quit) {
                $location.path(`/optionsSet/`);
            }
        }

        $scope.remove = function () {

        }

        $scope.createOptions = function () {
            var modalInstance = $modal.open({
                templateUrl: "app/options/views/modals/options-new.html",
                controller: 'nsNewOptionsControllerModal',
                windowClass: "modal-large",
                backdrop: 'static',
                keyboard: false,
                resolve: {
                    lang: function () {
                        return $scope.lang;
                    },
                }
            });

            modalInstance.result.then(function (isCreated) {
                debugger
                isCreated;
            });
        }

        $scope.addOptions = function () {
            var modalInstance = $modal.open({
                templateUrl: "app/options/views/modals/options-list.html",
                controller: 'nsListOptionsControllerModal',
                windowClass: "modal-large",
                backdrop: 'static',
                keyboard: false,
                resolve: {
                    lang: function () {
                        return $scope.lang;
                    },
                }
            });

            modalInstance.result.then(function (isCreated) {

            });
        }

        $scope.getOptionsSet(); // we get the options
    }
]);


