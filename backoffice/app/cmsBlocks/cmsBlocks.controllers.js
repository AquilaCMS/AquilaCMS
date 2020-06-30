const CmsBlocksControllers = angular.module("aq.cmsBlocks.controllers", []);

CmsBlocksControllers.controller("CmsBlocksListCtrl", [
    "$scope", "$location", "CmsBlocksApi", "$rootScope", function ($scope, $location, CmsBlocksApi, $rootScope) {
        $scope.defaultLang = $rootScope.languages.find(function (lang) {
            return lang.defaultLanguage;
        }).code;

        CmsBlocksApi.list({PostBody: {filter: {_id: {$ne: null}}, limit: 99}}, function (cmsBlocks) {
            $scope.cmsBlocks = cmsBlocks.datas;
        });

        $scope.goToCmsBlockDetails = function (blockId) {
            $location.path(`/cmsBlocks/${blockId}`);
        };
    }
]);

CmsBlocksControllers.controller("CmsBlocksDetailCtrl", [
    "$scope", "CmsBlocksApi", "$routeParams", "$location", "toastService", "$http","$modal",
    function ($scope, CmsBlocksApi, $routeParams, $location, toastService, $http, $modal) {
        $scope.isEditMode = false;
        $scope.modules = [];

        if ($routeParams.code !== "new") {
            CmsBlocksApi.query({PostBody: {filter: {code: $routeParams.code}, limit: 1}}, function (block) {
                $scope.cmsBlock = block;
                $scope.isEditMode = true;
            });
        } else {
            $scope.cmsBlock = {};
        }

        $scope.save = async function (quit) {
            if(!$scope.cmsBlock || !$scope.cmsBlock.code || $scope.cmsBlock.code === "") return;
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
    }
]);
