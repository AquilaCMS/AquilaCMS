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
            $scope.groups = ([...new Set(cmsBlocks.datas.filter(sttc => sttc.group !== null).map(cmsBlock => cmsBlock.group))]).sort();
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
    "$scope", "CmsBlocksApi", "$routeParams", "$location", "toastService", "$http","$modal",
    function ($scope, CmsBlocksApi, $routeParams, $location, toastService, $http, $modal) {
        $scope.isEditMode = false;
        $scope.modules = [];
        $scope.groups = [];

        CmsBlocksApi.list({PostBody: {filter: {}, structure: '*', limit: 99}}).$promise.then(function (cmsList) {
            console.log(([...new Set(cmsList.datas.filter(sttc => sttc.group !== null).map(sttc => sttc.group))]))
            $scope.groups = ([...new Set(cmsList.datas.filter(sttc => sttc.group !== null).map(sttc => sttc.group))]).sort();
        });

        if ($routeParams.code !== "new") {
            CmsBlocksApi.query({PostBody: {filter: {code: $routeParams.code}, structure: '*', limit: 1}}, function (block) {
                $scope.cmsBlock = block;
                $scope.isEditMode = true;
                $scope.selectedDropdownItem = block.group ? block.group : "";
            });
        } else {
            $scope.cmsBlock = {};
            $scope.selectedDropdownItem = "";
        }

        $scope.save = async function (quit) {
            if(!$scope.cmsBlock || !$scope.cmsBlock.code || $scope.cmsBlock.code === "") return;
            $scope.cmsBlock.group = $scope.selectedDropdownItem === "" ? null : $scope.selectedDropdownItem;

            await CmsBlocksApi.save($scope.cmsBlock, function (res) {
                toastService.toast("success", "Bloc CMS sauvegardé !");
                if (quit) {
                    $location.path("/cmsBlocks");
                }else{
                    if ($routeParams.code !== $scope.cmsBlock.code) { // si différent (donc création)
                        $location.path(`/cmsBlocks/${$scope.cmsBlock.code}`);
                    }
                }
            });

            
        };

        $scope.delete = function () {
            if (confirm("Êtes-vous sûr de vouloir supprimer ce bloc CMS ?")) {
                CmsBlocksApi.delete({code: $scope.cmsBlock.code}, function (response) {
                    toastService.toast("success", "Bloc supprimé");
                    $location.path("/cmsBlocks");
                }, function (err) {
                    console.error(err);
                    toastService.toast("danger", "Echec de la suppresion");
                });
            }
            // CmsBlocksApi.delete({id: block.id}, function(){
            //     $scope.cmsBlocks.splice($scope.cmsBlocks.indexOf(block), 1);
            // });
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
        $scope.itemObjectSelected = function (item) {
            $scope.selectedDropdownItem = item;
        };

        $scope.filterDropdown = function (userInput) {
            if (userInput !== undefined) {
                $scope.selectedDropdownItem = userInput;
            }
            $scope.dropdownItems = [];
            return CmsBlocksApi.list({PostBody: {filter: {}, structure: '*', limit: 99}}).$promise.then(function (cmsList) {
                console.log(([...new Set(cmsList.datas.filter(sttc => sttc.group !== null).map(sttc => sttc.group))]))
                $scope.groups = ([...new Set(cmsList.datas.filter(sttc => sttc.group !== null).map(sttc => sttc.group))]).sort()
                $scope.dropdownItems = $scope.groups.map(function (item) {
                    const dropdownObject = angular.copy(item);
                    dropdownObject.readableName = item.group;
                    return dropdownObject;
                });
                return $scope.dropdownItems;
            });
        };

        $scope.filterDropdown();
    }
]);
