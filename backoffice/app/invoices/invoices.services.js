var InvoicesServices = angular.module('aq.invoices.services', ['ngResource']);

InvoicesServices.factory("Invoice", [
    "$resource", function ($resource) {
        return $resource("v2/bills/:action/:id", {}, {
            query: { method: "POST", params: {} },
            orderToBill: { method: "POST", params: { action: 'fromOrder' } }
        });
    }
]);

adminCatagenServices.service("InvoiceColumns", function () {
    return [];
});