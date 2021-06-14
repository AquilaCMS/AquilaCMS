const CmsBlocksControllers = angular.module("aq.cmsBlocks.controllers", []);

CmsBlocksControllers.controller("CmsBlocksListCtrl", [
    "$scope", "$location", "CmsBlocksApi", "$rootScope", function ($scope, $location, CmsBlocksApi, $rootScope) {
        $scope.groups = [];
        $scope.currentTab = "";
        $scope.search = "";

        $scope.defaultLang = $rootScope.languages.find(function (lang) {
            return lang.defaultLanguage;
        }).code;

        CmsBlocksApi.list({PostBody: {filter: {_id: {$ne: null}}, structure: '*', limit: 99}}, function (cmsBlocks) {
            $scope.cmsBlocks = cmsBlocks.datas;
            $scope.groups = cmsBlocks.datas.getAndSortGroups();
            $scope.currentTab = $scope.groups[0];

            const adminStoredDatas = JSON.parse(window.localStorage.getItem('pageAdmin')) || {};

            if (adminStoredDatas && adminStoredDatas.cmsListTab && $scope.groups.includes(adminStoredDatas.cmsListTab)) {
                $scope.currentTab = adminStoredDatas.cmsListTab;
            } else {
                adminStoredDatas.cmsListTab = $scope.groups[0];
                window.localStorage.setItem('pageAdmin', JSON.stringify(adminStoredDatas))
            }
        });

        $scope.goToCmsBlockDetails = function (blockId) {
            $location.path(`/cmsBlocks/${blockId}`);
        };

        $scope.changeTab = function(group) {
            $scope.currentTab = group;
            if (window.localStorage.getItem('pageAdmin')) {
                const adminStoredDatas = JSON.parse(window.localStorage.getItem('pageAdmin'));
                adminStoredDatas.cmsListTab = group;
                window.localStorage.setItem('pageAdmin', JSON.stringify(adminStoredDatas))
            } else {
                const adminStoredDatas = {cmsListTab: group};
                window.localStorage.setItem('pageAdmin', JSON.stringify(adminStoredDatas))
            }
        }
    }
]);

CmsBlocksControllers.controller("CmsBlocksDetailCtrl", [
    "$scope", "CmsBlocksApi", "$routeParams", "$location", "toastService", "$http","$modal","$rootScope", "$timeout", "$translate",
    function ($scope, CmsBlocksApi, $routeParams, $location, toastService, $http, $modal, $rootScope, $timeout, $translate) {
        $scope.isEditMode = false;
        $scope.lang = $rootScope.adminLang;
        $scope.modules = [];
        $scope.groups = [];
        $scope.selectedTab = { active: "result" };

        $scope.selectTab = function (tab) {
            $scope.selectedTab.active = tab;
        }
        $scope.getGroups = function () {
            $scope.itemObjectSelected = function (item) {
                $scope.selectedDropdownItem = item;
            };
    
            $scope.filterDropdown = function (userInput) {
                if (userInput !== undefined) {
                    $scope.selectedDropdownItem = userInput;
                }
                return CmsBlocksApi.list({PostBody: {filter: {}, structure: '*', limit: 99}}).$promise.then(function (cmsBlocks) {
                    $scope.groups = cmsBlocks.datas.getAndSortGroups($scope.selectedDropdownItem)
                    return $scope.groups;
                });
            };
    
            $scope.filterDropdown();
        }
        if ($routeParams.code !== "new") {
            CmsBlocksApi.query({PostBody: {filter: {code: $routeParams.code}, structure: '*', limit: 1}}, function (block) {
                $scope.cmsBlock = block;
                $scope.isEditMode = true;
                $scope.selectedDropdownItem = block.group ? block.group : "";
                if ($scope.cmsBlock && $scope.cmsBlock.translation && !$scope.cmsBlock.translation[$scope.lang].html) {
                    $scope.cmsBlock.translation[$scope.lang].html = $scope.cmsBlock.translation[$scope.lang].content
                }

                $scope.getGroups()
            });
        } else {
            $scope.cmsBlock = {group: "",translation:{}};
            $scope.selectedDropdownItem = "";

            $scope.getGroups()
        }

        $scope.generateVariables = function () {
            if ($scope.cmsBlock.translation){
                for (const value of Object.entries($scope.cmsBlock.translation)) {
                    if ($scope.cmsBlock && $scope.cmsBlock.translation[value[0]] && $scope.cmsBlock.translation[value[0]].html) {
                        var originalArray = $scope.cmsBlock.translation[value[0]].variables || [],
                            founds = [...$scope.cmsBlock.translation[value[0]].html.matchAll(/{{([^}]*)}}/gm)]
                        $scope.cmsBlock.translation[value[0]].variables = [];
                        for (var i = 0; i < founds.length; i++) {
                            if (originalArray.find(_var => _var.label === founds[i][1])) {
                                $scope.cmsBlock.translation[value[0]].variables.push(originalArray.find(_var => _var.label === founds[i][1]))
                            } else {
                                $scope.cmsBlock.translation[value[0]].variables.push({ label: founds[i][1], value: '' })
                            }
                        }
                    }
                }
            }
            
        }

        $scope.generateContent = function () {
            if ($scope.cmsBlock.translation) {
                $scope.generateVariables();
                for (const value of Object.entries($scope.cmsBlock.translation)) {
                    if ($scope.cmsBlock && $scope.cmsBlock.translation[value[0]] && $scope.cmsBlock.translation[value[0]].html) {
                        var founds = [...$scope.cmsBlock.translation[value[0]].html.matchAll(/{{([^}]*)}}/gm)];
                        $scope.cmsBlock.translation[value[0]].content = $scope.cmsBlock.translation[value[0]].html;
                        var missingVariables = [];
                        for (var i = 0; i < founds.length; i++) {
                            var variable;
                            if($scope.cmsBlock.translation[value[0]].variables){
                                variable = $scope.cmsBlock.translation[value[0]].variables.find(_var => _var.label === founds[i][1])
                            }
                            if(variable) {
                                $scope.cmsBlock.translation[value[0]].content = $scope.cmsBlock.translation[value[0]].content.replace(founds[i][0], variable ? variable.value : '')
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
        } 
        

        $scope.save = async function (quit) {
            if(!$scope.cmsBlock || !$scope.cmsBlock.code || $scope.cmsBlock.code === "") return;
            $scope.cmsBlock.group = $scope.selectedDropdownItem === "" ? null : $scope.selectedDropdownItem;
            $scope.generateContent();

            CmsBlocksApi.save($scope.cmsBlock, function (res) {
                toastService.toast("success", $translate.instant("global.blocSaved"));
                if (quit) {
                    $location.path("/cmsBlocks");
                }else{
                    if ($routeParams.code !== $scope.cmsBlock.code) { // si différent (donc création)
                        $location.path(`/cmsBlocks/${$scope.cmsBlock.code}`);
                    }
                }
            },(err) => {
                toastService.toast("danger", err.data.message);
                console.log(err);
            });

            
        };

        $scope.delete = function () {
            if (confirm("Êtes-vous sûr de vouloir supprimer ce bloc CMS ?")) {
                CmsBlocksApi.delete({code: $scope.cmsBlock.code}, function (response) {
                    toastService.toast("success", $translate.instant("cmsBlocks.detail.blocDeleted"));
                    $location.path("/cmsBlocks");
                }, function (err) {
                    console.error(err);
                    toastService.toast("danger", $translate.instant("cmsBlocks.detail.failDelete"));
                });
            }
            // CmsBlocksApi.delete({id: block.id}, function(){
            //     $scope.cmsBlocks.splice($scope.cmsBlocks.indexOf(block), 1);
            // });
        };

        $scope.langChange = function (lang) {
            $scope.lang = lang;
            if ($scope.selectedTab.active == 'html'){
                $scope.selectedTab.active = 'result';
                setTimeout(function () {
                    $scope.$digest();
                    $scope.selectedTab.active = 'html';
                }, 10);
            }
        }

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
