angular.module("aq.stock.controllers", []).controller("StockCtrl", [
    "$scope", "$location", "toastService", "ConfigV2", "$modal", "$translate",
    function ($scope, $location, toastService, ConfigV2, $modal, $translate) {
        $scope.stock = {
            cartExpireTimeout: 48,
            pendingOrderCancelTimeout: 48,
            requestMailPendingCarts: 24,
            bookingStock: "panier",
            labels: {}
        };
        $scope.disableEdit = false;
        $scope.taxerate = []

        $scope.pendingCartCheck = function(){
            if ($scope.stock.cartExpireTimeout <= $scope.stock.requestMailPendingCarts){
                if ($scope.stock.cartExpireTimeout === 0){
                    $scope.stock.requestMailPendingCarts = 0;
                }else{
                    $scope.stock.requestMailPendingCarts = $scope.stock.cartExpireTimeout -1;
                }
            }
        }

        $scope.fixAdditionnalFees = function () {
            if (
                !$scope.stock.additionnalFees.et
                || $scope.stock.additionnalFees.et.toString().endsWith('.')
            ) {
                return;
            }
            $scope.stock.additionnalFees.et = Number($scope.stock.additionnalFees.et.aqlRound(2))
        }
        ConfigV2.get({PostBody: {structure: {stockOrder: 1, taxerate: 1}}}, function (config) {
            if(Object.keys(config.stockOrder).length > 2) {
                $scope.stock = config.stockOrder;
            }
            $scope.taxerate = config.taxerate;
        });

        $scope.manageLabel = function (label) {
            $modal.open({
                templateUrl: "app/stock/stock-labels.html",
                controller: "StockLabelCtrl",
                resolve: {
                    label: function ()
                    {
                        return label;
                    }
                }
            }).result.then(function (result) {
                if(result) {
                    if(result.isNew) {
                        $scope.stock.labels.push(result.label);
                    } else {
                        $scope.stock.labels[$scope.stock.labels.findIndex(function (_label) {
                            return _label.code === result.label.code;
                        })] = result.label;
                    }
                } else {
                    $scope.stock.labels.splice($scope.stock.labels.findIndex(function (_label) {
                        return _label.code === label.code;
                    }), 1);
                }
            });
        };

        $scope.manageTva = function (tva) {
            $modal.open({
                templateUrl: "app/stock/stock-tva.html",
                controller: "StockTvaCtrl",
                resolve: {
                    tva: function () {
                        return tva;
                    }
                }
            }).result.then(function (result) {
                if (result) {
                    if (result.isNew) {
                        $scope.taxerate.push(result.tva);
                    }
                    else {
                        $scope.taxerate[$scope.taxerate.findIndex(function (_tva) {
                            return _tva.rate === result.oldTva.rate;
                        })] = result.tva;
                    }
                }
                else {
                    $scope.taxerate.splice($scope.taxerate.findIndex(function (_tva) {
                        return _tva.rate === tva.rate;
                    }), 1);
                }
            });
        };

        $scope.save = function (quit) {
            var stock = $scope.stock;

            ConfigV2.save({stockOrder: stock, taxerate: $scope.taxerate}, function () {
                toastService.toast("success", $translate.instant("stock.order&StockSaved"));
                if (quit) $location.path("/");
            }, function (err) {
                toastService.toast("danger", err.data);
            });
        };
    }
]).controller("StockLabelCtrl", [
    "$scope", "$modalInstance", "label", "$rootScope", "$translate", function ($scope, $modalInstance, label, $rootScope, $translate)
    {
        $scope.isEditMode = false;
        $scope.label = {code: "", translation: {}};

        for (var i = 0; i < $scope.languages.length; i++) {
            $scope.label.translation[$scope.languages[i].code] = {value: ''}
        }

        if (label)
        {
            $scope.isEditMode = true;
            $scope.label = angular.copy(label);
        }

        $scope.validLabel = function ()
        {
            $modalInstance.close({label: $scope.label, isNew: !$scope.isEditMode});
        };

        $scope.cancel = function (event)
        {
            event.preventDefault();
            $modalInstance.dismiss("cancel");
        };

        $scope.delete = function (event) {
            if (confirm($translate.instant("confirm.deleteLibelleStock"))) {
                event.preventDefault();
                $modalInstance.close();
            }
        };
    }
]).controller("StockTvaCtrl", [
    "$scope", "$modalInstance", "tva", "$translate", function ($scope, $modalInstance, tva, $translate) {
        $scope.isEditMode = false;
        $scope.tva = {};

        if (tva) {
            $scope.isEditMode = true;
            $scope.tva = angular.copy(tva);
            $scope.oldTva = angular.copy(tva);
        }

        $scope.validLabel = function () {
            $modalInstance.close({ tva: $scope.tva, isNew: !$scope.isEditMode, oldTva : $scope.oldTva });
        };

        $scope.cancel = function (event) {
            event.preventDefault();
            $modalInstance.dismiss("cancel");
        };

        $scope.delete = function (event) {
            if (confirm($translate.instant("confirm.deleteTva"))) {
                event.preventDefault();
                $modalInstance.close();
            }
        };
    }
]);