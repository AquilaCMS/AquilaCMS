"use strict";

/* Controllers */

var adminCatagenControllers = angular.module("adminCatagenControllers", []);

// wrapper
adminCatagenControllers.controller("wrapperCtrl", [
    "$rootScope", "$scope", "$route", "ConfigUpdate", "MenusList", "MenusCatalogList", "LanguagesApiV2", "$translate", "$http",
    function ($rootScope, $scope, $route, ConfigUpdate, MenusList, MenusCatalogList, LanguagesApiV2, $translate, $http)
    {

        $scope.menus = MenusList;
        $scope.menusCatalog = MenusCatalogList;

        function getLanguages() {
            LanguagesApiV2.list({PostBody: {filter: {}, limit: 99}}, function (languages)
            {
                $scope.languages = languages.datas;
                $rootScope.languages = languages.datas;
                var lang = languages.datas.find(_lang => _lang.defaultLanguage).code

                moment.locale(lang);
                if(localStorage.getItem('adminLang')) {
                    $rootScope.adminLang = localStorage.getItem('adminLang');
                } else {
                    $rootScope.adminLang = lang;
                }
                $translate.use($rootScope.adminLang);
                $translate.preferredLanguage($rootScope.adminLang);
                $translate.fallbackLanguage($rootScope.adminLang);
            });
        }

        $scope.adminLangChange = function (lang)
        {
            localStorage.setItem('adminLang', lang);
            $rootScope.adminLang = lang;
            moment.locale(lang);
            $translate.use(lang);
            $route.reload();
        };

        $scope.updateTheme = function (rep)
        {
            ConfigUpdate.query({"url": rep}, function (up)
            {
                console.log(up);
            });
        };

        $http.get("v2/auth/isauthenticated").then(function (resp) {
            $scope.accessList = resp.data.user.accessList;
            // if(["orders", "payments", "invoices", "cart"].every(num => $scope.accessList.includes(num))){
            //     $scope.accessList.push('transactions');
            // }
            // if(["products", "categories", "promos", "picto", "setAttributes", "attributes", "trademarks", "suppliers", "families"].every(num => $scope.accessList.includes(num))){
            //     $scope.accessList.push('catalogue');
            // }
            // if(["medias", "articles", "cmsBlocks", "staticPage", "categories", "design", "mails", "gallery", "slider"].every(num => $scope.accessList.includes(num))){
            //     $scope.accessList.push('site');
            // }
            // if(["clients", "setAttributes", "attributes", "reviews", "contacts", "newsletters"].every(num => $scope.accessList.includes(num))){
            //     $scope.accessList.push('clientsMenu');
            // }
            // if(["environment", "stock", "mails", "shipments", "territories", "languages", "paymentMethods", "jobs", "list", "update"].every(num => $scope.accessList.includes(num))){
            //     $scope.accessList.push('configuration');
            // }
        });

        window.addEventListener("updateLangs", function(e) { getLanguages() });

        getLanguages()

        

        $scope.userIsAllowedTo = function (route) {
            if($rootScope.userInfo.accessList.indexOf(route) === -1 || $rootScope.userInfo.accessList === undefined) {
                return true
            } else {
                return false
            }
        }
    }
]);

// logImport
adminCatagenControllers.controller("logimportCtrl", [
    "$rootScope", "$scope", "logImport", function ($rootScope, $scope, logImport)
    {

        logImport.getStatus(function (productStatus)
        {

            $scope.importStatusProduct = productStatus.status;

            if(productStatus.status == false)
            {
                $scope.statusImport = "fa fa-warning red";
            }
            else
            {
                $scope.statusImport = "glyphicon glyphicon-ok-circle green";
            }

        });

        logImport.query(function (listImports)
        {

            //$scope.listImports = listImports;

            var log = {};

            angular.forEach(listImports, function (currImport)
            {
                if(!angular.isDefined(log[currImport.type]))
                {
                    log[currImport.type] = [];
                }
                log[currImport.type].push(currImport);
            });

            console.log(log);
            $scope.listImports = log;

        });
    }
]);

// logged
adminCatagenControllers.controller("loggedCtrl", [
    "$rootScope", "$scope", function ($rootScope, $scope)
    {
        //$scope.userIdent = $rootScope.userInfo._id;
    }
]);

// carrier
adminCatagenControllers.controller("CarrierListCtrl", [
    "$scope", "Carrier", "toastService", "$translate", function ($scope, Carrier, toastService, $translate)
    {
        $scope.carriers = Carrier.query();

        $scope.removeCarrier = function (carrier)
        {
            if (confirm($translate.instant("confirm.deleteShipment")))
            {
                Carrier.remove({carrierId: carrier._id}, function ()
                {
                    $scope.carriers.splice($scope.carriers.indexOf(carrier), 1);
                    toastService.toast("success", $translate.instant("carrier.carrierDeleted"));
                });
            }
        };
    }
]);

adminCatagenControllers.controller("CarrierNewCtrl", [
    "$scope", "$location", "Carrier", "toastService", "$translate", function ($scope, $location, Carrier, toastService, $translate)
    {

        $scope.master = {
            name: "", _id: "", url: "", active: true, deliveryDelay: ""
        };

        $scope.reset = function ()
        {
            $scope.carrier = angular.copy($scope.master);
        };

        $scope.save = function (data)
        {
            Carrier.update(data, function (msg)
            {
                if(msg.status)
                {
                    toastService.toast("success", $translate.instant("carrier.carrierSaved"));
                    $location.path("/carriers");
                }
                else
                {
                    toastService.toast("danger", $translate.instant("global.error"));
                }
            });
        };

        $scope.reset();

    }
]);

adminCatagenControllers.controller("CarrierDetailCtrl", [
    "$scope", "$http", "$q", "$routeParams", "Carrier", function ($scope, $http, $q, $routeParams, Carrier)
    {
        $scope.carrier = Carrier.get({carrierId: $routeParams.carrierId}, function ()
        {
            ;
        });

        $scope.updateName = function (data)
        {
            var d = $q.defer();
            $http.post("/carriers", {_id: $scope.carrier._id, name: data}).success(function (res)
            {
                res = res || {};
                if(res.status === true)
                { // {status: "ok"}
                    d.resolve();
                }
                else
                {
                    d.resolve(res.msg);
                }
            }).error(function (e)
            {
                d.reject("Server error!");
            });
            return d.promise;
        };
        $scope.updateUrl = function (data)
        {
            var d = $q.defer();
            $http.post("/carriers", {_id: $scope.carrier._id, url: data}).success(function (res)
            {
                res = res || {};
                if(res.status === true)
                { // {status: "ok"}
                    d.resolve();
                }
                else
                {
                    d.resolve(res.msg);
                }
            }).error(function (e)
            {
                d.reject("Server error!");
            });
            return d.promise;
        };
        $scope.updateDeliveryDelay = function (data)
        {
            var d = $q.defer();
            $http.post("/carriers", {_id: $scope.carrier._id, deliveryDelay: data}).success(function (res)
            {
                res = res || {};
                if(res.status === true)
                { // {status: "ok"}
                    d.resolve();
                }
                else
                {
                    d.resolve(res.msg);
                }
            }).error(function (e)
            {
                d.reject("Server error!");
            });
            return d.promise;
        };
        $scope.updateActive = function (data)
        {
            var d = $q.defer();
            $http.post("/carriers", {_id: $scope.carrier._id, active: data}).success(function (res)
            {
                res = res || {};
                if(res.status === true)
                { // {status: "ok"}
                    d.resolve();
                }
                else
                {
                    d.resolve(res.msg);
                }
            }).error(function (e)
            {
                d.reject("Server error!");
            });
            return d.promise;
        };

    }
]);

adminCatagenControllers.controller("CarrierDetailCtrl", [
    "$scope", "$http", "$q", "$routeParams", "Carrier", function ($scope, $http, $q, $routeParams, Carrier)
    {
        $scope.carrier = Carrier.get({carrierId: $routeParams.carrierId}, function ()
        {
            ;
        });

        $scope.updateName = function (data)
        {
            var d = $q.defer();
            $http.post("/carriers", {_id: $scope.carrier._id, name: data}).success(function (res)
            {
                res = res || {};
                if(res.status === true)
                { // {status: "ok"}
                    d.resolve();
                }
                else
                {
                    d.resolve(res.msg);
                }
            }).error(function (e)
            {
                d.reject("Server error!");
            });
            return d.promise;
        };

        $scope.updateUrl = function (data)
        {
            var d = $q.defer();
            $http.post("/carriers", {_id: $scope.carrier._id, url: data}).success(function (res)
            {
                res = res || {};
                if(res.status === true)
                { // {status: "ok"}
                    d.resolve();
                }
                else
                {
                    d.resolve(res.msg);
                }
            }).error(function (e)
            {
                d.reject("Server error!");
            });
            return d.promise;
        };

        $scope.updateDeliveryDelay = function (data)
        {
            var d = $q.defer();
            $http.post("/carriers", {_id: $scope.carrier._id, deliveryDelay: data}).success(function (res)
            {
                res = res || {};
                if(res.status === true)
                { // {status: "ok"}
                    d.resolve();
                }
                else
                {
                    d.resolve(res.msg);
                }
            }).error(function (e)
            {
                d.reject("Server error!");
            });
            return d.promise;
        };

        $scope.updateActive = function (data)
        {
            var d = $q.defer();
            $http.post("/carriers", {_id: $scope.carrier._id, active: data}).success(function (res)
            {
                res = res || {};
                if(res.status === true)
                { // {status: "ok"}
                    d.resolve();
                }
                else
                {
                    d.resolve(res.msg);
                }
            }).error(function (e)
            {
                d.reject("Server error!");
            });
            return d.promise;
        };

    }
]);

adminCatagenControllers.controller("ExportsCtrl", [
    "$scope", "$window", "Client", function ($scope, $window, Client)
    {

        $scope.dateOptions = {
            "year-format": "'yyyy'", "starting-day": 1
        };

    }
]);

adminCatagenControllers.controller("ThemesCtrl", [
    "$scope", "Themes", function ($scope, Themes)
    {
        Themes.query(function (themes)
        {
            $scope.themes = themes;
        });
        $scope.useTheme = function (theme)
        {
            Themes.useTheme({name: "name"}, {}, function ()
            {
                $scope.response = {msg: "Le thème " + theme.name + " est maintenant utilisé.", status: true};
            }, function ()
            {
                $scope.response = {msg: "Une erreur est survenue.", status: true};
            });
        };
    }
]);

adminCatagenControllers.controller("ConfirmDeleteCtrl", [
    "$scope", "$modalInstance", "okAction", function ($scope, $modalInstance, okAction)
    {
        $scope.ok = function ()
        {
            okAction().then(function ()
            {
                $modalInstance.close();
            });
        };

        $scope.cancel = function ()
        {
            $modalInstance.dismiss("cancel");
        };
    }
]);
