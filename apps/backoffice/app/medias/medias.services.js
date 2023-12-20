var MediasServices = angular.module("aq.medias.services", ["ngResource"]);


MediasServices.factory("MediaApi", ["$resource", function ($resource) {
	return $resource("medias/:link", {}, {
		list: {method: "GET", isArray: true}, save: {method: "POST"}, remove: {method: "DELETE", params: {link: ""}}

	});
}]).factory("MediaApiV2", ["$resource", function ($resource) {
	return $resource("/v2/:type/:id", {}, {
		list: {method: "POST", params: {type: 'medias'}},
		query: {method: "POST", params: {type: 'media'}},
		save: {method: "PUT", params: {type: 'media'}},
		delete: {method: "DELETE", params: {type: 'media'}},
		getGroups: {method: "GET", params: {type: 'medias', id: "groups"}, isArray: true},
		getGroupsImg: {method: "GET", params: {type: 'medias', id: "groupsImg"}, isArray: true},
	});
}]);