const OptionsControllers = angular.module('aq.options.controllers', []);

OptionsControllers.controller('OptionsListCtrl', [
    '$scope', '$rootScope', '$location', '$modal', 'OptionsServices', '$translate', 'toastService',
    function ($scope, $rootScope, $location, $modal, OptionsServices, $translate, toastService) {
        $scope.limit = 12;
        $scope.optionsList = {};
        $scope.optionsList.data = [];
        $scope.lang = $rootScope.languages.find((lang) => lang.defaultLanguage).code;

        $scope.addOptions = function () {
            const modalInstance = $modal.open({
                templateUrl: 'app/options/views/modals/options-new.html',
                controller: 'nsNewOptionsControllerModal',
                windowClass: 'modal-large',
                resolve: {
                    lang() {
                        return $scope.lang;
                    }
                }
            });

            modalInstance.result.then(function (isCreated) {
                $scope.getList();
            });
        };

        $scope.goToOptionsDetails = function (code) {
            $location.path(`/options/details/${code}`);
        };

        $scope.getList = function () {
            OptionsServices.list({
                PostBody: {
                    limit: $scope.limit
                }
            }, function (response) {
                $scope.optionsList.data = response.datas;
                $scope.$apply();
            }, function (error) {
                toastService.toast('danger', $translate.instant('global.standardError'));
            });
        };
    }
]);
OptionsControllers.controller('OptionsDetailCtrl', [
    '$scope', '$rootScope', '$location', '$routeParams', 'OptionsServices', 'toastService', '$translate',
    function ($scope, $rootScope, $location, $routeParams, OptionsServices, toastService, $translate) {
        $scope.isNew = false;
        $scope.options = {
            data: {
                code: $routeParams.code
            }
        };

        $scope.saveFunction = null;

        $scope.save = function (isQuit) {
            let res;
            if ($scope.saveFunction == null) {
                res = $scope.saveFunction = $scope.options.data.save
            }
            res = $scope.saveFunction($scope.options.data);
            if (res < 0) {
                return
            }
            OptionsServices.set($scope.options.data, function (response) {
                $scope.options.data = response;
                toastService.toast('success', $translate.instant('global.saved'));
                if (isQuit) {
                    $location.path('/options');
                }
            }, function (error) {
                if (error && error.data && error.data.message) {
                    toastService.toast('danger', error.data.message);
                } else {
                    toastService.toast('danger', $translate.instant('global.standardError'));
                }
            });
        };

        $scope.remove = function () {
            OptionsServices.delete({ action: $scope.options.data._id }, function (response) {
                toastService.toast('success', $translate.instant('global.deleted'));
                $location.path('/options');
            }, function (error) {
                if (error && error.data && error.data.message) {
                    toastService.toast('danger', error.data.message);
                } else {
                    toastService.toast('danger', $translate.instant('global.standardError'));
                }
            });
        }
    }
]);

OptionsControllers.controller('nsNewOptionsController', [
    '$scope', '$rootScope', '$location', 'OptionsServices', '$translate', 'toastService',
    function ($scope, $rootScope, $location, OptionsServices, $translate, toastService) {
        $scope.lang = $rootScope.languages.find((lang) => lang.defaultLanguage).code;
        $scope.languages = $rootScope.languages;
        if ($scope.$parent.$parent.$parent.isNew !== true) {
            OptionsServices.get({
                PostBody: {
                    filter: {
                        code: $scope.options.code
                    }
                }
            }, function (response) {
                $scope.options = response;
                $scope.options.save = $scope.save;
            }, function (error) {
                toastService.toast('danger', $translate.instant('global.standardError'));
            });
        }

        $scope.verifName = function (name) {
            if ($scope.options.values) {
                let count = 0;
                for (const oneName of $scope.options.values) {
                    if (oneName.name[$scope.lang] === name) {
                        count++
                    }
                }
                if (count > 1) {
                    toastService.toast('danger', $translate.instant('options.detail.sameName'));
                    return -1;
                }
            }
        };

        $scope.save = function (options) {
            if (typeof options.code === "undefined" || options.code === "") {
                toastService.toast('danger', $translate.instant('options.detail.errorNoCode'));
                return -1;
            }
            if (typeof options.values === "undefined" || options.values.lenght === 0) {
                toastService.toast('danger', $translate.instant('options.detail.errorNoValues'));
                return -1;
            }
            if (typeof options.name[$scope.lang] === "undefined" || options.name[$scope.lang] === "") {
                toastService.toast('danger', $translate.instant('options.detail.errorNoName'));
                return -1;
            }
            if (typeof options.type === "undefined" || options.type === "") {
                toastService.toast('danger', $translate.instant('options.detail.errorNoType'));
                return -1;
            }
            for (const oneOptions of options.values) {
                if (typeof oneOptions.name === "undefined" || typeof oneOptions.name[$scope.lang] === "undefined" || oneOptions.name[$scope.lang] === "") {
                    toastService.toast('danger', $translate.instant('options.detail.errorNoValueName'));
                    return -2;
                }
                let res = $scope.verifName(oneOptions.name[$scope.lang]);
                if (res === -1) {
                    return -1;
                }
            }
        }

        $scope.options.save = $scope.save;

        $scope.addValue = function () {
            if (typeof $scope.options.values === 'undefined') {
                $scope.options.values = [];
            }
            $scope.options.values.push({
                name: {},
                control: {
                    mandatory: true,
                    checked: true,
                    min: 0,
                    max: 10
                },
                modifier: {
                    price: 0,
                    priceType: "",
                    weight: 0
                }
            });
        };

        $scope.checkedIsChanged = function (index) {
            const actualType = $scope.options.type;
            const temp = $scope.options.values[index].control.checked;
            if (actualType === 'list' || actualType === 'radio') {
                for (let oneValue of $scope.options.values) {
                    oneValue.control.checked = false;
                }
                $scope.options.values[index].control.checked = temp;
            }
        }

        $scope.changeOptionsType = function () {
            if (typeof $scope.options.values === 'undefined') {
                $scope.options.values = [];
            }
            const actualType = $scope.options.type;
            if (actualType !== 'list' && actualType !== 'radio' && actualType !== 'checkbox') {
                let temp = null
                if (typeof $scope.options.values[0] !== "undefined" || $scope.options.values[0] === null) {
                    temp = $scope.options.values[0];
                }
                $scope.options.values = [];
                if (temp) {
                    $scope.options.values.push(temp);
                } else {
                    $scope.options.values.push({
                        name: {},
                        control: {
                            mandatory: true,
                            checked: false,
                            min: 10,
                            max: 0
                        },
                        modifier: {
                            price: {
                                value: 0,
                                typePrice: "price",
                            },
                            weight: 0
                        }
                    });
                }
            }
        }

        $scope.removeValue = function ($index) {
            if (typeof $scope.options.values === 'undefined') {
                $scope.options.values = [];
            }
            const index = $scope.options.values.findIndex((element, index) => index == $index);
            if (index > -1) {
                $scope.options.values.splice(index, 1);
            }
        };

        var elementOver;
        var elementStart;
        var inOther;

        $scope.draggingEnd = function (element, event) {
            elementStart.className = elementStart.className.replace(" opacity", "");
            elementOver.className = elementOver.className.replace(' fakeDrop', '');
            //On switch car on est dans une autre
            const indexStart = parseInt(elementStart.childNodes[1].value);
            const indexEnd = parseInt(elementOver.childNodes[1].value);
            if (indexStart != indexEnd) {
                //deplacement
                let arrayTempOfValues = [];
                angular.copy($scope.options.values, arrayTempOfValues);
                const tempStart = arrayTempOfValues[indexStart];
                const tempEnd = arrayTempOfValues[indexEnd];
                arrayTempOfValues[indexStart] = tempEnd;
                arrayTempOfValues[indexEnd] = tempStart;
                $scope.options.values = [];
                $scope.options.values = arrayTempOfValues;
                console.log($scope.options.values[0].name, $scope.options.values[1].name);
                $scope.$apply();
            }
        };

        $scope.draggingStart = function (element) {
            elementStart = element
            if (element.className.includes(" opacity")) {
                element.className = element.className.replace(" opacity", "");
            } else {
                element.className += " opacity";
            }
        };

        $scope.switchElement = function (element, where) {
            elementOver = element;
            if (where == 'in') {
                element.className += ' fakeDrop';
            } else if (where == 'out') {
                element.className = element.className.replace(' fakeDrop', '');
            }
        };
    }
]);

OptionsControllers.controller('nsNewOptionsControllerModal', [
    '$scope', '$rootScope', '$location', '$modalInstance', 'OptionsServices', 'toastService', '$translate',
    function ($scope, $rootScope, $location, $modalInstance, OptionsServices, toastService, $translate) {
        $scope.isNew = true;

        $scope.cancel = function (val) {
            $modalInstance.close(val);
        };
        $scope.options = {};
        $scope.options.data = {
            code: '',
            name: {},
            type: '', // default
            mandatory: true,
            values: []
        };

        $scope.save = function (val) {
            let res = $scope.options.data.save($scope.options.data);
            if (res < 0) {
                return;
            }
            OptionsServices.set($scope.options.data, function (response) {
                toastService.toast('success', $translate.instant('global.saved'));
                $modalInstance.close(response);
            }, function (error) {
                if (error && error.data && error.data.message) {
                    toastService.toast('danger', error.data.message);
                } else {
                    toastService.toast('danger', $translate.instant('global.standardError'));
                }
                console.error(error);
            });
        };
    }
]);

OptionsControllers.controller('nsListOptionsController', [
    '$scope', '$rootScope', '$location', 'OptionsServices', 'toastService', '$translate', "OptionsSetServices",
    function ($scope, $rootScope, $location, OptionsServices, toastService, $translate, OptionsSetServices) {
        // controller of list
        if (typeof $scope.optionsList === 'undefined') {
            $scope.optionsList = [];
        }
        if (typeof $scope.limit === 'undefined') {
            $scope.limit = 12;
        }
        $scope.lang = $rootScope.languages.find((lang) => lang.defaultLanguage).code;

        $scope.clickItem = function (code) {
            if (typeof $scope.onClickItem !== 'undefined') {
                $scope.onClickItem(code);
            } else {
                console.log('clicked, but no callBack');
            }
        };

        $scope.loadOptionsSet = function (code) {
            const index = $scope.optionsList.findIndex((element) => element.code == code);
            if (index > -1) {
                const id = $scope.optionsList[index]._id;
                OptionsSetServices.list({
                    PostBody: {
                        limit: $scope.limit,
                        filter: {
                            options: id
                        }
                    }
                }, function (response) {
                    $scope.optionsList[index].optionsSet = response.datas;
                }, function (error) {
                    if (error && error.data && error.data.message) {
                        toastService.toast('danger', error.data.message);
                    } else {
                        toastService.toast('danger', $translate.instant('global.standardError'));
                    }
                    console.error(error);
                })
            }
        };

        $scope.getList = function () {
            OptionsServices.list({
                PostBody: {
                    limit: $scope.limit
                }
            }, function (response) {
                $scope.optionsList = response.datas;
            }, function (error) {
                toastService.toast('danger', $translate.instant('global.standardError'));
            });
        };

        $scope.getList(); // we get the list
    }
]);

OptionsControllers.controller('nsListOptionsControllerModal', [
    '$scope', '$rootScope', '$location', '$modalInstance',
    function ($scope, $rootScope, $location, $modalInstance) {
        $scope.optionsList = {
            data: []
        };

        $scope.onClick = function (code) {
            const index = $scope.optionsList.data.findIndex((element) => element.code == code);
            const correctOptions = $scope.optionsList.data[index];
            $scope.save(correctOptions);
        };

        $scope.cancel = function () {
            $modalInstance.close(false);
        };
        $scope.save = function (val) {
            $modalInstance.close(val);
        };
    }
]);