const StaticPageControllers = angular.module("aq.staticPage.controllers", []);

StaticPageControllers.controller("StaticPageListCtrl", [
    "$scope", "$location", "$routeParams", "StaticV2", "$http", "$window", function ($scope, $location, $routeParams, StaticV2, $http, $window) {
        function init() {
            $scope.sortType = "name"; // set the default sort type
            $scope.sortReverse = false;  // set the default sort order
        }

        init();
        StaticV2.list({PostBody: {filter: {}, structure: {active: 1}, limit: 99}}, function (staticsList) {
            $scope.statics = staticsList.datas;
        });

        $scope.goToStaticPageDetails = function (staticCode) {
            $location.path(`/staticPage/${staticCode}`);
        };
    }
]);

StaticPageControllers.controller("StaticPageNewCtrl", [
    "$scope", "$location", 'StaticV2', "toastService", function ($scope, $location, StaticV2, toastService) {
        $scope.static = {type: "page"};

        $scope.save = function (data, isQuit) {
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

        StaticV2.query({PostBody: {filter: {code: $routeParams.code}, structure: '*', limit: 1}}, function (staticPage) {
            $scope.static = staticPage;
            $scope.local.url = staticPage.code;
        });

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
            StaticV2.save($scope.static).$promise.then(function () {
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
