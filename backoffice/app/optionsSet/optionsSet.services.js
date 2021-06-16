var optionsSetServices = angular.module("aq.optionsSet.services", ["ngResource"]);


optionsSetServices.service("optionsSetService", [
    "$resource", function ($resource) {
        return $resource("v2/:route/:action", {}, {
            list: { method: "POST", params: { route: "newsletters" } },
            get: { method: "POST", params: { route: "newsletter" } },
            set: { method: "PUT", params: { route: "newsletter" } }
        });
    }
]);