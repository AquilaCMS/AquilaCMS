var SupplierControllers = angular.module("aq.supplier.controllers", []);

SupplierControllers.controller("SupplierListCtrl", [
    "$scope", "$location", "SuppliersV2", function ($scope, $location, SuppliersV2) {
        $scope.totalItems = 0;
        $scope.nbItemsPerPage = 15;
        $scope.maxSize = 10;

        //Pagination
        $scope.onPageChange = function (page, query) {
            let filter = {}
            if(query) {
                filter.name = {$regex: query, $options: 'i'}
            }
            SuppliersV2.list({PostBody: {filter, page, limit: $scope.nbItemsPerPage, structure: '*', limit: 99}}, function (res) {
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
    "$scope", "$location", "SuppliersV2", "toastService", function ($scope, $location, SuppliersV2, toastService) {

        $scope.supplier = {};
        $scope.form = {};

        $scope.save = function (data) {
            $scope.form.nsSubmitted = true;
            if ($scope.form.supplier.$invalid) {
                toastService.toast("danger", "Les informations saisies ne sont pas valides.");
                return;
            }
          
        SuppliersV2.save(data, function (response) {
                console.log("Supplier Saved!", response);
                $location.path("/suppliers/"+response.code);
            }, function (err) {
                console.error(err);
                toastService.toast("danger", "Une erreur interne est survenue.");
            });
        };

    }
]);

SupplierControllers.controller("SupplierDetailCtrl", [
    "$scope", "$http", "$q", "$location", "$routeParams", "SuppliersV2", "toastService", "ProductsV2", "$rootScope",
    function ($scope, $http, $q, $location, $routeParams, SuppliersV2, toastService, ProductsV2, $rootScope) {
        $scope.isEditMode = false;
        $scope.form = {};

        if($routeParams.supplierId)
        {
            $scope.isEditMode = true;
            $scope.supplier = SuppliersV2.query({PostBody: {filter: {code: $routeParams.supplierId}, structure: '*', limit: 99}}, function () {
                if(!angular.isDefined($scope.supplier.code))
                {
                    $scope.supplier.code = "";
                }
                else
                {
                    $scope.defaultLang = $rootScope.languages.find(function (lang) {
                        return lang.defaultLanguage;
                    }).code;

                    $scope.getProducts();
                }
            });
        }

        $scope.getProducts = function () {
            if(angular.isDefined($scope.supplier.code))
            {
                ProductsV2.list({PostBody: {filter: {supplier_ref: $scope.supplier._id}, structure: '*', limit: 99}}, function({datas}) {
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

            if($scope.form.$invalid)
            {
                toastService.toast("danger", "Les informations saisies ne sont pas valides.");
                return;
            }

            $scope.disableSave = !$scope.isEditMode;

            SuppliersV2.save(supplier, function (response) {

                if(isQuit)
                {
                    $location.path("/suppliers");
                }
                else
                {
                    toastService.toast("success", "Informations sauvegardées !");
                    if(!$scope.isEditMode)
                    {
                        $location.path("/suppliers/" + response.supplier.code);
                    }
                    else
                    {
                        $scope.disableSave = false;
                    }
                }

            }, function (err) {
                toastService.toast("danger", "Une erreur est survenue lors de la sauvegarde.");
                $scope.disableSave = false;
            });
        };

        $scope.remove = function (_id) {
            if(confirm("Etes-vous sûr de vouloir supprimer ce fournisseur ?"))
            {
                SuppliersV2.delete({id: _id}, function () {
                    $location.path("/suppliers");
                }, function () {
                    toastService.toast("danger", "Une erreur est survenue lors de la suppression.");
                });
            }
        };
    }
]);