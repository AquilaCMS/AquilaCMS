var OrderServices = angular.module("aq.order.services", ["ngResource"]);

OrderServices.service("Order", [
    "$resource", function ($resource)
    {
        return $resource("orders/:action/:orderId", {}, {
            query: {method: "GET", params: {orderId: "", action: ""}, isArray: true},
            update: {method: "POST", params: {action: ""}},
            getByClient: {method: "GET", params: {action: "user"}, isArray: true},
            updatePayment: {method: "POST", params: {action: "payment"}},
            cancelItem: {method: "POST", params: {action: "cancelitem"}},
            transfertToSaga: {method: "GET", params: {action: "transfertToSaga"}},
            getSagaQuotation: {method: "GET", params: {action: "getSagaQuotation"}},
            cancelOrder: {method: "POST", params: {action: "cancel"}},
            updateStatus: {method: "PUT", params: {action: "status"}}
        });
    }
]);

OrderServices.service("Orders", [
    "$resource", function ($resource)
    {
        return $resource("v2/:route/:action", {}, {
            list: {method: "POST", params: {route: "orders"}},
            rma: {method: "POST", params: {route: "order", action: "rma"}},
            infoPayment: {method: "POST", params: {route: "order", action: "infoPayment"}},
            addPkg: {method: "POST", params: {route: "order", action: "addpkg"}},
            delPkg: {method: "POST", params: {route: "order", action: "delpkg"}},
            save: {method: "PUT", params: {route: "order"}},
            updateStatus: {method: "PUT", params: {route: "order", action: 'updateStatus'}},
            cancelOrder: {method: "POST", params: {route: "order", action: 'cancelOrder'}},
        });
    }
]);

OrderServices.service("OrderFields", function ()
{
    return [];
});

OrderServices.service("OrderMondialRelay", function ()
{
    return [];
});

OrderServices.service("OrderColumns", function ()
{
    return [];
});

