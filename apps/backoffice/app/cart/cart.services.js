var CartServices = angular.module("aq.cart.services", ["ngResource"]);


CartServices.service("Carts", [
    "$resource", function ($resource)
    {
        return $resource("v2/:carts/:action/:param", {}, {
            list    : {method: "POST", param: {carts: 'carts'}},
            getCarts: {method: "GET", params: {carts: 'cart', action: 'user'}, isArray: true},
            details : {method: "POST", param: {carts: 'cart', param:'5c3484d9fd68d000681e267e'}},
        });
    }
]);
