
const UpdateServices = angular.module('aq.update.services', []);


UpdateServices.factory('updateFactory', ['$resource', function ($resource) {
    return $resource('v2/themes/css/:currentCss', {}, {
        loadNewCss : { method: 'GET',  param: { currentCss: '' } },
        saveCss    : { method: 'POST', param: { currentCss: '' } }
    });
}]);

