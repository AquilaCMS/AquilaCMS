const StaticPageControllers = angular.module("aq.staticPage.controllers", []);

StaticPageControllers.controller("StaticPageListCtrl", [
    "$scope", "$location", "$routeParams", "StaticV2", "$http", "$window", function ($scope, $location, $routeParams, StaticV2, $http, $window) {
        function init() {
            $scope.sortType = "name"; // set the default sort type
            $scope.sortReverse = false;  // set the default sort order
            $scope.currentTab = "";
            $scope.groups = []
            $scope.search = '';

            StaticV2.list({PostBody: {filter: {}, structure: '*', limit: 99}}, function (staticsList) {
                $scope.statics = staticsList.datas;
                $scope.groups = staticsList.datas.getAndSortGroups()
                $scope.currentTab = $scope.groups[0];

                const adminStoredDatas = JSON.parse(window.localStorage.getItem('pageAdmin')) || {};

                if (adminStoredDatas && adminStoredDatas.staticListTab && $scope.groups.includes(adminStoredDatas.staticListTab)) {
                    $scope.currentTab = adminStoredDatas.staticListTab;
                } else {
                    adminStoredDatas.staticListTab = $scope.groups[0];
                    window.localStorage.setItem('pageAdmin', JSON.stringify(adminStoredDatas))
                }
            });
        }

        init();

        $scope.goToStaticPageDetails = function (staticCode) {
            $location.path(`/staticPage/${staticCode}`);
        };
        $scope.changeTab = function(group) {
            $scope.currentTab = group;
            if (window.localStorage.getItem('pageAdmin')) {
                const adminStoredDatas = JSON.parse(window.localStorage.getItem('pageAdmin'));
                adminStoredDatas.staticListTab = group;
                window.localStorage.setItem('pageAdmin', JSON.stringify(adminStoredDatas))
            } else {
                const adminStoredDatas = {staticListTab: group};
                window.localStorage.setItem('pageAdmin', JSON.stringify(adminStoredDatas))
            }
        }
    }
]);

StaticPageControllers.controller("StaticPageNewCtrl", [
    "$scope", "$location", 'StaticV2', "toastService", function ($scope, $location, StaticV2, toastService) {
        $scope.static = {type: "page", group: ""};
        $scope.groups = [];
        $scope.selectedDropdownItem = "";
        
        $scope.itemObjectSelected = function (item) {
            $scope.selectedDropdownItem = item;
        };

        $scope.filterDropdown = function (userInput) {
            if (userInput !== undefined) {
                $scope.selectedDropdownItem = userInput;
            }
            return StaticV2.list({PostBody: {filter: {}, structure: '*', limit: 99}}).$promise.then(function (staticsList) {
                $scope.groups = staticsList.datas.getAndSortGroups($scope.selectedDropdownItem)
                return staticsList.datas.getAndSortGroups($scope.selectedDropdownItem);
            });
        };

        $scope.filterDropdown();

        $scope.save = function (data, isQuit) {
            data.group = $scope.selectedDropdownItem === "" ? null : $scope.selectedDropdownItem;

            StaticV2.save(data).$promise.then(function (response) {
                toastService.toast("success", "Sauvegarde effectuée");
                if (isQuit) {
                    return $location.path("/staticPage");
                }
                return $location.path(`/staticPage/${response.code}`);
            }, function (err) {
                toastService.toast("danger", err.data);
            });
        };

        $scope.preview = function () {
            StaticV2.preview($scope.static, function (response) {
                if (response && response.url) {
                    window.open(response.url);
                }
            });
        };
    }
]);

StaticPageControllers.controller("StaticPageDetailCtrl", [
    "$scope", "$http", "$q", "$routeParams", "$rootScope", "StaticV2", "$location", "toastService", "$modal", function ($scope, $http, $q, $routeParams, $rootScope, StaticV2, $location, toastService, $modal) {
        $scope.local = {url: ""};
        $scope.modules = [];
        $scope.lang = $rootScope.adminLang;
        $scope.groups = [];

        StaticV2.query({PostBody: {filter: {code: $routeParams.code}, structure: '*', limit: 1}}, function (staticPage) {
            $scope.static = staticPage;
            $scope.local.url = staticPage.code;
            $scope.selectedDropdownItem = staticPage.group ? staticPage.group : "";
        });
        
        $scope.itemObjectSelected = function (item) {
            $scope.selectedDropdownItem = item;
        };

        $scope.filterDropdown = function (userInput) {
            if (userInput !== undefined) {
                $scope.selectedDropdownItem = userInput;
            }
            $scope.dropdownItems = [];
            return StaticV2.list({PostBody: {filter: {}, structure: '*', limit: 99}}).$promise.then(function (staticsList) {
                $scope.groups = staticsList.datas.getAndSortGroups(userInput);
                return $scope.groups;
            });
        };

        $scope.filterDropdown();

        $scope.onLangChange = function (lang) {
            $(".defL").css("display", !lang.defaultLanguage ? "none" : "");
        };

        $scope.preview = function (lang) {
            $scope.static.lang = lang;
            StaticV2.preview($scope.static, function (response) {
                if (response && response.url) {
                    window.open(response.url);
                }
            });
        };

        $scope.saveStatic = function (isQuit) {
            $scope.static.group = $scope.selectedDropdownItem === "" ? null : $scope.selectedDropdownItem;

            StaticV2.save($scope.static, function () {
                toastService.toast("success", "Page sauvegardée !");
                if (isQuit) {
                    $location.path("/staticPage");
                }
            }, function (err) {
                toastService.toast("success", err.data);
            });
        };

        StaticV2.list({PostBody: {filter: {}, limit: 99}}, function (staticsList) {
            $scope.statics = staticsList.datas;
        });

        $scope.removePage = function (staticPage) {
            if (confirm("Etes-vous sûr de vouloir supprimer cette page ?")) {
                StaticV2.delete({id: $scope.static._id}, function(msg) {
                    if (msg.status) {
                        $scope.statics.splice($scope.statics.indexOf(staticPage), 1);
                        toastService.toast("success", "Suppression effectuée");
                        $location.path("/staticPage");
                    } else {
                        console.error("Error!");
                    }
                })
            }
        };

        $http.post('/v2/modules', {
            PostBody: {
                filter: {},
                limit: 100,
                populate: [],
                skip: 0,
                sort: {},
                structure: {},
                page: null
            }
        }).then(function (response) {
            $scope.modules = response.data.datas.filter(module => module.component_template_front);
        });

        $scope.showModulesTags = function () {
            let tagText = '';
            for (let i = 0; i < $scope.modules.length; i++) {
                tagText += `${$scope.modules[i].component_template_front}\n`;
            }
            return tagText;
        };
    }
]);
