"use strict";

/* Services */
// paid / payment_confirmation_pending / billed / delivery_progress / delivery_partial_progress / returned
var adminCatagenServices = angular.module("adminCatagenServices", ["ngResource"]);

adminCatagenServices.service("NSConstants", function () {
    return {
        productTypes: [
            {code: "simple", name: "Simple"},
            {code: "bundle", name: "Composé"},
            {code: "virtual", name: "Dematérialisé"}
        ],
        orderStatus: 
            {
                translation: {
                    fr:[
                        { code: "PAYMENT_PENDING", name: "En attente de paiement" },
                        { code: "PAYMENT_FAILED", name: "Echec de paiment" },
                        { code: "PAYMENT_RECEIPT_PENDING", name: "En attente de réception de paiement" },
                        { code: "PAYMENT_CONFIRMATION_PENDING", name: "En attente de confirmation de paiement" },
                        { code: "PAID", name: "Payé" },
                        { code: "PROCESSING", name: "En cours de traitement" },
                        { code: "PROCESSED", name: "Préparé" },
                        { code: "BILLED", name: "Facturé" },
                        { code: "DELIVERY_PROGRESS", name: "Expédié" },
                        { code: "DELIVERY_PARTIAL_PROGRESS", name: "Expédié partiel" },
                        { code: "FINISHED", name: "Traité" },
                        { code: "CANCELED", name: "Annulé" },
                        { code: "RETURNED", name: "Retour et remboursement" },
                        { code: "ASK_CANCEL", name: "Annulation demandé par le client" }
                    ],
                    en:[
                        { code: "PAYMENT_PENDING", name: "Waiting for payment" },
                        { code: "PAYMENT_FAILED", name: "Payment failed" },
                        { code: "PAYMENT_RECEIPT_PENDING", name: "Waiting for payment reception" },
                        { code: "PAYMENT_CONFIRMATION_PENDING", name: "Waiting for payment confirmation" },
                        { code: "PAID", name: "Paid" },
                        { code: "PROCESSING", name: "Processing" },
                        { code: "PROCESSED", name: "Prepared" },
                        { code: "BILLED", name: "Billed" },
                        { code: "DELIVERY_PROGRESS", name: "Sent" },
                        { code: "DELIVERY_PARTIAL_PROGRESS", name: "Partially sent" },
                        { code: "FINISHED", name: "Processed" },
                        { code: "CANCELED", name: "Cancelled" },
                        { code: "RETURNED", name: "Return and refound" },
                        { code: "ASK_CANCEL", name: "Cancel order requested by customer" }

                    ]
                }
            }
        ,
        itemStatus: {
            PROCESSING: "En cours de traitement",
            DELIVERY_PROGRESS: "Expédié",
            DELIVERY_PARTIAL_PROGRESS: "Expédié partiel",
            RETURNED: "Retour",
            RETURNED_PARTIAL: "Retour partiel"
        },
        paymentStatus: [
            {name: "DONE", displayName: "Effectué"},
            {name: "TODO", displayName: "A effectuer"},
            {name: "FAILED", displayName: "Echoué"},
            {name: "CANCELED", displayName: "Annulé"}
        ],
        paymentModes: [
            {name: "cb", displayName: "CB"},
            {name: "cheque", displayName: "Chèque"},
            {name: "tranfer", displayName: "Virement"}
        ]
    }
});

adminCatagenServices.factory("logImport", [
    "$resource", function ($resource)
    {
        return $resource("logimport/:action", {}, {
            query: {method: "GET", params: {action: ""}, isArray: true}, getStatus: {method: "GET", params: {action: "status"}, isArray: false}
        });
    }
]);

adminCatagenServices.factory("Cart", [
    "$resource", function ($resource)
    {
        return $resource("cart/:action", {}, {
            save: {method: "POST", params: {action: ""}},
            update: {method: "POST", params: {action: "upd"}},
            remove: {method: "POST", params: {action: "rmv"}},
            getList: {method: "GET", params: {action: "getList"}, isArray: true},
            toOrderOverride: {method: "POST", params: {action: "toOrderOverride"}}
        });
    }
]);

adminCatagenServices.factory("TerritoryCountries", [
    "$resource", function ($resource)
    {
        return $resource("/v2/territories", {}, {
            query: {method: "POST", isArray: false}
        });
    }
]);

adminCatagenServices.factory("Payment", [
    "$resource", function ($resource)
    {
        return $resource("v2/payments/:type", {}, {
            query: {method: "POST", params: {type: 'order'}},
            export: {method: "POST", params: {type: 'export'}},
        });
    }
]);

adminCatagenServices.factory("Themes", [
    "$resource", function ($resource)
    {
        return $resource("themes/:name", {}, {
            useTheme: {method: "POST", params: {}, isArray: true}
        });
    }
]);

adminCatagenServices.factory("Territory", [
    "$resource", function ($resource)
    {
        return $resource("/territory/search/:name/:type", {}, {search: {method: "GET", isArray: true}});
    }
]);

adminCatagenServices.factory("User", [
    "$resource", function ($resource)
    {
        return $resource("users/:action/:userId", {}, {
            resetpassword: {method: "POST", params: {action: "resetpassword"}}
        });
    }
]);

adminCatagenServices.factory("CategoryByProduct", [
    "$resource", function ($resource)
    {
        return $resource("catByProduct/:productId", {}, {
            get: {method: "GET", params: {productId: ""}, isArray: true}
        });
    }
]);

adminCatagenServices.factory("ConfigUpdate", [
    "$resource", function ($resource)
    {
        return $resource("update/:url", {}, {
            query: {method: "GET", params: {url: ""}}
        });
    }
]);

adminCatagenServices.service("RulesV2", [
    "$resource",
    function ($resource)
    {
        return $resource("v2/:type/:id", {}, {
            list: {method: "POST", params: {type: "rules", id: ""}},
            query: {method: "POST", params: {type: "rule", id: ""}},
            save: {method: "PUT", params: {type: "rule", id: ""}},
            delete: {method: "DELETE", params: {type: "rule"}},
        });
    }
]);

adminCatagenServices.service("ProductV2", [
    "$resource",
    function ($resource)
    {
        return $resource(
            "v2/:action/:withFilters",
            {},
            {
                list: {method: "POST", params: {action: 'products'}, isArray: false},
                listWithFilters: {method: "POST", params: {action: 'products', withFilters: true}, isArray: false},
                duplicate: {method: "POST", params: {action: 'product', withFilters: 'duplicate'}, isArray: false}
            }
        );
    }
]);

adminCatagenServices.service("toastService", function ()
{
    var service = {};

    var options = {
        allow_dismiss: true, newest_on_top: true, showProgressbar: false
    };

    // Toastr
    service.toast = function (type, message)
    {
        options.type = type;

        $.notify({
            message: message
        }, options);

    };

    return service;
});
adminCatagenServices.factory("ExportCollectionCSV", [
    "$http", "toastService", function ($http, toastService)
    {
        const exportToCSV = function (collection, PostBody)
        {
            $http({
                method: "POST",
                url: `v2/export/csv/${collection}`,
                headers: {"Content-Type": "application/json"},
                data: {PostBody}
                // responseType: "blob"
            }).success(function (data, status, headers)
            {
                headers = headers();
                const filename = data.file;
                const linkElement = document.createElement("a");
                try {
                    
                    linkElement.setAttribute("href", '/temp/' + data.url + '.csv');
                    linkElement.setAttribute("download", filename);
                    const clickEvent = new MouseEvent("click", {"view": window, "bubbles": true, "cancelable": false});
                    linkElement.dispatchEvent(clickEvent);
                }
                catch(err) {
                    console.error(err);
                }
            });
        };
        return exportToCSV;
    }
]);


adminCatagenServices.factory("ProductClass", [
    "Product", function (Product)
    {
        var ProductClass = function (product)
        {
            angular.merge(this, product);
        };
        ProductClass.prototype = {
            getProductObject: function ()
            {
                return {
                    active: false, _visible: false, trademark: {}, supplier: {
                        reference: null
                    }, details: {
                        images: []
                    }
                };
            },
            saveProduct: function (product)
            {
                return Product.save(product).$promise;
            }
        };
        return ProductClass;
    }
]);

adminCatagenServices.service("MenusList", function ()
{
    return [];
});

adminCatagenServices.service("MenusCatalogList", function ()
{
    return [];
});

adminCatagenServices.factory("ConfirmDeleteModal", [
    "$modal", function ($modal)
    {
        return function (options)
        {

            return $modal.open({
                templateUrl: "views/modals/confirm-delete.html",
                controller: "ConfirmDeleteCtrl",
                resolve: {
                    okAction: function ()
                    {
                        return options.okAction;
                    }
                }
            });

        };
    }
]);