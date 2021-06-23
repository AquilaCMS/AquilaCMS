var OptionsServices = angular.module("aq.options.services", []);

OptionsServices.service("OptionsServices", [
    "$resource", function ($resource) {
        return $resource("v2/:route/:action", {}, {
            list: { method: "POST", params: { route: "options", action: "list" } },
            get: { method: "POST", params: { route: "options", action: "get" } },
            set: { method: "POST", params: { route: "options", action: "set" } }
        });
    }
]);