const MediasControllers = angular.module("aq.medias.controllers", []);

MediasControllers.controller("MediasCtrl", ["$scope", "$route", '$modal', "MediaApiV2", "toastService", "ConfigV2",
    function ($scope, $route, $modal, MediaApiV2, toastService, ConfigV2) {
        $scope.link = "-";
        $scope.local = {
            insertDBMediaUpload : true
        };


        $scope.init = function () {
            MediaApiV2.list({PostBody: {filter: {}, limit: 1024}}, function (response) {
                $scope.list = response.datas;
                $scope.config = ConfigV2.environment(function () {

                });
            });
        };

        $scope.init();

        $scope.remove = function (media) {
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
        $scope.copyLink = function (mediaLink) {
            var modalInstance = $modal.open({
                templateUrl: 'app/medias/views/modals/copy_link.html',
                controller: 'MediasModalCtrl',
                resolve: {
                    mediaLink: function () {
                        return mediaLink;
                    },
                    newMedia: function () {
                        return false;
                    }
                }
            });
        };
    }]);

MediasControllers.controller("MediasNewCtrl", ["$scope", "$location", "toastService", "ConfigV2", "MediaApiV2","$modal",
    function ($scope, $location, toastService, ConfigV2, MediaApiV2,$modal) {
        $scope.media = {
            link : "", name : ""
        };

        $scope.config = ConfigV2.environment(function () {

        });

        $scope.copyLink = function (mediaLink) {
            var modalInstance = $modal.open({
                templateUrl: 'app/medias/views/modals/copy_link.html',
                controller: 'MediasModalCtrl',
                resolve: {
                    mediaLink: function () {
                        return mediaLink;
                    },
                    newMedia: function(){
                        return true;
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
            // Utilisé pour afficher les messages d'erreur au moment de la soumission d'un formulaire
            $scope.form.nsSubmitted = true;

            if ($scope.form.$invalid) {
                toastService.toast("danger", "Les informations saisies ne sont pas valides.");
                return;
            }

            MediaApiV2.save({media: $scope.media}, function (response) {
                toastService.toast("success", "Media sauvegardé !");
                $location.path("/medias");
            }, function (err) {
                toastService.toast("danger", "Une erreur est survenue lors de la sauvegarde.");
            });
        };

        $scope.init = function () {
            MediaApiV2.list({PostBody: {filter: {}, limit: 99}}, function (response) {
                $scope.list = response.datas;
                $scope.config = ConfigV2.environment(function () {
                });
            });
        };

        $scope.init();
    }]);

MediasControllers.controller("MediasModalCtrl", ["$scope", "toastService", "ConfigV2", "$modalInstance", "mediaLink", "MediaApiV2","newMedia",
    function ($scope, toastService, ConfigV2, $modalInstance, mediaLink, MediaApiV2, newMedia) {

        if (mediaLink !== undefined) {
            $scope.mediaLink = mediaLink;
            $scope.info = {
                largeur: "", longueur: "", quality: ""
            };
            if(mediaLink.name && mediaLink != undefined){
                $scope.info.name = mediaLink.name;
            }
        }

        $scope.generer = function () {
            const size = $scope.info.largeur + "x" + $scope.info.longueur;
            const quality = $scope.info.quality;
            let filename = "";

            if (newMedia === true){
                if ($scope.info.name !== undefined && $scope.info.name !== "") {
                    filename = $scope.info.name.replace(/[^\w\s]/gi, '').replace(/\s/g, '') + "." + $scope.mediaLink.link.replace(`medias/`, "").substr($scope.mediaLink.link.replace(`medias/`, "").lastIndexOf('.') + 1);
                } else {
                    filename =$scope.mediaLink.link.replace(`medias/`, "");
                }
            }else{
                if ($scope.info.name !== undefined) {
                    filename = $scope.info.name.replace(/[^\w\s]/gi, '').replace(/\s/g, '') + "." + $scope.list[$scope.mediaLink].link.replace(`medias/`, "").substr($scope.list[$scope.mediaLink].link.replace(`medias/`, "").lastIndexOf('.') + 1);
                } else {
                    filename = $scope.list[$scope.mediaLink].link.replace(`medias/`, "");
                }
            }
            
          
            if ($scope.info.largeur === null || $scope.info.longueur === null || $scope.info.largeur == 0 || $scope.info.longueur == 0 || quality === null || quality == 0) {
                toastService.toast("warning", "Veuillez saisir toutes les valeurs.");
            } else {
                toastService.toast("success", "Lien généré");
                if(newMedia === true){
                    $scope.link = `${window.location.origin}/images/medias/${size}-${quality}/${$scope.mediaLink._id}/${filename}`;
                }else{
                    $scope.link = `${window.location.origin}/images/medias/${size}-${quality}/${$scope.list[$scope.mediaLink]._id}/${filename}`;
                }
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

        $scope.init = function () {
            MediaApiV2.list({PostBody: {filter: {}, limit: 99}}, function (response) {
                $scope.list = response.datas;
                $scope.config = ConfigV2.environment(function () {
                });
            });
        };

        $scope.init();
    }]);