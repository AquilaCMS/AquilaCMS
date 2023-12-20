var ConfigServices = angular.module('aq.cmsBlocks.services', ['ngResource']);

ConfigServices.service('CmsBlocksApi', ['$resource', function ($resource)
{
    return $resource('v2/:type/:code', {}, {
        list: {method: 'POST', params: {type: 'cmsBlocks'}, isArray: false},
        query: {method: 'POST', params: {type: 'cmsBlock'}, isArray: false},
        save: {method: 'PUT', params: {type: 'cmsBlock'}, isArray: false},
        delete: {method: 'DELETE', params: {type: 'cmsBlock'}, isArray: false}
    });
}]);