var BundleProductFilters = angular.module('aq.bundleProduct.filters', []);

BundleProductFilters.filter('bundleSectionType', ['BundleSectionTypes', function(BundleSectionTypes) {
	return function(typeCode) {
		var foundType = BundleSectionTypes.find(function(type){
			return typeCode === type.code;
		});

		if(foundType) return foundType.name;
		else return;
	};
}]);