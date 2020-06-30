var ProductReviewsServices = angular.module("aq.productReviews.services", ["ngResource"]);

ProductReviewsServices.factory("ProductReviewPagination", [
    "$resource", function ($resource) {
        return $resource("v2/product/reviews/aggregate", {}, {
            query: {method: "POST", params: {}}
        });
    }
]);

ProductReviewsServices.factory("ProductReviewById", [
    "$resource", function ($resource) {
        return $resource("v2/product", {}, {
            query: {method: "POST", params: {}}
        });
    }
]);

ProductReviewsServices.factory("ProductReviewService", [
    "$resource", function ($resource) {
        return $resource("v2/product/:id/:options/:option", {}, {
            save: {method: "PUT", params: {}},
            delete: {method: "DELETE", params: {id: "", options:"review", option:""}},
        });
    }
]);

