var SetAttributesServices = angular.module('aq.setAttributes.services', []);

SetAttributesServices.factory('SetAttributesV2', ['$resource', function ($resource)
{
    return $resource('v2/:type/:id', {}, {
        list: {method: 'POST', params: {type: 'setAttributes'}},
        query: {method: 'POST', params: {type: 'setAttribute'}},
        save: {method: 'PUT', params: {type: 'setAttribute'}},
        delete: {method: 'DELETE', params: {type: 'setAttribute'}},
    });
}]);