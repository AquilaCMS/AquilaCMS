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
