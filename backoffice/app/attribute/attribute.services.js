var AttributeServices = angular.module("aq.attribute.services", []);

AttributeServices.factory("Attribute", [
    "$resource", function ($resource)
    {
        return $resource("attributes/:attributeCode", {}, {
            get: {method: "GET", params: {attributeCode: ""}},
            save: {method: "POST", params: {}},
            queryClassed: {method: "GET", isArray: true},
            remove: {method: "DELETE", params: {attributeCode: ""}}
        });
    }
]);
AttributeServices.factory("AttributesV2", [
    "$resource", function ($resource)
    {
        return $resource("v2/:type/:id", {}, {
            list: {method: "POST", params: {type: 'attributes'}},
            query: {method: "POST", params: {type: 'attribute'}},
            save: {method: "PUT", params: {type: 'attribute'}},
            delete: {method: "DELETE", params: {type: 'attribute'}},
        });
    }
]);

AttributeServices.factory("AttributeId", [
    "$resource", function ($resource)
    {
        return $resource("attributes/fOne", {}, {
            fOne: {method: "POST", params: {}}, queryOrphans: {method: "GET", isArray: true}
        });
    }
]);

AttributeServices.service("AttributesFields", function ()
{
    return [];
});