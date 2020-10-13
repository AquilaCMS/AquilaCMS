const MediasControllers = angular.module("aq.medias.controllers", []);

MediasControllers.controller("MediasCtrl", ["$scope", "$route", '$modal', "MediaApiV2", "toastService", "ConfigV2", "$location",
    function ($scope, $route, $modal, MediaApiV2, toastService, ConfigV2, $location) {
        $scope.link = "-";
        $scope.nbItemsPerPage = 20;
        $scope.maxSize = 5;
        $scope.totalMedias = 0;
        $scope.groups = [];
        $scope.local = {
            insertDBMediaUpload : true,
            search: ""
        };

        $scope.generateFilter = function () {
            const filter = {};
            if($scope.currentTab === 'general') {
                filter.$or = [{group: null}, {group: ""}, {group: "general"}]
            } else {
                filter.group = $scope.currentTab
            }
            if ($scope.local.search !== "") {
                filter.name = {$regex: $scope.local.search, $options: 'gim'}
                delete filter.$or;
                delete filter.group;
            } else {
                delete filter.name
            }
            return filter;
        } 


        $scope.init = function () {
            MediaApiV2.getGroups({}, function (groups) {
                $scope.groups = groups; 
                $scope.currentTab = $scope.groups[0];

                MediaApiV2.list({PostBody: {filter: $scope.generateFilter(), structure: '*', limit: $scope.nbItemsPerPage, page: 1}}, function ({datas, count}) {
                    $scope.list = datas;
                    $scope.totalMedias = count;
                });
            });
        };

        $scope.init();

        $scope.onPageChange = function (page) {
            $scope.page = page;
            MediaApiV2.list({PostBody: {filter: $scope.generateFilter(), structure: '*', limit: $scope.nbItemsPerPage, page}}, function ({datas, count}) {
                $scope.list = datas;
                $scope.totalMedias = count;
            });
        }

        $scope.remove = function (media, event) {
            event.stopPropagation();
            if (confirm("Etes-vous sûr de vouloir supprimer ce média ?")) {
                MediaApiV2.delete({id: media._id}, function (response) {
                    toastService.toast("success", "Media supprimé");
                    $route.reload();
                });
            }
        };

        $scope.beforeMediaMass = function () {
            toastService.toast("info", "Cela peut prendre du temps, merci de patienter ...");
        };

        $scope.uploadedMediaMass = function () {
            toastService.toast("success", "Ajout en masse effectué. Rafraichir la page SVP.");
        };
        $scope.copyLink = function (index, event) {
            event.stopPropagation();
            $modal.open({
                templateUrl: 'app/medias/views/modals/copy_link.html',
                controller: 'MediasModalCtrl',
                resolve: {
                    media: function () {
                        return $scope.list[index];
                    }
                }
            });
        };

        $scope.changeTab = function(group) {
            $scope.currentTab = group;
            $scope.onPageChange(1);
        }

        $scope.mediaDetails = (media) => {
            $location.path('/medias/' + media._id)
        }
        $scope.isPicture = function(media) {
            if(media.link.match(new RegExp("jpg|jpeg|png|gif|svg", 'i'))) {
                return true
            }
            return false
        }
    }]);

MediasControllers.controller("MediasDetailsCtrl", ["$scope", "$location", "toastService", "ConfigV2", "MediaApiV2","$modal", "$routeParams", 
    function ($scope, $location, toastService, ConfigV2, MediaApiV2, $modal, $routeParams) {
        $scope.media = {
            link : "",
            name : "",
            group: ""
        };

        $scope.nsUploadFiles = {
            isSelected : false
        };
        
        $scope.routeId = $routeParams.id;
        
        $scope.selectedDropdownItem = "";


        $scope.copyLink = function (media) {
            $modal.open({
                templateUrl: 'app/medias/views/modals/copy_link.html',
                controller: 'MediasModalCtrl',
                resolve: {
                    media: function () {
                        return media;
                    }
                }
            });
        };

        $scope.isEditMode = false;

        $scope.success = function () {
            toastService.toast("success", "Lien copié");
        };

        $scope.onErrorUploadMedia = function () {
            toastService.toast("danger", "Error !");
        }

        $scope.save = function () {
            if ($scope.nsUploadFiles.isSelected){
                let response = confirm("La pièce jointe n'est pas sauvegardée, êtes vous sûr de vouloir continuer ?");
                if (!response){return}
            }
            $scope.media.group = $scope.selectedDropdownItem;
            MediaApiV2.save({media: $scope.media}, function (response) {
                toastService.toast("success", "Media sauvegardé !");
                $location.path("/medias");
            }, function (err) {
                toastService.toast("danger", "Une erreur est survenue lors de la sauvegarde.");
            });
        };

        $scope.init = function () {
            MediaApiV2.query({PostBody: {filter: {_id: $routeParams.id}, limit: 99}}, function (response) {
                $scope.media = response;
                $scope.selectedDropdownItem = $scope.media.group ? $scope.media.group : '';

                $scope.getGroups()
            });
        };

        $scope.getGroups = function () {
            $scope.itemObjectSelected = function (item) {
                $scope.selectedDropdownItem = item;
            };
    
            $scope.filterDropdown = function (userInput) {
                if (userInput !== undefined) {
                    $scope.selectedDropdownItem = userInput;
                }

                return MediaApiV2.getGroups({query: $scope.selectedDropdownItem}).$promise.then(function (groups) {
                    $scope.groups = groups
                    return groups;
                });
            };
    
            $scope.filterDropdown();
        }
        $scope.isPicture = function(media) {
            if(media.link.match(new RegExp("jpg|jpeg|png|gif|svg", "i"))) {
                return true
            }
            return false
        }

        if($routeParams.id !== 'new') {
            $scope.init();
        } else {
            $scope.getGroups()
        }
    }]);

MediasControllers.controller("MediasModalCtrl", ["$scope", "toastService", "$modalInstance", "media",
    function ($scope, toastService, $modalInstance, media) {
        $scope.media = media;
        $scope.info = {
            background:false,
            largeur: "",
            longueur: "",
            quality: "",
            r:255,
            g:255,
            b:255,
            alpha:1
        };
        if (media.name) {
            $scope.info.name = media.name;
        }

        $scope.generer = function () {
            const size = $scope.info.largeur + "x" + $scope.info.longueur;
            const quality = $scope.info.quality;
            let filename = "";
            if ($scope.info.name !== undefined) {
                filename = $scope.info.name.replace(/[^\w\s]/gi, '').replace(/\s/g, '')
                    + "." + $scope.media.link.replace(`medias/`, "")
                        .substr($scope.media.link.replace(`medias/`, "").lastIndexOf('.') + 1);
            } else {
                filename = $scope.media.link.replace(`medias/`, "");
            }

            let background = ''; 
            if ((!$scope.info.largeur || !$scope.info.longueur || !quality) || ($scope.info.background && (!$scope.info.r || !$scope.info.g || !$scope.info.b))) {
                toastService.toast("warning", "Veuillez saisir toutes les valeurs.");
            } else {
                if ($scope.info.background) {
                    if ($scope.info.alpha) {
                        if ($scope.info.alpha > 1) {
                            $scope.info.alpha = 1;
                        }
                    }
                    background = `-${$scope.info.r},${$scope.info.g},${$scope.info.b},${$scope.info.alpha}`;
                }
                toastService.toast("success", "Lien généré");
                $scope.link = `${window.location.origin}/images/medias/${size}-${quality}${background}/${$scope.media._id}/${filename}`;
                const elem = document.getElementById("copy-link");
                elem.focus();
                elem.select();
            }
        };

        $scope.copierLien = function() {
            const elem = document.getElementById("copy-link");
            elem.focus();
            elem.select();
            if (document.execCommand('copy')) {
                toastService.toast("success", "Lien copié");
            }
        }

        $scope.cancel = function () {
            $modalInstance.close()
        };
    }]);