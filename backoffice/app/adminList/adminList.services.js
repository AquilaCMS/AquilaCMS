var AdminList = angular.module('aq.adminList.services', ['ngResource']);

AdminList.service('AdminListApi', ['$resource', function ($resource)
{
    return $resource('v2/adminRights', {}, {
        list: {method: 'POST', params: {}, isArray: false}
    });
}]);