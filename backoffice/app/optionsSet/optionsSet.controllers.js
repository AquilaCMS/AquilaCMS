const OptionsSetControllers = angular.module('aq.optionsSet.controllers', []);

OptionsSetControllers.controller('OptionsSetListCtrl', [
    '$scope', '$location', '$rootScope', 'OptionsSetServices', '$modal',
    function ($scope, $location, $rootScope, OptionsSetServices, $modal) {
        $scope.sortType = 'name'; // set the default sort type
        $scope.sortReverse = false;  // set the default sort order
        $scope.lang = $rootScope.languages.find((lang) => lang.defaultLanguage).code;

        $scope.getData = function () {
            OptionsSetServices.list({ PostBody: { limit: 10, page: 1 } }, function (response) {
                $scope.optionsSet = response.datas;
            });
        };

        $scope.gotToDetail = function (code) {
            $location.path(`/optionsSet/${code}`);
        };

        $scope.createNew = function () {
            const modalInstance = $modal.open({
                templateUrl: 'app/optionsSet/views/modals/optionsSet-new.html',
                controller: 'OptionsSetNewCtrl'
            });

            modalInstance.result.then(function (returnedValue) {

            });
        };

        $scope.getData(); // get list of optionsSet
    }
]);

OptionsSetControllers.controller('OptionsSetNewCtrl', [
    '$scope', '$location', '$rootScope', '$routeParams', 'OptionsSetServices', '$modalInstance', 'toastService',
    function ($scope, $location, $rootScope, $routeParams, OptionsSetServices, $modalInstance, toastService) {
        $scope.lang = $rootScope.languages.find((lang) => lang.defaultLanguage).code;

        $scope.optionsSet = {
            name: {},
            code: ''
        };

        $scope.save = function () {
            OptionsSetServices.set($scope.optionsSet, function (response) {
                $modalInstance.close(response);
                $location.path(`/optionsSet/${response.code}`)
            }, function (err) {
                if (err.data.code === 'Conflict') {
                    toastService.toast('danger', err.data.message);
                } else {
                    toastService.toast('danger', err.data.message);
                }
            });
        };

        $scope.cancel = function () {
            $modalInstance.dismiss(false);
        };
    }
]);

OptionsSetControllers.controller('OptionsSetDetailCtrl', [
    '$scope', '$location', '$rootScope', '$routeParams', 'OptionsSetServices', '$modal', 'toastService', '$translate',
    function ($scope, $location, $rootScope, $routeParams, OptionsSetServices, $modal, toastService, $translate) {
        $scope.lang = $rootScope.languages.find((lang) => lang.defaultLanguage).code;

        $scope.optionsSet = {};

        $scope.getOptionsSet = function () {
            // we populate the result !
            OptionsSetServices.get({
                PostBody: {
                    filter: {
                        code: $routeParams.code
                    },
                    populate: ['options']
                }
            }, function (response) {
                $scope.optionsSet = response;
            }, function (error) {
                $location.path("/optionsSet");
                if (error && error.data && error.data.message) {
                    toastService.toast('danger', error.data.message);
                } else {
                    toastService.toast('danger', $translate.instant('global.standardError'));
                }
            });
        };

        $scope.save = function (quit) {
            // we save the optionsSet
            const correctArrayOptions = $scope.optionsSet.options.map((element) => {
                return element._id;
            });
            const correctObject = angular.copy($scope.optionsSet);
            correctObject.options = correctArrayOptions;

            // we sent the object
            OptionsSetServices.set(correctObject, function (response) {
                toastService.toast('success', $translate.instant('global.saved'));
            }, function (error) {
                toastService.toast('danger', $translate.instant('global.standardError'));
            });
            if (quit) {
                $location.path('/optionsSet/');
            }
        };

        $scope.remove = function () {
            OptionsSetServices.delete({ action: $scope.optionsSet._id }, function (response) {
                toastService.toast('success', $translate.instant('global.deleted'));
                $location.path('/optionsSet');
            }, function (error) {
                if (error && error.data && error.data.message) {
                    toastService.toast('danger', error.data.message);
                } else {
                    toastService.toast('danger', $translate.instant('global.standardError'));
                }
            });
        };

        $scope.removeOptions = function (code) {
            if (typeof $scope.optionsSet.options === "undefined") {
                $scope.optionsSet.options = [];
            }
            const index = $scope.optionsSet.options.findIndex((element) => element.code == code);
            if (index > -1) {
                $scope.optionsSet.options.splice(index, 1);
                toastService.toast('warning', $translate.instant('optionsSet.detail.needSave'));
            }
        }

        $scope.createOptions = function () {
            const modalInstance = $modal.open({
                templateUrl: 'app/options/views/modals/options-new.html',
                controller: 'nsNewOptionsControllerModal',
                windowClass: 'modal-large',
                backdrop: 'static',
                keyboard: false,
                resolve: {
                    lang() {
                        return $scope.lang;
                    }
                }
            });

            modalInstance.result.then(function (isCreated) {
                if (typeof isCreated !== 'undefined' && typeof isCreated === 'object') {
                    if (typeof $scope.optionsSet.options === 'undefined') {
                        $scope.optionsSet.options = [];
                    }
                    $scope.optionsSet.options.push(
                        isCreated
                    );
                    toastService.toast('warning', $translate.instant('optionsSet.detail.needSave'));
                }
            });
        };

        $scope.addOptions = function () {
            const modalInstance = $modal.open({
                templateUrl: 'app/options/views/modals/options-list.html',
                controller: 'nsListOptionsControllerModal',
                windowClass: 'modal-large',
                backdrop: 'static',
                keyboard: false,
                resolve: {
                    lang() {
                        return $scope.lang;
                    }
                }
            });

            modalInstance.result.then(function (isCreated) {
                if (typeof isCreated !== 'undefined' && typeof isCreated === 'object') {
                    if (typeof $scope.optionsSet.options === 'undefined') {
                        $scope.optionsSet.options = [];
                    }
                    $scope.optionsSet.options.push(
                        isCreated
                    );
                    toastService.toast('warning', $translate.instant('optionsSet.detail.needSave'));
                }
            });
        };

        $scope.gotToOptionsDetail = function (code) {
            $location.path(`/options/details/${code}`);
        }

        $scope.getOptionsSet(); // we get the options
    }
]);
