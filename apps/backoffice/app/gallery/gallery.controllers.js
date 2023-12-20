angular.module("aq.gallery.controllers", []).controller("GalleryListCtrl", [
    "$scope", "$location", "GalleryService", function ($scope, $location, GalleryService) {
        $scope.galleries = [];
        $scope.filter = {code:""};

        $scope.goToGalleryDetails = function (galleryId) {
            $location.path("/component/gallery/" + galleryId);
        };

        $scope.getGallery = function(){
            let filter = {};
            if($scope.filter.code != ""){
                filter["code"] = { $regex: $scope.filter.code, $options: "i" };
            }
            GalleryService.list({PostBody: { filter, skip: 0, limit: 100 }}, function (res) {
                $scope.galleries = res.datas;
            });
        };
        $scope.getGallery(); //get gallery list for the first time
    }
]).controller("GalleryDetailCtrl", [
    "$rootScope", "$scope", "$routeParams", "$location", "GalleryService", "GalleryItemService", "toastService", "$modal", "$translate",
    function ($rootScope, $scope, $routeParams, $location, GalleryService, GalleryItemService, toastService, $modal, $translate) {

        $scope.isEditMode = false;
        $scope.disableSave = true;
        $scope.gallery = {};

        if ($routeParams.id !== "new") {
            $scope.isEditMode = true;

            GalleryService.detail({ id: $routeParams.id }, function (res) {
                $scope.gallery = res;
                $scope.disableSave = false;
            });
        }
        else {
            $scope.gallery = { code: "", initItemNumber: 12, maxColumnNumber: 4 };
        }

        var elementInDrag;
        var pointToElement;
        var saveURL;
        var savePointElement;
        var drop;
        var inOther;

        $scope.draggingStart = function (element){
            drop = false;
            elementInDrag = element.childNodes[1].style.backgroundImage;
            pointToElement = element.childNodes[1];
            element.childNodes[1].style.opacity = '0.5';
        }

        $scope.switchElement = function (element, where){
            inOther = false;
            if(element.childNodes[1] != pointToElement){
                if(where == 'in'){
                    inOther = true;
                    saveURL = element.childNodes[1].style.backgroundImage;
                    savePointElement = element;
                    pointToElement.style.backgroundImage = element.childNodes[1].style.backgroundImage;
                    element.childNodes[1].style.backgroundImage = elementInDrag;
                    element.parentNode.className += ' fakeDrop';
                }else if(where == 'out'){
                    inOther = false;
                    element.childNodes[1].style.backgroundImage = saveURL;
                    pointToElement.style.backgroundImage = elementInDrag;
                    element.parentNode.className = element.parentNode.className.replace('fakeDrop', '');
                }
            }
            
        }

        $scope.draggingEnd = function (element){
            drop = true;
            element.childNodes[1].style.opacity = '1';
            if(inOther){
                //On switch car on est dans une autre
                document.getElementById('dirty-button').click()
                savePointElement.childNodes[1].style.backgroundImage = saveURL;
                pointToElement.style.backgroundImage = elementInDrag;
                savePointElement.parentNode.className = savePointElement.parentNode.className.replace('fakeDrop', '');
            }else{
                //On remet à zéro
                if(savePointElement){
                    savePointElement.childNodes[1].style.backgroundImage = saveURL;
                    savePointElement.parentNode.className = savePointElement.parentNode.className.replace('fakeDrop', '');
                }
                pointToElement.style.backgroundImage = elementInDrag;
            }
        };



        $rootScope.dropEvent ? $rootScope.dropEvent() : null;
        $rootScope.dropEvent = $rootScope.$on("dropEvent", function (evt, dragged, dropped) {
            var transOrder = dragged.order;
            dragged.order = dropped.order;
            dropped.order = transOrder;
            $scope.$apply();
        });

        $scope.checkValidity = function () {
            if ($scope.gallery && $scope.gallery.code && $scope.gallery.code !== "" && $scope.gallery.initItemNumber && $scope.gallery.initItemNumber > 0 && $scope.gallery.maxColumnNumber && $scope.gallery.maxColumnNumber > 0) {
                $scope.disableSave = false;
            }
            else {
                $scope.disableSave = true;
            }
        };

        function saveGallery(quit) {
            GalleryService.save($scope.gallery, function (res) {
                if ($scope.isEditMode) {
                    toastService.toast("success", $translate.instant("global.saveDone"));
                }
                else {
                    $location.path("/component/gallery/" + res._id);
                }

                if (quit) {
                    $location.path("/component/gallery");
                }
            }, function (err) {
                    console.error(err);
                    if(err.data && err.data.message){
                        toastService.toast("danger", err.data.message);
                    }else{
                        toastService.toast("danger", $translate.instant("gallery.list.failSave"));
                    }
                });
        }

        $scope.save = function (quit) {
            if ($scope.gallery.items && $scope.gallery.items.length > 0) {
                GalleryItemService.saveAll({ id: $scope.gallery._id }, $scope.gallery.items, function () {
                    saveGallery(quit);
                }, function (err) {
                        console.error(err);
                        toastService.toast("danger", $translate.instant("gallery.list.failSave"));
                    });
            }
            else {
                saveGallery(quit);
            }
        };

        $scope.delete = function () {
            if (confirm($translate.instant("confirm.deleteGallery"))) {
                GalleryService.delete({ id: $scope.gallery._id }, function () {
                    toastService.toast("success", $translate.instant("gallery.list.deleteDone"));
                    $location.path("/component/gallery");
                }, function (err) {
                        console.error(err);
                        toastService.toast("danger", $translate.instant("gallery.list.failDelete"));
                    });
            }
        };

        $scope.openItemModal = function (item) {
            $modal.open({
                templateUrl: 'app/gallery/views/modals/gallery-item.html',
                controller: 'GalleryItemCtrl',
                resolve: {
                    gallery: function () {
                        return $scope.gallery;
                    },
                    item: function () {
                        return item;
                    }
                }
            }).result.then(function () {
                GalleryService.detail({ id: $routeParams.id }, function (res) {
                    $scope.gallery = res;
                    $scope.disableSave = false;
                });
            });
        };

        $scope.getImage = function(img) {
            const filename = img.src.split('\\').pop().split('/').pop();
            return `/images/gallery/200x200/${img._id}/${filename}`;
        }
    }
]).controller("GalleryItemCtrl", [
    "$scope", "$modalInstance", "GalleryItemService", "gallery", "item", "toastService", "$translate", function ($scope, $modalInstance, GalleryItemService, gallery, item, toastService, $translate) {
        $scope.isEditMode = false;
        $scope.item = { type: "photo", content: "", src: "", srcset: [], alt: "" };
        $scope.showLoader = false;
        $scope.gallery = gallery;
        var lastOrder = 0;

        for (var i = 0; i < gallery.items.length; i++) {
            if (lastOrder < gallery.items[i].order) {
                lastOrder = gallery.items[i].order;
            }
        }

        $scope.item.order = lastOrder + 1;

        if (item) {
            $scope.isEditMode = true;
            $scope.item = angular.copy(item);
        }

        $scope.save = function () {
            if ($scope.item.type === "photo") {
                $scope.item.content = "";
            }
            else if ($scope.item.type === "video") {
                $scope.item.src = "";
                $scope.item.srcset = [];
            }

            GalleryItemService.save({ id: gallery._id }, $scope.item, function (response) {
                toastService.toast("success", $translate.instant('gallery.item.updated'));
                $modalInstance.close();
            }, function (response) {
                toastService.toast("danger", response.data.message);
            });
        };

        $scope.close = function(isEditMode) {
            if (isEditMode) {
                toastService.toast("success", $translate.instant('gallery.item.updated'));
            }
            else {
                toastService.toast("success", $translate.instant('gallery.item.added'));
            }
            $modalInstance.close();
        };

        $scope.cancel = function (event) {
            event.preventDefault();
            $modalInstance.dismiss("cancel");
        };

        $scope.delete = function (event) {
            event.preventDefault();
            GalleryItemService.delete({ id: gallery._id, itemId: $scope.item._id }, function () {
                $modalInstance.close();
            });
        };

        $scope.getImage = function(img) {
            const filename = img.src.split('\\').pop().split('/').pop();
            return `/images/gallery/200x200/${img._id}/${filename}`;
        }
    }
]);
