
const TranslateControllers = angular.module('aq.translate.controllers', []);

TranslateControllers.controller('TranslateHomeCtrl', ['$scope', '$http', 'toastService', 'translateFactory', /*'LanguagesApi',*/
    function ($scope, $http, toastService, translateFactory/*, LanguagesApi*/) {
        $scope.local = {
            customTranslate   : '',
            allTranslateNames : [],
            currentTranslate  : '',
            lang : "fr"
        };

        $scope.langChange = function (lang)
        {
            $scope.local.lang = lang;
            $scope.local.loadTranslation();
        };


        $http.get('/v2/translate').then((response) => {
            $scope.local.allTranslateNames = response.data;
        });


        $scope.local.loadTranslation = function ()  {
            if($scope.local.currentTranslate !== "") {
                translateFactory.loadTranslation(
                    { currentTranslate : $scope.local.currentTranslate, lang : $scope.local.lang },
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
                        { currentTranslate: $scope.local.currentTranslate, lang : $scope.local.lang }, { datas: $scope.local.customTranslate },
                        (response) => {
                            toastService.toast('success', 'Translate sauvegardés !');
                        },
                        (err) => {
                            toastService.toast('danger', err.data.translations.fr);
                        }
                    );
                } catch (err) {
                    toastService.toast('danger', "JSON invalide: " + err.message);
                }
            }
        };

        $scope.local.compileFront = function() {

            $http.post('/v2/themes/package/build/', {"themeName":""}).then((response) => {
                 $http.get('/restart').then((response) => {

                });
            });
        }


    }]);

