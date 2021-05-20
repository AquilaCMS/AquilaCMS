var TranslationControllers = angular.module('aq.translation.controllers', []);

TranslationControllers.controller('LanguagesCtrl',
    ['$scope', 'LanguagesApiV2', '$modal', 'toastService',
    function ($scope, LanguagesApiV2, $modal, toastService) {
        //console.log('test')
        $scope.filter = {};

        $scope.getLanguages = function() {
            let filter = {};
            const filterKeys = Object.keys($scope.filter);
            for (let i = 0, leni = filterKeys.length; i < leni; i++) {
                if($scope.filter[filterKeys[i]] === null){
                    break;
                }
                if(filterKeys[i].includes("status")) {
                    if($scope.filter.status == "visible"){
                        filter["status"] = "visible";
                    }else if($scope.filter.status == "invisible"){
                        filter["status"] = "invisible";
                    }
                } else {
                    if (typeof ($scope.filter[filterKeys[i]]) === 'object'){
                        filter[filterKeys[i] + ".number"] = { $regex: $scope.filter[filterKeys[i]].number, $options: "i" };
                    }else{
                        if($scope.filter[filterKeys[i]].toString() != ""){
                            filter[filterKeys[i]] = { $regex: $scope.filter[filterKeys[i]].toString(), $options: "i" };
                        }
                    }
                }
            }
            LanguagesApiV2.list({}, {PostBody: {filter, limit: 99}}, function (languages) {
                $scope.languages = languages.datas;
            });
        }

        $scope.getLanguages();
        
        $scope.editLang = function (lang) {
            var modalInstance = $modal.open({
                templateUrl: 'app/translation/views/modals/language-edit.html',
                controller: 'LanguageEditCtrl',
                resolve: {
                    lang: function () {
                        return lang;
                    }
                }
            });

            modalInstance.result.then(function () {
                $scope.getLanguages();
            });
        };

        $scope.removeLang = function (lang) {
            if (confirm('Etes-vous sûr de vouloir supprimer cet élément ?')) {
                if (LanguagesApiV2.delete({ id: lang._id }).$resolved === false){
                    $scope.languages.splice($scope.languages.indexOf(lang), 1);
                    setTimeout(function(){
                        getLanguages();
                        var event = new CustomEvent("getLanguages", {});
                        window.dispatchEvent(event);
                    }, 200) 
                }else{
                    toastService.toast("danger", err.data);
                }
            }
        };
    }
]);

TranslationControllers.controller('LanguageEditCtrl',
        ['$scope', 'LanguagesApiV2', '$modalInstance', 'lang', 'toastService', '$translate',
            function ($scope, LanguagesApiV2, $modalInstance, lang, toastService, $translate) {
                function getLanguages() {
                    LanguagesApiV2.list({}, {PostBody: {filter: {}, limit: 99}},function (languages) {
                        $scope.languages = languages.datas;
                    });
                }

                if (lang) {
                    $scope.lang = angular.copy(lang);
                    if($scope.lang.status === 'visible') $scope.lang.visible = true;
                    else if($scope.lang.status === 'invisible') $scope.lang.visible = false;
                    $scope.isDefaultLang = $scope.lang.defaultLanguage;
                    $scope.isEdit = true;
                }
                else $scope.lang = {defaultLanguage: false, visible: false};

                $scope.save = function (lang) {
                    LanguagesApiV2.save({lang}, function () {
                        var event = new CustomEvent("getLanguages", {});
                        window.dispatchEvent(event);
                        $modalInstance.close();
                    }, function(err){
                        if(err.data.message){
                            toastService.toast("danger", err.data.message);
                        }else if(err.code === "Conflict" || err.data.code === "Conflict"){
                            toastService.toast("danger", $translate.instant("global.alreadyExist"));
                        }else{
                            toastService.toast("danger", err.data);
                        }
                    });
                    getLanguages();
                };

                $scope.cancel = function () {
                    $modalInstance.dismiss('cancel');
                };

                $scope.onChangeVisible = function(visible){
                    if(visible){
                        $scope.lang.status = 'visible';
                    }
                    else {
                        $scope.lang.status = 'invisible';
                    }
                };

}]);
