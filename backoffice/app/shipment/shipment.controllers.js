var ShipmentControllers = angular.module('aq.shipment.controllers', []);

ShipmentControllers.controller('ShipmentListCtrl', ['$scope', '$location', 'Shipment', '$http', '$rootScope',
    function ($scope, $location, Shipment, $http, $rootScope) {
        $scope.lang = $rootScope.adminLang;

        function init() {
            $scope.sort = {
                type: 'type',
                reverse: true
            };
        }

        init();

        function getShipments() {
            Shipment.list({PostBody: {
                structure: {
                    active: 1,
                    vat_rate: 1,
                    preparation: 1,
                    translation: 1,
                    countries: 1
                },
                skip: 0,
                limit: 100
            }}, function (shipmentList) {
                $scope.shipments = shipmentList.datas;
            });
        }

        getShipments();

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

ShipmentControllers.controller('ShipmentDetailCtrl', ['$scope', '$http', '$location', '$routeParams', 'toastService', 'TerritoryCountries', 'Shipment', 'ShipmentOld', '$rootScope', '$modal','ConfigV2',
    function ($scope, $http, $location, $routeParams, toastService, TerritoryCountries, Shipment, ShipmentOld, $rootScope, $modal, ConfigV2) {

        $scope.changeTab = function (tabActive) {
            if (!$scope.isEditMode && tabActive === "country") return;
            if (!$scope.isEditMode && tabActive === "price") return;
            $scope.tabActive = tabActive
        };

        $scope.taxerate = [];
        ConfigV2.taxerate( function (cfg) {
            $scope.taxerate = cfg;
        });

        $scope.isEditMode      = false;
        $scope.tabActive       = "general";
        $scope.selectedCountry = {};
        $scope.countries = [];
        TerritoryCountries.query({PostBody: { filter: { type: 'country'}, limit: 999}}, function (countries) {
            $scope.countries = countries;
            $scope.countries.datas.forEach(function (country, i){
                $scope.languages.forEach(lang => {
                    if(country.translation[lang.code] === undefined){
                        $scope.countries.datas[i].translation[lang.code] = {};
                        $scope.countries.datas[i].translation[lang.code].name = country.code;
                    }
                })
            });
        });
        if ($routeParams.shipmentId === 'new') {
            if ($routeParams.shipmentType === 'delivery') {
                $scope.shipment = {
                    type: 'DELIVERY',
                    countries: []
                };
            }
            else if ($routeParams.shipmentType === 'relay_point') {
                $scope.shipment = {
                    type: 'RELAY_POINT',
                    address: {}
                };
            }
        }
        else {
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
                }
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


        /*** Spécifique aux points relais ****/
        $scope.setCountryName = function () {
            $scope.shipment.address.country = $scope.countries.find(function (country) {
                return country.code === $scope.shipment.address.isoCodeCountry;
            });
        };
        /***** Fin points relais *****/

        $scope.save = function (isQuit) {
            Shipment.save($scope.shipment, function (savedShipment) {
                if (isQuit) {
                    $location.path("/shipments");
                }
                else {
                    $location.path("/shipments/delivery/" + savedShipment._id);
                }
                toastService.toast("success", 'Sauvegarde effectuée')
            });
        };

        $scope.cancel = function () {
            $location.path('/shipments');
        };

        $scope.removeShipment = function (shipment) {
            if (confirm('Etes-vous sûr de vouloir supprimer cet élément ?')) {
                Shipment.delete({id: shipment._id}, function () {
                    $scope.shipments.splice($scope.shipments.indexOf(shipment), 1);
                });
                toastService.toast("success", 'Suppression effectuée');
                $location.path("/shipments");
            }
        };
    }]);
