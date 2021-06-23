const OptionsControllers = angular.module("aq.options.controllers", []);

OptionsControllers.controller("OptionsListCtrl", [
    "$scope", "$rootScope", "$location", "$modal", "OptionsServices", "$translate", "toastService",
    function ($scope, $rootScope, $location, $modal, OptionsServices, $translate, toastService) {
        $scope.limit = 12;
        $scope.optionsSetList = {};
        $scope.optionsSetList.data = [];
        $scope.lang = $rootScope.languages.find((lang) => lang.defaultLanguage).code;

        $scope.addOptions = function () {
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
                $scope.getList();
            });
        }


        $scope.getList = function () {
            OptionsServices.list({
                PostBody: {
                    limit: $scope.limit
                }
            }, function (response) {
                $scope.optionsSetList.data = response.datas;
            }, function (error) {
                toastService.toast("danger", $translate.instant("global.standardError"));
            });
        }
    }
]);
OptionsControllers.controller("OptionsDetailCtrl", [
    "$scope", "$rootScope", "$location", "$routeParams",
    function ($scope, $rootScope, $location, $routeParams) {
        $scope.isNew = false;
        $scope.options = {
            code: $routeParams.code
        };
    }
]);


OptionsControllers.controller("nsNewOptionsController", [
    "$scope", "$rootScope", "$location", "OptionsServices", "$translate", "toastService",
    function ($scope, $rootScope, $location, OptionsServices, $translate, toastService) {

        $scope.lang = $rootScope.languages.find((lang) => lang.defaultLanguage).code;
        debugger
        if ($scope.isNew != true) {
            OptionsServices.get({
                PostBody: {
                    filter: {
                        code: $scope.options.code
                    }
                }
            }, function (response) {
                $scope.options = response;
            }, function (error) {
                toastService.toast("danger", $translate.instant("global.standardError"));
            });
        }


        $scope.addValue = function () {
            if (typeof $scope.options.values === "undefined") {
                $scope.options.values = [];
            }
            $scope.options.values.push({
                name: {},
                mandatory: false,
                modifier: {
                    price: 0,
                    weight: 0
                }
            });
        }

        $scope.removeValue = function ($index) {
            if (typeof $scope.options.values === "undefined") {
                $scope.options.values = [];
            }
            const index = $scope.options.values.findIndex((element, index) => index == $index);
            if (index > -1) {
                $scope.options.values.splice(index, 1);
            }
        }
    }
]);

OptionsControllers.controller("nsNewOptionsControllerModal", [
    "$scope", "$rootScope", "$location", "$modalInstance", "OptionsServices", "toastService", "$translate",
    function ($scope, $rootScope, $location, $modalInstance, OptionsServices, toastService, $translate) {
        $scope.isNew = true;

        $scope.cancel = function (val) {
            $modalInstance.close(val);
        }

        $scope.options = {
            code: "",
            name: {},
            type: "textfield", // default
            mandatory: true,
            values: []
        };

        $scope.save = function (val) {
            OptionsServices.set($scope.options, function (response) {
                $modalInstance.close(val);
            }, function (error) {
                toastService.toast("danger", $translate.instant("global.standardError"));
                console.error(error);
            })
        }
    }
]);

OptionsControllers.controller("nsListOptionsController", [
    "$scope", "$rootScope", "$location", "OptionsServices", "toastService", "$translate",
    function ($scope, $rootScope, $location, OptionsServices, toastService, $translate) {
        // controller of list
        if (typeof $scope.optionsSetList === "undefined") {
            $scope.optionsSetList = [];
        }
        if (typeof $scope.limit === "undefined") {
            $scope.limit = 12;
        }
        $scope.lang = $rootScope.languages.find((lang) => lang.defaultLanguage).code;

        $scope.goToOptionsDetails = function (code) {
            $location.path(`/options/details/${code}`)
        }

        $scope.getList = function () {
            OptionsServices.list({
                PostBody: {
                    limit: $scope.limit
                }
            }, function (response) {
                $scope.optionsSetList = response.datas;
            }, function (error) {
                toastService.toast("danger", $translate.instant("global.standardError"));
            });
        }

        $scope.getList(); // we get the list
    }
]);

OptionsControllers.controller("nsListOptionsControllerModal", [
    "$scope", "$rootScope", "$location", "$modalInstance",
    function ($scope, $rootScope, $location, $modalInstance) {
        $scope.cancel = function (val) {
            $modalInstance.close(val);
        }
        $scope.save = function (val) {
            $modalInstance.close(val);
        }
    }
]);