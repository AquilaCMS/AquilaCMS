var PaymentMethodServices = angular.module('aq.paymentMethod.services', ['ngResource']);

PaymentMethodServices.factory('PaymentMethodV2', ['$resource', function ($resource)
{
    return $resource('v2/:type/:id', {}, {
        list: {method: 'POST', params: {type: 'paymentMethods'}},
        query: {method: 'POST', params: {type: 'paymentMethod'}},
        save: {method: 'PUT', params: {type: 'paymentMethod'}},
        delete: {method: 'DELETE', params: {type: 'paymentMethod'}},
    });
}]);