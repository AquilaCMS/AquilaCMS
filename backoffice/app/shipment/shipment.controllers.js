var ShipmentControllers = angular.module('aq.shipment.controllers', []);

ShipmentControllers.controller('ShipmentListCtrl', ['$scope', '$location', 'Shipment', '$http', '$rootScope',
    function ($scope, $location, Shipment, $http, $rootScope) {
        $scope.lang = $rootScope.adminLang;
        $scope.filter = {};
        function init() {
            $scope.sort = {
                type: 'type',
                reverse: true
            };
        }

        $scope.defaultLang = $rootScope.languages.find(function (lang) {
            return lang.defaultLanguage;
        }).code;

        init();

        $scope.getShipments = function() {
            let filter = {};
            const filterKeys = Object.keys($scope.filter);
            for (let i = 0, leni = filterKeys.length; i < leni; i++) {
                if($scope.filter[filterKeys[i]] === null){
                    break;
                }
                if(filterKeys[i].includes("active")) {
                    if($scope.filter.active == "true"){
                        filter["active"] = true;
                    }else if($scope.filter.active == "false"){
                        filter["active"] = false;
                    }
                } else if(filterKeys[i].includes("name")) {
                    if($scope.filter.name != ""){
                        filter["translation."+$scope.defaultLang+".name"] = { $regex: $scope.filter.name, $options: "i" };
                    }
                } else {
                    if (typeof ($scope.filter[filterKeys[i]]) === 'object'){
                        filter[filterKeys[i] + ".number"] = { $regex: $scope.filter[filterKeys[i]].number, $options: "i" };
                    }else{
                        if($scope.filter[filterKeys[i]].toString() != ""){
                            filter[filterKeys[i]] = { $regex: $scope.filter[filterKeys[i]].toString(), $options: "i" };
                        }
                    }
                }
            }
            Shipment.list({PostBody: {
                filter,
                structure: {
                    active: 1,
                    vat_rate: 1,
                    preparation: 1,
                    translation: 1,
                    countries: 1,
                    freePriceLimit: 1
                },
                skip: 0,
                limit: 100
            }}, function (shipmentList) {
                $scope.shipments = shipmentList.datas;
            });
        }

        $scope.getShipments();

        $scope.goToShipmentDetails = function (shipmentId) {
            $location.path("shipments/delivery/" + shipmentId);
        }
    }]);

ShipmentControllers.controller('ShipmentBeforeCreateCtrl', ['$scope', '$location',
    function ($scope, $location) {
        $scope.settings = {
            shipmentType: 'delivery'
        };

        $scope.validate = function () {
            $location.path('/shipments/' + $scope.settings.shipmentType + '/new');
        };
    }]);

ShipmentControllers.controller('ShipmentDetailCtrl', ['$scope', '$http', '$location', '$routeParams', 'toastService', 'TerritoryCountries', 'Shipment', 'ShipmentOld', '$rootScope', '$modal','ConfigV2', "$translate",
    function ($scope, $http, $location, $routeParams, toastService, TerritoryCountries, Shipment, ShipmentOld, $rootScope, $modal, ConfigV2, $translate) {

        $scope.changeTab = function (tabActive) {
            if (!$scope.isEditMode && tabActive === "country") return;
            if (!$scope.isEditMode && tabActive === "price") return;
            $scope.tabActive = tabActive
        };

        $scope.config = [];
        ConfigV2.get({PostBody: {structure: {taxerate: 1}}}, function (cfg) {
            $scope.config = cfg;
        });

        $scope.isEditMode      = false;
        $scope.tabActive       = "general";
        $scope.selectedCountry = {};
        $scope.countries = [];
        TerritoryCountries.query({PostBody: { filter: { type: 'country'}, limit: 999}}, function (countries) {
            $scope.countries = countries;
            $scope.countries.datas.forEach(function (country, i) {
                $scope.languages.forEach(lang => {
                    if(country.translation[lang.code] === undefined){
                        $scope.countries.datas[i].translation[lang.code] = {};
                        $scope.countries.datas[i].translation[lang.code].name = country.code;
                    }
                })
            });
        });
        if ($routeParams.shipmentId === 'new')  {
            $scope.shipment = {
                type: 'DELIVERY',
                countries: []
            }
        } else {
            $scope.isEditMode = true;
            Shipment.detail({
                id: $routeParams.shipmentId,
                PostBody: {
                    filter: {_id: $routeParams.shipmentId},
                    structure: '*',
                }
            }, function (shipment) {
                $scope.shipment = shipment;
                if (!$scope.shipment.countries) {
                    $scope.shipment.countries = [];
                }
                $scope.weights = [];
                if ($scope.shipment.countries[0]) {
                    for (let i = 0; i < $scope.shipment.countries[0].prices.length; i++) {
                        $scope.weights.push({
                            min: $scope.shipment.countries[0].prices[i].weight_min,
                            max: $scope.shipment.countries[0].prices[i].weight_max
                        });
                    }
                }
            });
        }

        $scope.addCountry = function () {
            if ($scope.selectedCountry.country) {
                let check = $scope.shipment.countries.find(function (country) {
                    return country.country === $scope.selectedCountry.country.code;
                });
                if (!check) {
                    let tabPrice = [];
                    if ($scope.weights.length > 0) {
                        for (let i=0; i < $scope.weights.length; i++) {
                            tabPrice.push({
                                weight_min: $scope.weights[i].min,
                                weight_max: $scope.weights[i].max,
                                price: 0
                            });
                        }
                    }
                    $scope.shipment.countries.push({
                        country: $scope.selectedCountry.country.code,
                        translation: {},
                        prices: tabPrice
                    });
                }else{
                    toastService.toast("warning", $translate.instant("shipment.detail.contryAlreadySelected"));
                }
            }else{
                toastService.toast("warning", $translate.instant("shipment.detail.selectContry"));
            }
        };

        $scope.addColumn = function () {
            $modal.open({
                templateUrl: "app/shipment/views/modals/shipment-add-weight.html",
                scope: $scope,
                backdrop: true,
                windowClass: 'modal',
                controller: function ($scope, $modalInstance) {
                    $scope.weightMin = 0;
                    $scope.weightMax = 1;
                    $scope.addWeight = function (min, max) {
                        for (let i = 0; i < $scope.shipment.countries.length; i++) {
                            $scope.shipment.countries[i].prices.push({
                                weight_min: min,
                                weight_max: max,
                                price: 0
                            });
                        }
                        $scope.weights.push({
                            min: min,
                            max: max
                        });
                        $modalInstance.dismiss('cancel');
                    };

                    $scope.cancel = function () {
                        $modalInstance.dismiss('cancel');
                    };
                }
            });
        };

        $scope.removeColumn = function (index) {
            $modal.open({
                templateUrl: "app/shipment/views/modals/shipment-remove-weight.html",
                scope: $scope,
                backdrop: true,
                windowClass: 'modal',
                controller: function ($scope, $modalInstance) {
                    $scope.removeWeight = function () {
                        for (let i = 0; i < $scope.shipment.countries.length; i++) {
                            $scope.shipment.countries[i].prices.splice(index, 1);
                        }
                        $scope.weights.splice(index, 1);
                        $modalInstance.dismiss('cancel');
                    };

                    $scope.cancel = function () {
                        $modalInstance.dismiss('cancel');
                    };
                }
            });
        };

        $scope.removeCountry = function (index) {
            $scope.shipment.countries.splice(index, 1);
        };

        $scope.getCountryByCode = function (code) {
            if ($scope.countries && $scope.countries.datas) {
                const country = $scope.countries.datas.find((country) => country.code === code)
                if(country){
                    if (country.translation[$rootScope.adminLang]){
                        return country.translation[$rootScope.adminLang].name;
                    }
                    return country.code;
                }
            }
        };

        $scope.changeCountry = function () {
            $scope.selectedCountry.country = $scope.countries.datas.find(function (country) {
                return country.code === $scope.selectedCountry.code;
            });
        };

        $scope.data = {selectedPos: []};


        $scope.save = function (isQuit) {
            Shipment.save($scope.shipment, function (savedShipment) {
                if (isQuit) {
                    $location.path("/shipments");
                }
                else {
                    $location.path("/shipments/delivery/" + savedShipment._id);
                }
                toastService.toast("success", $translate.instant("global.saveDone"))
            }, function(error){
                if(error.data){
                    if(error.data.message && error.data.message != ""){
                        toastService.toast("danger",  error.data.message);
                    }
                }else if(error && error.code != ""){
                    toastService.toast("danger", error.code);
                }else{
                    toastService.toast("danger", $translate.instant("global.standardError"));
                }
            });
        };

        $scope.cancel = function () {
            $location.path('/shipments');
        };

        $scope.removeShipment = function (shipment) {
            if (confirm($translate.instant("confirm.deleteShipment"))) {
                Shipment.delete({id: shipment._id});
                toastService.toast("success", $translate.instant("global.deleteDone"));
                $location.path("/shipments");
            }
        };
    }]);
