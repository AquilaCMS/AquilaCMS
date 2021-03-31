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
                if($scope.static.translation[value[0]] && $scope.static.translation[value[0]].html) {
                    if(!$scope.static.translation[value[0]].variables){
                        $scope.static.translation[value[0]].variables = [];
                    }
                    let originalArray = $scope.static.translation[value[0]].variables;
                    let founds        = [...$scope.static.translation[value[0]].html.matchAll(/{{([^}]*)}}/gm)];
                    $scope.static.translation[value[0]].variables = [];
                    for (var i = 0; i < founds.length; i++) {
                        if(originalArray.find(_var => _var.label === founds[i][1])) {
                            $scope.static.translation[value[0]].variables.push(originalArray.find(_var => _var.label === founds[i][1]))
                        } else {
                            $scope.static.translation[value[0]].variables.push({label: founds[i][1], value: ''})
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
                        if(variable) {
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
            $scope.generateContent();
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
        $scope.selectedTab = {active:"result"};
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
        ];

        function getLink(){
            $scope.iframeURL = "";
            StaticV2.preview($scope.static, function (response) {
                if (response && response.url) {
                    $scope.iframeURL = window.location.href + '/preview' + '?lang=' + $scope.lang + '&code=' + $scope.static.code;
                }
            });
        }

        StaticV2.query({PostBody: {filter: {code: $routeParams.code}, structure: '*', limit: 1}}, function (staticPage) {
            $scope.static = staticPage;
            $scope.local.url = staticPage.code;
            $scope.selectedDropdownItem = staticPage.group ? staticPage.group : "";
            if($scope.static && !$scope.static.translation[$scope.lang].html) {
                $scope.static.translation[$scope.lang].html = $scope.static.translation[$scope.lang].content
            }
            getLink();
        });

        $scope.selectTab = function(tab){
            $scope.selectedTab.active = tab;
        }
        $scope.generateVariables = function () {
            for (const value of Object.entries($scope.static.translation)) {
                if($scope.static && $scope.static.translation[value[0]] && $scope.static.translation[value[0]].html) {
                    var originalArray = $scope.static.translation[value[0]].variables || [],
                        founds        = [...$scope.static.translation[value[0]].html.matchAll(/{{([^}]*)}}/gm)]
                    $scope.static.translation[value[0]].variables = [];
                    for (var i = 0; i < founds.length; i++) {
                        if(originalArray.find(_var => _var.label === founds[i][1])) {
                            $scope.static.translation[value[0]].variables.push(originalArray.find(_var => _var.label === founds[i][1]))
                        } else {
                            $scope.static.translation[value[0]].variables.push({label: founds[i][1], value: ''})
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
                        if(variable) {
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
            getLink();
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
            $scope.static.group = $scope.selectedDropdownItem === "" ? null : $scope.selectedDropdownItem;
            $scope.generateContent();
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


StaticPageControllers.controller("StaticPagePreview", [
    "$scope", "$http", "$q", "$routeParams", "$rootScope", "StaticV2", "$location", "toastService", "$rootScope", "designFactory",
    function ($scope, $http, $q, $routeParams, $rootScope, StaticV2, $location, toastService, $rootScope, designFactory) {
        document.head.innerHTML = "";
        document.body.innerHTML = "";
        const url = window.location.href;
        debugger
        let [lang] = url.match(/\?lang=[^&]*&/);
        lang = lang.substring(6, lang.length-1)
        let [code] = url.match(/&code=.*/);
        code = code.substring(6)
        debugger

        let codePage = url[1]
        codePage = codePage.split("/")
        codePage = codePage[2];

        function getHTML(){
            StaticV2.query({
                    PostBody: {
                        filter:{
                            code: code
                },
                structure: '*',
                limit: 1
            }}, function (response){
                document.body.innerHTML = response.translation[lang].content;
            }, function (error){
                console.error("Can't get HTML");
            });
        }
        $http.get('/v2/themes/css').then((response) => {
            for(let oneCss of response.data){
                document.head.innerHTML += '<link rel="stylesheet" href="/static/css/' + oneCss + '.css">\n';
            }
            getHTML();
        });
        
        fetch(window.location.origin)
            .then(function(response){
                response.text().then(function(text){
                    const regex = /href="[^"]*\.css"/gs
                    let res = text.match(regex);
                    for(let oneCss of res){
                        oneCss = oneCss.substring(6, oneCss.length-1);
                        document.head.innerHTML += '<link rel="stylesheet" href="' + oneCss + '">\n';
                    }
                })
            });

    }
]);