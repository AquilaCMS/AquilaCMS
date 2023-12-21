var ProductFilters = angular.module('aq.product.filters', []);

ProductFilters.filter('nsProductTypeName', ['NSConstants', function(NSConstants) {
  return function (typeCode) {
    var typeObj = NSConstants.productTypes.find(function (currType) {
      return currType.code == typeCode;
    });

    if (typeObj)
      return typeObj.name;
    else return '';
  }
}]);