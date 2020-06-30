
const TranslateServices = angular.module('aq.translate.services', []);


TranslateServices.factory('translateFactory', ['$resource', function ($resource) {
    return $resource('v2/translate/:lang/:currentTranslate', {}, {
        loadTranslation : { method: 'GET',  param: { currentTranslate: '', lang:'' } },
        saveTranslate   : { method: 'POST', param: { currentTranslate: '', lang:'' } }
    });
}]);

