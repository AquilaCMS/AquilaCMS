var PictoServices = angular.module('aq.picto.services', ['ngResource']);

PictoServices.service('PictoApi', [
    '$resource',
    function($resource) {
        return $resource(
            'v2/picto/:id',
            {},
            {
                list: { method: 'POST', params: {}, isArray: false },
                query: { method: 'POST', params: {}, isArray: false },
                save: { method: 'PUT', params: {}, isArray: false },
                delete: { method: 'DELETE', params: {}, isArray: false },
                update : {method: 'POST', params: {id : 'execRules'}, isArray: false}
            }
        );
    }
]);
