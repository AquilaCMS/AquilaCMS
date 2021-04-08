angular.module("aq.modules.services", ["ngResource"]).factory("ModulesService", [
    "$resource", function ($resource) {
        return $resource("v2/:route/:action", {}, {
            list: {method: "POST", params: {route: "modules"}},
            toggle: {method: "PUT", params: {route: "modules", action: "toggle"}},
            md: {method: "POST", params: {route: "modules", action: "md"}}
        });
    }
]).factory("ModuleService", [
    "$resource", function ($resource) {
        return $resource("v2/module/:id/:action", {}, {
            get: {method: "POST"},
            check: {method: "POST", params: {id: "@id", action: "check"}},
            setConfig: {method: "PUT", params: {id: "@id", action: "config"}},
            delete: {method: "DELETE", params: {id: "@id"}},
            md: {method: "POST", params: {id: "@id", action: "md"}}
        })
    }
]);