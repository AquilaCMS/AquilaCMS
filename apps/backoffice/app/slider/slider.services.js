angular.module('aq.slider.services', ['ngResource']).factory("SliderService", [
    "$resource", function ($resource)
    {
        return $resource("/v2/:route/:id", {}, {
            list: {method: "POST", params: {route: "sliders"}},
            detail: {method: "POST", params: {route: "slider"}},
            save: {method: "PUT", params: {route: "slider"}},
            delete: {method: "DELETE", params: {route: "slider", id: ""}}
        });
    }
]).factory("SliderItemService", [
    "$resource", function ($resource)
    {
        return $resource("/v2/slider/:id/:itemId", {}, {
            save: {method: "PUT", params: {id: "", itemId: "item"}},
            saveSlider: {method: "PUT", params: {id: "", itemId: ""}},
            delete: {method: "DELETE", params: {id: "", itemId: ""}}
        });
    }
]);
