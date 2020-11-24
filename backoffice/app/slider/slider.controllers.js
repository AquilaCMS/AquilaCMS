angular.module("aq.slider.controllers", []).controller("SliderListCtrl", [
    "$scope", "$location", "SliderService", function ($scope, $location, SliderService)
    {
        $scope.sliders = [];

        $scope.goToSliderDetails = function (sliderId)
        {
            $location.path("/component/slider/" + sliderId);
        };

        SliderService.list({PostBody: {skip: 0, limit: 100}}, function (res)
        {
            $scope.sliders = res.datas;
        });
    }
]).controller("SliderDetailCtrl", [
    "$rootScope", "$scope", "$routeParams", "$location", "SliderService", "SliderItemService", "toastService", "$modal",
    function ($rootScope, $scope, $routeParams, $location, SliderService, SliderItemService, toastService, $modal)
    {
        $scope.isEditMode = false;
        $scope.disableSave = true;
        $scope.showLoader = false;
        $scope.slider = {};
        $scope.nsUploadFiles = {
            isSelected: false
        };

        if($routeParams.id !== "new")
        {
            $scope.isEditMode = true;

            SliderService.detail({PostBody: {filter: {_id: $routeParams.id}}}, function (res)
            {
                $scope.slider = res;
                $scope.disableSave = false;
            });
        }
        else
        {
            $scope.slider = {code: "", autoplay: true, pauseOnHover: true, infinite: true, autoplaySpeed: 2000, items: []};
        }

        $rootScope.dropEvent ? $rootScope.dropEvent() : null;
        $rootScope.dropEvent = $rootScope.$on("dropEvent", function (evt, dragged, dropped)
        {
            var transOrder = dragged.order;
            dragged.order = dropped.order;
            dropped.order = transOrder;
            $scope.$apply();
        });

        $scope.checkValidity = function ()
        {
            if($scope.slider && $scope.slider.code && $scope.slider.code !== "" && $scope.slider.autoplaySpeed && $scope.slider.autoplaySpeed > 0)
            {
                $scope.disableSave = false;
            }
            else
            {
                $scope.disableSave = true;
            }
        };

        $scope.close = function() {
            toastService.toast("success", "Ajout réussi");
        };

        $scope.save = function (quit)
        {
            if ($scope.nsUploadFiles.isSelected) {
                let response = confirm("La pièce jointe n'est pas sauvegardée, êtes vous sûr de vouloir continuer ?");
                if (!response) { return }
            }
            SliderService.save($scope.slider, function (res)
            {
                if($scope.isEditMode)
                {
                    toastService.toast("success", "Sauvegarde effectuée");
                }
                else
                {
                    $location.path("/component/slider/" + res._id);
                }

                if(quit)
                {
                    $location.path("/component/slider");
                }
            }, function (err)
            {
                console.error(err);
                toastService.toast("danger", "Echec de la sauvegarde");
            });
        };

        $scope.delete = function ()
        {
            if(confirm("Êtes-vous sûr de vouloir supprimer ce carousel ?")){
                SliderService.delete({id: $scope.slider._id}, function ()
                {
                    toastService.toast("success", "Suppression effectuée");
                    $location.path("/component/slider");
                }, function (err)
                {
                    console.error(err);
                    toastService.toast("danger", "Echec de la suppression");
                });
            }
        };

        $scope.openItemModal = function (item)
        {
            $modal.open({
                templateUrl: "app/slider/views/modals/slider-item.html",
                controller: "SliderItemCtrl",
                resolve: {
                    slider: function ()
                    {
                        return $scope.slider;
                    },
                    item: function ()
                    {
                        return item;
                    }
                }
            }).result.then(function ()
            {
                SliderService.detail({PostBody: {filter: {_id: $routeParams.id}}}, function (res)
                {
                    $scope.slider = res;
                    $scope.disableSave = false;
                });
            });
        };

        $scope.getImage = function(item) {
            const fileName = item.src.split('/')[item.src.split('/').length -1];
            return `/images/slider/200x200/${item._id}/${fileName}`;
        }
    }
]).controller("SliderItemCtrl", [
    "$scope", "$modalInstance", "slider", "item", "SliderItemService", function ($scope, $modalInstance, slider, item, SliderItemService)
    {
        $scope.item = item;
        $scope.showLoader = false;
        $scope.slider = slider;

        $scope.save = function ()
        {
            SliderItemService.saveSlider({ id: slider._id}, $scope.slider, function () {
                $modalInstance.close();
            });
        };

        $scope.close = function() {
            $modalInstance.close();
        };

        $scope.cancel = function (event)
        {
            event.preventDefault();
            $modalInstance.dismiss("cancel");
        };

        $scope.delete = function (event)
        {
            event.preventDefault();
            SliderItemService.delete({ id: slider._id, itemId: $scope.item._id }, function () {
                $modalInstance.close();
            });
        };
    }
]);
