const StaticPageControllers = angular.module("aq.staticPage.controllers", []);

StaticPageControllers.controller("StaticPageListCtrl", [
    "$scope", "$location", "$routeParams", "StaticV2", "$http", "$rootScope", function ($scope, $location, $routeParams, StaticV2, $http, $rootScope) {
        function init() {
            $scope.sortType = "name"; // set the default sort type
            $scope.sortReverse = false;  // set the default sort order
            $scope.currentTab = "";
            $scope.groups = []
            $scope.search = '';

            StaticV2.list({ PostBody: { filter: {}, structure: '*', limit: 0 } }, function (staticsList) {
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
        $scope.changeTab = function (group) {
            $scope.currentTab = group;
            if (window.localStorage.getItem('pageAdmin')) {
                const adminStoredDatas = JSON.parse(window.localStorage.getItem('pageAdmin'));
                adminStoredDatas.staticListTab = group;
                window.localStorage.setItem('pageAdmin', JSON.stringify(adminStoredDatas))
            } else {
                const adminStoredDatas = { staticListTab: group };
                window.localStorage.setItem('pageAdmin', JSON.stringify(adminStoredDatas))
            }
        }
    }
]);

StaticPageControllers.controller("StaticPageNewCtrl", [
    "$scope", "$location", 'StaticV2', "toastService", "$rootScope", "$translate", function ($scope, $location, StaticV2, toastService, $rootScope, $translate) {
        $scope.static = { type: "page", group: "", translation: { [$rootScope.adminLang]: { variables: [], html: '', content: '' } } };
        $scope.groups = [];
        $scope.selectedDropdownItem = "";
        $scope.selectedTab = { active: "result" };

        $scope.selectTab = function (tab) {
            $scope.selectedTab.active = tab;
        }

        $scope.additionnalButtons = [
            {
                text: 'product.general.preview',
                onClick: function () {
                    $scope.static.lang = $rootScope.adminLang;
                    StaticV2.preview($scope.static, function (response) {
                        if (response && response.url) {
                            window.open(response.url);
                        }
                    });
                },
                icon: '<i class="fa fa-eye" aria-hidden="true"></i>'
            }
        ];

        $scope.langChange = function (lang) {
            $scope.lang = lang;
            $(".defL").css("display", !lang.defaultLanguage ? "none" : "");
            if ($scope.selectedTab.active == 'html') {
                $scope.selectedTab.active = 'result';
                setTimeout(function () {
                    $scope.$digest();
                    $scope.selectedTab.active = 'html';
                }, 10);
            }
        };

        $scope.generateVariables = function () {
            for (const value of Object.entries($scope.static.translation)) {
                if ($scope.static.translation[value[0]] && $scope.static.translation[value[0]].html) {
                    if (!$scope.static.translation[value[0]].variables) {
                        $scope.static.translation[value[0]].variables = [];
                    }
                    let originalArray = $scope.static.translation[value[0]].variables;
                    let founds = [...$scope.static.translation[value[0]].html.matchAll(/{{([^}]*)}}/gm)];
                    $scope.static.translation[value[0]].variables = [];
                    for (var i = 0; i < founds.length; i++) {
                        if (originalArray.find(_var => _var.label === founds[i][1])) {
                            $scope.static.translation[value[0]].variables.push(originalArray.find(_var => _var.label === founds[i][1]))
                        } else {
                            $scope.static.translation[value[0]].variables.push({ label: founds[i][1], value: '' })
                        }
                    }
                }
            }
        }

        $scope.generateContent = function () {
            $scope.generateVariables();
            for (const value of Object.entries($scope.static.translation)) {
                if ($scope.static.translation[value[0]] && $scope.static.translation[value[0]].html) {

                    var founds = [...$scope.static.translation[value[0]].html.matchAll(/{{([^}]*)}}/gm)];

                    $scope.static.translation[value[0]].content = $scope.static.translation[value[0]].html;
                    var missingVariables = [];

                    for (var i = 0; i < founds.length; i++) {
                        var variable = $scope.static.translation[value[0]].variables.find(_var => _var.label === founds[i][1])
                        if (variable) {
                            $scope.static.translation[value[0]].content = $scope.static.translation[value[0]].content.replace(founds[i][0], variable ? variable.value : '')
                        } else {
                            missingVariables.push(founds[i][1])
                        }
                    }

                    if (missingVariables.length) {
                        toastService.toast("danger", `Warning: Variables missing (${missingVariables.join(', ')})`);
                    }
                }
            }
        }

        $scope.itemObjectSelected = function (item) {
            $scope.selectedDropdownItem = item;
            $scope.static.group = item
        };

        $scope.filterDropdown = function (userInput) {
            if (userInput !== undefined) {
                $scope.selectedDropdownItem = userInput;
            }
            return StaticV2.list({ PostBody: { filter: {}, structure: '*', limit: 0 } }).$promise.then(function (staticsList) {
                $scope.groups = staticsList.datas.getAndSortGroups($scope.selectedDropdownItem)
                return staticsList.datas.getAndSortGroups($scope.selectedDropdownItem);
            });
        };

        $scope.filterDropdown();

        $scope.save = function (data, isQuit) {
            data.group = $scope.selectedDropdownItem === "" ? null : $scope.selectedDropdownItem;
            $scope.generateContent();
            StaticV2.save(data).$promise.then(function (response) {
                toastService.toast("success", $translate.instant("global.saveDone"));
                if (isQuit) {
                    return $location.path("/staticPage");
                }
                return $location.path(`/staticPage/${response.code}`);
            }, function (err) {
                toastService.toast("danger", err.data.message);
            });
        };
    }
]);

StaticPageControllers.controller("StaticPageDetailCtrl", [
    "$scope", "$http", "$q", "$routeParams", "$rootScope", "StaticV2", "$location", "toastService", "$rootScope", 'HookPageInfo', "$translate", "$q",
    function ($scope, $http, $q, $routeParams, $rootScope, StaticV2, $location, toastService, $rootScope, HookPageInfo, $translate, $q) {
        $scope.local = { url: "" };
        $scope.lang = $rootScope.adminLang;
        $scope.groups = [];
        $scope.hookPageInfo = HookPageInfo;
        $scope.selectedTab = { active: "result" };
        $scope.additionnalButtons = [
            {
                text: 'product.general.preview',
                onClick: function () {
                    $scope.static.lang = $scope.lang;
                    $scope.generateContent()
                    StaticV2.preview($scope.static, function (response) {
                        if (response && response.url) {
                            window.open(response.url);
                        }
                    });
                },
                icon: '<i class="fa fa-eye" aria-hidden="true"></i>'
            }
        ]

        $scope.getStaticPage = function () {
            StaticV2.query({ PostBody: { filter: { code: $routeParams.code }, structure: '*', limit: 1 } }, function (staticPage) {
                $scope.static = staticPage;
                $scope.local.url = staticPage.code;
                $scope.selectedDropdownItem = staticPage.group || "";
                if ($scope.static && !$scope.static.translation[$scope.lang].html) {
                    $scope.static.translation[$scope.lang].html = $scope.static.translation[$scope.lang].content
                }
                $scope.getGroups()
            });
        }

        $scope.getStaticPage();

        $scope.selectTab = function (tab) {
            $scope.selectedTab.active = tab;
        }
        $scope.generateVariables = function () {
            for (const value of Object.entries($scope.static.translation)) {
                if ($scope.static && $scope.static.translation[value[0]] && $scope.static.translation[value[0]].html) {
                    var originalArray = $scope.static.translation[value[0]].variables || [],
                        founds = [...$scope.static.translation[value[0]].html.matchAll(/{{([^}]*)}}/gm)]
                    $scope.static.translation[value[0]].variables = [];
                    for (var i = 0; i < founds.length; i++) {
                        if (originalArray.find(_var => _var.label === founds[i][1])) {
                            $scope.static.translation[value[0]].variables.push(originalArray.find(_var => _var.label === founds[i][1]))
                        } else {
                            $scope.static.translation[value[0]].variables.push({ label: founds[i][1], value: '' })
                        }
                    }
                }
            }
        }

        $scope.generateContent = function () {
            $scope.generateVariables();
            for (const value of Object.entries($scope.static.translation)) {
                if ($scope.static && $scope.static.translation[value[0]] && $scope.static.translation[value[0]].html) {

                    var founds = [...$scope.static.translation[value[0]].html.matchAll(/{{([^}]*)}}/gm)];

                    $scope.static.translation[value[0]].content = $scope.static.translation[value[0]].html;
                    var missingVariables = [];

                    for (var i = 0; i < founds.length; i++) {
                        var variable = $scope.static.translation[value[0]].variables.find(_var => _var.label === founds[i][1])
                        if (variable) {
                            $scope.static.translation[value[0]].content = $scope.static.translation[value[0]].content.replace(founds[i][0], variable ? variable.value : '')
                        } else {
                            missingVariables.push(founds[i][1])
                        }
                    }

                    if (missingVariables.length) {
                        const text = $translate.instant("static.toast.missingVar");
                        toastService.toast("danger", `${text} (${missingVariables.join(', ')})`);
                    }
                }
            }
        }

        $scope.itemObjectSelected = function (item) {
            $scope.selectedDropdownItem = item;
            $scope.static.group = item
        };

        $scope.filterDropdown = function (userInput) {
            var filter = $q.defer();
            var normalisedInput = userInput.toLowerCase();
            $scope.static.group = userInput

            var filteredArray = $scope.groups.filter(function(group) {
                return group.toLowerCase().indexOf(normalisedInput) === 0;
            });

            filter.resolve(filteredArray);
            return filter.promise;
        };

        $scope.getGroups = function() {
            StaticV2.list({ PostBody: { filter: {}, structure: '*', limit: 0 } }).$promise.then(function (staticsList) {
                $scope.groups = staticsList.datas.getAndSortGroups();
            });
        };

        $scope.langChange = function (lang) {
            $(".defL").css("display", !lang.defaultLanguage ? "none" : "");
            $scope.lang = lang
            if ($scope.selectedTab.active == 'html') {
                $scope.selectedTab.active = 'result';
                setTimeout(function () {
                    $scope.$digest();
                    $scope.selectedTab.active = 'html';
                }, 10);
            }
        };

        $scope.saveStatic = function (isQuit) {
            $scope.generateContent();
            StaticV2.save($scope.static, function () {
                toastService.toast("success", $translate.instant("global.saveDone"));
                $scope.getStaticPage();
                if (isQuit) {
                    $location.path("/staticPage");
                }
            }, function (err) {
                toastService.toast("danger", err.data.message);
            });
        };

        StaticV2.list({ PostBody: { filter: {}, limit: 0 } }, function (staticsList) {
            $scope.statics = staticsList.datas;
        });

        $scope.removePage = function (staticPage) {
            if (confirm($translate.instant("confirm.deletePage"))) {
                StaticV2.delete({ id: $scope.static._id }, function (msg) {
                    if (msg.status) {
                        $scope.statics.splice($scope.statics.indexOf(staticPage), 1);
                        toastService.toast("success", $translate.instant("global.deleteDone"));
                        $location.path("/staticPage");
                    } else {
                        console.error("Error!");
                    }
                })
            }
        };
    }
]);
