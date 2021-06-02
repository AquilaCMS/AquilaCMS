
const DesignControllers = angular.module('aq.design.controllers', []);

DesignControllers.controller('DesignHomeCtrl', ['$scope', '$http', 'toastService', 'designFactory', '$translate',
    function ($scope, $http, toastService, designFactory, $translate) {
        $scope.local = {
            customCSS   : '',
            allCssNames : [],
            currentCss  : ''
        };


        $http.get('/v2/themes/css').then((response) => {
            $scope.local.allCssNames = response.data;
            $scope.local.currentCss = response.data[0];
            $scope.loadNewCss();
        });


        $scope.loadNewCss = function ()  {
            designFactory.loadNewCss(
                { currentCss: $scope.local.currentCss },
                (response) => {
                    $scope.local.customCSS = response.data;
                },
                (err) => {
                    toastService.toast('danger', err.data.message);
                }
            );
        };

        $scope.saveCss = function () {
            designFactory.saveCss(
                { currentCss: $scope.local.currentCss }, { datas: $scope.local.customCSS },
                (response) => {
                    toastService.toast('success', $translate.instant("design.designSaved"));
                },
                (err) => {
                    toastService.toast('danger', err.data.message);
                }
            );
        };
    }]);

