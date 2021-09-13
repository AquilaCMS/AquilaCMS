
const TranslateControllers = angular.module('aq.translate.controllers', []);

TranslateControllers.controller('TranslateHomeCtrl', ['$scope', '$http', 'toastService', 'translateFactory', '$translate', /*'LanguagesApi',*/
    function ($scope, $http, toastService, translateFactory, $translate/*, LanguagesApi*/) {
        $scope.local = {
            customTranslate: '',
            allTranslateNames: [],
            currentTranslate: '',
            lang: "fr"
        };
        $scope.showLoader = false;
        $scope.additionnalButtons = [
            {
                text: 'translate.reboot',
                onClick: function () {
                    $scope.local.compileFront();
                },
                icon: '<i class="fa fa-file-text" aria-hidden="true"></i>'
            }
        ];


        $scope.langChange = function (lang) {
            $scope.local.lang = lang;
            $scope.local.loadTranslation();
        };


        $http.get('/v2/translate').then((response) => {
            $scope.local.allTranslateNames = response.data;
        });


        $scope.local.loadTranslation = function () {
            if ($scope.local.currentTranslate !== "") {
                translateFactory.loadTranslation(
                    { currentTranslate: $scope.local.currentTranslate, lang: $scope.local.lang },
                    (response) => {
                        $scope.local.customTranslate = JSON.stringify(response, undefined, 2);
                    },
                    (err) => {
                        toastService.toast('danger', err.data.translations.fr);
                    }
                );
            }
        };

        $scope.local.saveTranslate = function () {
            if ($scope.local.currentTranslate !== "") {
                try {
                    JSON.parse($scope.local.customTranslate);
                    translateFactory.saveTranslate(
                        { currentTranslate: $scope.local.currentTranslate, lang: $scope.local.lang }, { datas: $scope.local.customTranslate },
                        (response) => {
                            toastService.toast('success', $translate.instant("translate.translateSaved"));
                        },
                        (err) => {
                            toastService.toast('danger', err.data.translations.fr);
                        }
                    );
                } catch (err) {
                    const textTranslated = $translate.instant("translate.toast.invalidJSON");
                    toastService.toast('danger', `${textTranslated}: ` + err.message);
                }
            }
        };

        $scope.local.compileFront = function () {
            $scope.showLoader = true;
            $http.post('/v2/themes/package/build/', { "themeName": "" }).then((response) => {
                toastService.toast('success', $translate.instant("translate.buildSucceed"));
                $scope.showLoader = false;
                $http.get('/restart').then((response) => {

                });
            }).catch(function (error) {
                $scope.showLoader = false;
                toastService.toast('danger', $translate.instant("translate.buildFailed"));
                console.log(error);
            });
        }


    }]);

