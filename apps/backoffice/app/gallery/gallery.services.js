angular.module('aq.gallery.services', ['ngResource']).factory("GalleryService", [
    "$resource", function ($resource)
    {
        return $resource("/v2/:route/:id", {}, {
            list: {method: "POST", params: {route: "galleries"}},
            detail: {method: "GET", params: {route: "gallery", id: ""}},
            save: {method: "PUT", params: {route: "gallery"}},
            delete: {method: "DELETE", params: {route: "gallery", id: ""}}
        });
    }
]).factory("GalleryItemService", [
    "$resource", function ($resource)
    {
        return $resource("/v2/gallery/:id/:itemId", {}, {
            save: {method: "PUT", params: {id: "", itemId: "item"}},
            saveAll: {method: "PUT", params: {id: "", itemId: "items"}},
            delete: {method: "DELETE", params: {id: "", itemId: ""}}
        });
    }
]);