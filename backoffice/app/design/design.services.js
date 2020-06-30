
const DesignServices = angular.module('aq.design.services', []);


DesignServices.factory('designFactory', ['$resource', function ($resource) {
    return $resource('v2/themes/css/:currentCss', {}, {
        loadNewCss : { method: 'GET',  param: { currentCss: '' } },
        saveCss    : { method: 'POST', param: { currentCss: '' } }
    });
}]);

