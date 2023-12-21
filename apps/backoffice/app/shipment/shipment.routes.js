var ShipmentRoutes = angular.module('aq.shipment.routes', ['ngRoute']);

ShipmentRoutes.config(['$routeProvider', function ($routeProvider)
{
    $routeProvider
    .when('/shipments', {
            templateUrl: '/app/shipment/views/shipment-list.html',
            controller: 'ShipmentListCtrl',
            resolve: {
                loggedin: checkLoggedin,
                checkAccess: checkAccess('shipments'),
            }
    }).when('/shipments/new/settings', {
        templateUrl: '/app/shipment/views/shipment-beforeCreate.html',
        controller: 'ShipmentBeforeCreateCtrl',
        resolve: {
            loggedin: checkLoggedin,
            checkAccess: checkAccess('shipments'),
        }
    }).when('/shipments/:shipmentType/:shipmentId', {
        templateUrl: '/app/shipment/views/shipment-detail.html',
        controller: 'ShipmentDetailCtrl',
        resolve: {
            loggedin: checkLoggedin,
            checkAccess: checkAccess('shipments'),
        }
    });
}]);