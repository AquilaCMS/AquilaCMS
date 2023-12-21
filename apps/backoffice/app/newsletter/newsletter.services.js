var NewsletterServices = angular.module("aq.newsletter.services", ["ngResource"]);


NewsletterServices.service("NewsletterV2", [
    "$resource", function ($resource)
    {
        return $resource("v2/:route/:action", {}, {
            list: {method: "POST", params: {route: "newsletters"}},
            query: {method: "POST", params: {route: "newsletter"}},
            save: {method: "PUT", params: {route: "newsletter"}}
        });
    }
]);