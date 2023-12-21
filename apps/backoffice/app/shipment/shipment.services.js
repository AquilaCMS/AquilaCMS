var ShipmentServices = angular.module('aq.shipment.services', []);

ShipmentServices.factory('Shipment', ['$resource', function ($resource) {
    return $resource('/v2/:route/:id', {}, {
        list: {method: "POST", params: {route: "shipments"}},
        detail: {method: "POST", params: {route: "shipment", id: ""}},
        save: {method: "PUT", params: {route: "shipment"}},
        delete: {method: "DELETE", params: {route: "shipment", id: ""}}
    });
}]);

ShipmentServices.factory('ShipmentOld', ['$resource', function ($resource) {
    return $resource('/shipments/:action/:shipmentId', {}, {
        save: {method: 'POST', params: {}},
        query: {method: 'GET', isArray: true},
        remove: {method: 'DELETE', params: {shipmentId: ''}},
    });
}]);
