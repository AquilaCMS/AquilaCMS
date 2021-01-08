const StaticPageControllers = angular.module("aq.staticPage.controllers", []);

StaticPageControllers.controller("StaticPageListCtrl", [
    "$scope", "$location", "$routeParams", "StaticV2", "$http", "$rootScope", function ($scope, $location, $routeParams, StaticV2, $http, $rootScope) {
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
    "$scope", "$location", 'StaticV2', "toastService", "$rootScope", function ($scope, $location, StaticV2, toastService, $rootScope) {
        $scope.static = {type: "page", group: "", translation: {[$rootScope.adminLang]: {variables: [], html: '', content: ''}}};
        $scope.groups = [];
        $scope.selectedDropdownItem = "";

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
            if($scope.static) {
                if(!$scope.static.translation[lang].html) {
                    $scope.static.translation[lang].html = $scope.static.translation[lang].content
                }
            }
            $scope.lang = lang
            $(".defL").css("display", !lang.defaultLanguage ? "none" : "");
        };

        $scope.generateVariables = function () {
            if($scope.static.translation[$scope.lang] && $scope.static.translation[$scope.lang].html) {
                var originalArray = $scope.static.translation[$scope.lang].variables,
                    founds        = [...$scope.static.translation[$scope.lang].html.matchAll(/{{([^}]*)}}/gm)]
                $scope.static.translation[$scope.lang].variables = [];
                for (var i = 0; i < founds.length; i++) {
                    if(originalArray.find(_var => _var.label === founds[i][1])) {
                        $scope.static.translation[$scope.lang].variables.push(originalArray.find(_var => _var.label === founds[i][1]))
                    } else {
                        $scope.static.translation[$scope.lang].variables.push({label: founds[i][1], value: ''})
                    }
                }
            }
        }

        $scope.generateContent = function () {
            if ($scope.static.translation[$scope.lang] && $scope.static.translation[$scope.lang].html) {

                var founds = [...$scope.static.translation[$scope.lang].html.matchAll(/{{([^}]*)}}/gm)];
                
                $scope.static.translation[$scope.lang].content = $scope.static.translation[$scope.lang].html;
                var missingVariables = [];
            
                for (var i = 0; i < founds.length; i++) {
                    var variable = $scope.static.translation[$scope.lang].variables.find(_var => _var.label === founds[i][1])
                    if(variable) {
                        $scope.static.translation[$scope.lang].content = $scope.static.translation[$scope.lang].content.replace(founds[i][0], variable ? variable.value : '')
                    } else {
                        missingVariables.push(founds[i][1])
                    }
                }
                
                if (missingVariables.length) {
                    toastService.toast("danger", `Warning: Variables missing (${missingVariables.join(', ')})`);
                }
            }
        } 
        
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
            $scope.generateContent()

            StaticV2.save(data).$promise.then(function (response) {
                toastService.toast("success", "Sauvegarde effectuée");
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
    "$scope", "$http", "$q", "$routeParams", "$rootScope", "StaticV2", "$location", "toastService", "$rootScope", 'HookPageInfo', function ($scope, $http, $q, $routeParams, $rootScope, StaticV2, $location, toastService, $rootScope, HookPageInfo) {
        $scope.local = {url: ""};
        $scope.modules = [];
        $scope.lang = $rootScope.adminLang;
        $scope.groups = [];
        $scope.hookPageInfo = HookPageInfo;
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
        ]

        StaticV2.query({PostBody: {filter: {code: $routeParams.code}, structure: '*', limit: 1}}, function (staticPage) {
            $scope.static = staticPage;
            $scope.local.url = staticPage.code;
            $scope.selectedDropdownItem = staticPage.group ? staticPage.group : "";
            if(!$scope.static.translation[$scope.lang].html) {
                $scope.static.translation[$scope.lang].html = $scope.static.translation[$scope.lang].content
            }
        });

        $scope.generateVariables = function () {
            if($scope.static.translation[$scope.lang] && $scope.static.translation[$scope.lang].html) {
                var originalArray = $scope.static.translation[$scope.lang].variables || [],
                    founds        = [...$scope.static.translation[$scope.lang].html.matchAll(/{{([^}]*)}}/gm)]
                $scope.static.translation[$scope.lang].variables = [];
                for (var i = 0; i < founds.length; i++) {
                    if(originalArray.find(_var => _var.label === founds[i][1])) {
                        $scope.static.translation[$scope.lang].variables.push(originalArray.find(_var => _var.label === founds[i][1]))
                    } else {
                        $scope.static.translation[$scope.lang].variables.push({label: founds[i][1], value: ''})
                    }
                }
            }
        }

        $scope.generateContent = function () {
            if ($scope.static.translation[$scope.lang] && $scope.static.translation[$scope.lang].html) {

                var founds = [...$scope.static.translation[$scope.lang].html.matchAll(/{{([^}]*)}}/gm)];
                
                $scope.static.translation[$scope.lang].content = $scope.static.translation[$scope.lang].html;
                var missingVariables = [];
            
                for (var i = 0; i < founds.length; i++) {
                    var variable = $scope.static.translation[$scope.lang].variables.find(_var => _var.label === founds[i][1])
                    if(variable) {
                        $scope.static.translation[$scope.lang].content = $scope.static.translation[$scope.lang].content.replace(founds[i][0], variable ? variable.value : '')
                    } else {
                        missingVariables.push(founds[i][1])
                    }
                }
                
                if (missingVariables.length) {
                    toastService.toast("danger", `Warning: Variables missing (${missingVariables.join(', ')})`);
                }
            }
        }       

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

        $scope.langChange = function (lang) {
            if(!$scope.static.translation[lang].html) {
                $scope.static.translation[lang].html = $scope.static.translation[lang].content
            }
            $scope.lang = lang
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
            $scope.generateContent()

            StaticV2.save($scope.static, function () {
                toastService.toast("success", "Page sauvegardée !");
                if (isQuit) {
                    $location.path("/staticPage");
                }
            }, function (err) {
                    toastService.toast("danger", err.data.message);
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
