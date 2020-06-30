var BundleProductServices = angular.module('aq.bundleProduct.services', ['ngResource']);

BundleProductServices.service('BundleProductApi', ['$resource', function($resource){
	return $resource('v2/product/bundle/:action/:code', {}, {});
}]);

BundleProductServices.service('BundleSectionTypes', function(){
	return [
		{code: 'SINGLE', name: 'Un seul choix'},
		{code: 'MULTIPLE', name: 'Choix multiples'}
	];
});

BundleProductServices.service('BundleSectionDisplayModes', function(){
	return [
		{code: 'RADIO_BUTTON', name: 'Bouttons radio'},
		{code: 'SELECT', name: 'Liste déroulante'}
	];
});