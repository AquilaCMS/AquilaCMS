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
    "$rootScope", "$scope", "$routeParams", "$location", "SliderService", "SliderItemService", "toastService", "$modal", "$translate",
    function ($rootScope, $scope, $routeParams, $location, SliderService, SliderItemService, toastService, $modal, $translate)
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

        $scope.close = function() {
            toastService.toast("success", $translate.instant("slider.detail.addDone"));
        };

        $scope.save = function (quit)
        {
            if ($scope.nsUploadFiles.isSelected) {
                let response = confirm($translate.instant("confirm.fileAttachedNotSaved"));
                if (!response) { return }
            }
            SliderService.save($scope.slider, function (res)
            {
                if($scope.isEditMode)
                {
                    toastService.toast("success", $translate.instant("global.saveDone"));
                }
                else
                {
                    $location.path("/component/slider/" + res._id);
                }

                if(quit)
                {
                    $location.path("/component/slider");
                }
            }, function (error) {
                if(error.data){
                    if(error.data.message && error.data.message != ""){
                        toastService.toast("danger",  error.data.message);
                    }
                }else if(error && error.code != ""){
                    toastService.toast("danger", error.code);
                }else{
                    toastService.toast("danger", $translate.instant("global.standardError"));
                }
            });
        };

        $scope.delete = function ()
        {
            if (confirm($translate.instant("confirm.deleteCarousel"))){
                SliderService.delete({id: $scope.slider._id}, function ()
                {
                    toastService.toast("success", $translate.instant("global.deleteDone"));
                    $location.path("/component/slider");
                }, function (err)
                {
                    console.error(err);
                    toastService.toast("danger", $translate.instant("slider.list.errorDelete"));
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
            const fileName = item.src.split('\\').pop().split('/').pop();
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
