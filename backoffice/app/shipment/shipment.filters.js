var ShipmentFilters = angular.module('aq.shipment.filters', []);


ShipmentFilters.filter('shipmentTypeName', function() {
  return function(input){
    if(input === 'DELIVERY') return 'Livraison';
    else if(input === 'RELAY_POINT') return 'Point relais';
    else input;
  } ;
});
