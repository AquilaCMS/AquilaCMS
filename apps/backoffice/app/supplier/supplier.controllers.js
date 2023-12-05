var SupplierControllers = angular.module("aq.supplier.controllers", []);

SupplierControllers.controller("SupplierListCtrl", [
    "$scope", "$location", "SuppliersV2",
    function ($scope, $location, SuppliersV2) {
        $scope.totalItems = 0;
        $scope.nbItemsPerPage = 15;
        $scope.maxSize = 10;
        $scope.page = 1;
        $scope.filter = { query: "" };
        //Pagination
        $scope.onPageChange = function (page) {
            let filter = {};
            if ($scope.filter.query != "") {
                filter["name"] = { $regex: $scope.filter.query, $options: 'i' };
            }
            SuppliersV2.list({ PostBody: { filter, page, limit: $scope.nbItemsPerPage, structure: '*', limit: 0 } }, function (res) {
                $scope.suppliers = res.datas;
                $scope.totalItems = res.count;
            });
        };

        $scope.onPageChange(1, "");

        $scope.goToSupplierDetails = function (supplierCode) {
            $location.path("/suppliers/" + supplierCode);
        };

    }
]);

SupplierControllers.controller("SupplierNewCtrl", [
    "$scope", "$location", "SuppliersV2", "toastService", "$translate",
    function ($scope, $location, SuppliersV2, toastService, $translate) {

        $scope.supplier = {};
        $scope.form = {};

        $scope.save = function (data, isQuit) {
            $scope.form.nsSubmitted = true;
            if ($scope.form.supplier.$invalid) {
                toastService.toast("danger", $translate.instant("supplier.new.enterInvalid"));
                return;
            }

            SuppliersV2.save(data, function (response) {
                toastService.toast("success", $translate.instant("supplier.new.supplierCreated"));
                console.log("Supplier Saved!", response);
                if (isQuit) {
                    $location.path("/suppliers/");
                } else {
                    $location.path("/suppliers/" + response.code);

                }
            }, function (error) {
                if (error.data) {
                    if (error.data.message && error.data.message != "") {
                        toastService.toast("danger", error.data.message);
                    }
                } else if (error && error.code != "") {
                    toastService.toast("danger", error.code);
                } else {
                    console.error(err);
                    toastService.toast("danger", $translate.instant("supplier.new.occurrenceError"));
                }
            });
        };

    }
]);

SupplierControllers.controller("SupplierDetailCtrl", [
    "$scope", "$http", "$q", "$location", "$routeParams", "SuppliersV2", "toastService", "ProductsV2", "$rootScope", "$translate",
    function ($scope, $http, $q, $location, $routeParams, SuppliersV2, toastService, ProductsV2, $rootScope, $translate) {
        $scope.isEditMode = false;
        $scope.form = {};

        if ($routeParams.supplierId) {
            $scope.isEditMode = true;
            $scope.supplier = SuppliersV2.query({ PostBody: { filter: { code: $routeParams.supplierId }, structure: '*', limit: 0 } }, function () {
                if (!angular.isDefined($scope.supplier.code)) {
                    $scope.supplier.code = "";
                } else {
                    $scope.defaultLang = $rootScope.languages.find(function (lang) {
                        return lang.defaultLanguage;
                    }).code;

                    $scope.getProducts();
                }
            });
        }

        $scope.getProducts = function () {
            const select = `{"code": 1, "images": 1, "active": 1, "_visible": 1, "stock.qty": 1,  "type": 1, "price.ati.normal": 1, "translation.${$scope.defaultLang}.name": 1}`; 
            if (angular.isDefined($scope.supplier.code)) {
                ProductsV2.list({ filter: { supplier_ref: $scope.supplier._id }, select, limit: 0 }, function ({ datas }) {
                    $scope.products = datas
                });
            }
        };

        $scope.goToProductDetails = function (productType, productCode) {
            $location.path("/products/" + productType + "/" + productCode);
        };

        $scope.save = function (supplier, isQuit) {

            //Utilisé pour afficher les messages d'erreur au moment de la soumission d'un formulaire
            $scope.form.nsSubmitted = true;

            if ($scope.form.$invalid) {
                toastService.toast("danger", $translate.instant("supplier.detail.enterInvalid"));
                return;
            }

            $scope.disableSave = !$scope.isEditMode;

            SuppliersV2.save(supplier, function (response) {

                if (isQuit) {
                    $location.path("/suppliers");
                } else {
                    toastService.toast("success", $translate.instant("supplier.detail.infoSaved"));
                    if (!$scope.isEditMode) {
                        $location.path("/suppliers/" + response.supplier.code);
                    } else {
                        $scope.disableSave = false;
                    }
                }

            }, function (err) {
                toastService.toast("danger", $translate.instant("supplier.detail.savedError"));
                $scope.disableSave = false;
            });
        };

        $scope.remove = function (_id) {
            if (confirm($translate.instant("confirm.deleteSupplier"))) {
                SuppliersV2.delete({ id: _id }, function () {
                    $location.path("/suppliers");
                }, function () {
                    toastService.toast("danger", $translate.instant("supplier.detail.deleteError"));
                });
            }
        };
    }
]);