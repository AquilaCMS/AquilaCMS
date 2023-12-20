const ContactServices = angular.module("aq.contact.services", ["ngResource"]);


ContactServices.service("Contact", [
    "$resource", function ($resource) {
        return $resource("v2/contacts", {}, {
            list : {method: "POST", param: {}}
        });
    }
]);

ContactServices.service("OneContact", [
    "$resource", function ($resource) {
        return $resource("v2/contact/:id", {}, {
            delete : {method: "DELETE", param: {}}
        });
    }
]);