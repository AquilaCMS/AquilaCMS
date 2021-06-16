var optionsSetServices = angular.module("aq.optionsSet.services", ["ngResource"]);


optionsSetServices.service("OptionsSetServices", [
    "$resource", function ($resource) {
        return $resource("v2/:route/:action", {}, {
            list: { method: "POST", params: { route: "optionsSet", action: "list" } },
            get: { method: "POST", params: { route: "optionsSet", action: "get" } },
            set: { method: "POST", params: { route: "optionsSet", action: "set" } }
        });
    }
]);