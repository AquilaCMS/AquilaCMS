var TerritoriesServices = angular.module("aq.territories.services", ["ngResource"]);


TerritoriesServices.factory("TerritoriesApi", ["$resource", function ($resource) {
	return $resource("v2/:terr/:action/:param", {}, {
		list	: {method: "POST"},
		update	: {method: "PUT"},
		remove	: {method: "DELETE"},
	});
}]);