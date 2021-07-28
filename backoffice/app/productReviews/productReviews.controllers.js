var ProductReviewsControllers = angular.module("aq.productReviews.controllers", []);

// product
ProductReviewsControllers.controller("ProductReviewListCtrl", [
    "$scope", "$location", "ProductReviewPagination",
    function ($scope, $location, ProductReviewPagination) {
        $scope.local = {
            currentPage: 1,
            nbItemsPerPage: 12,
            maxSize: 10,
            totalItems: null,
            sortType: null,
            sortReverse:null,
            reviews: [],
            filter: {"reviews.datas": {$ne: []}}
        };

        $scope.detail = function(review){
            $location.url(`/reviews/${review.reviews.datas._id}`);
        };
        $scope.getProductReviews = function(currentPage, initReq = false){

            var params = {page: currentPage, limit: $scope.local.nbItemsPerPage};
            cleanEmptyProperties($scope.local.filter);

            if(Object.keys($scope.local.filter).length > 0)
            {
                params.filter = {};
                params.match = {};

                var filterKeys = Object.keys($scope.local.filter);
                for(var i = 0; i < filterKeys.length; i++)
                {
                    if(filterKeys[i] === "rate")
                    {
                        params.match["reviews.datas.rate"] = $scope.local.filter[filterKeys[i]];
                    }
                    else if(filterKeys[i] === "visible")
                    {
                        params.match["reviews.datas.visible"] = $scope.local.filter[filterKeys[i]] === "true";
                    }
                    else if(filterKeys[i] === "verify")
                    {
                        params.match["reviews.datas.verify"] = $scope.local.filter[filterKeys[i]] === "true";
                    }
                    else if (filterKeys[i] === "code")
                    {
                        params.filter[filterKeys[i]] = {$regex: $scope.local.filter[filterKeys[i]], $options: "i"};
                    }
                    else if (filterKeys[i] === "name")
                    {
                        params.match["translation.en.name"] = {$regex: $scope.local.filter[filterKeys[i]], $options: "i"};
                    }
                }
            }
            params.sortObj = {};
            if($scope.local.sortReverse)
            {
                params.sortObj[$scope.local.sortType] = -1;
            }
            else
            {
                params.sortObj[$scope.local.sortType] = 1;
            }
            // Pour la premiere requete on triera par avis non vérifié et date la plus récente
            if(initReq){
                params.sortObj = {
                    "reviews.datas.verify": 1,
                    "reviews.datas.review_date": -1
                };
            }
            ProductReviewPagination.query(params,(dataReviews) => {
                $scope.local.reviews = dataReviews.datas;
                $scope.local.totalItems = dataReviews.count;
            },(err)=>{
                console.error(err);
            })
        };
        $scope.getMomentDate = function(review_date){
            return moment(review_date).format('DD/MM/YYYY - HH:mm');
        }
        $scope.getProductReviews($scope.local.currentPage, true);
    }
]);




/**
 * Controller de la page contenant le detail d'un Promo
 */
PromoControllers.controller('ProductReviewDetailCtrl', [
              '$scope', '$q', '$routeParams', '$location', 'toastService', 'ProductReviewService', 'ProductReviewById', '$translate',
    function ($scope, $q, $routeParams, $location, toastService, ProductReviewService, ProductReviewById, $translate) {
        $scope.local = {
            product: null,
            review: null,
            idxReview: null,
        };
        // Permet de recupérer une promo en fonction de son id
        $scope.GetReviewById = function () {
            const PostBody = {
                "filter":{"reviews.datas._id" : $routeParams.reviewId},
                "structure":{"reviews": 1, "code": 1}
            };
            ProductReviewById.query({PostBody, keepReviews: true}, function (product) {
                $scope.local.product = product;
                const idxReview = product.reviews.datas.findIndex((review) => review._id === $routeParams.reviewId);
                $scope.local.idxReview = idxReview;
                $scope.local.review = product.reviews.datas[idxReview];
            });
        };


        //Ajout ou update d'une promo
        $scope.save = function (isQuit) {
            $scope.local.product.reviews.datas[$scope.local.idxReview] = $scope.local.review;
            var deferred = $q.defer();
            ProductReviewService.save($scope.local.product, function (response) {
                deferred.resolve(response);
            }, function (err) {
                if(err.data && err.data.translations) return deferred.reject(err.data.translations.fr);
                return deferred.reject(err);
            });
            deferred.promise.then(function (response) {
                if (isQuit) $location.path("/reviews");
                else {
                    toastService.toast("success", $translate.instant("productReviews.detail.noticeSaved"));
                    $location.path("/reviews/" + $scope.local.review._id);
                }
            }, function (err) {
                if (err) toastService.toast("danger", err);
                else toastService.toast("danger", err);
            });
        };

        $scope.removeReviews = function (_id) {
            if (confirm($translate.instant("confirm.deleteReview")))
            {
                ProductReviewService.delete({id:$scope.local.product._id, option:_id}, function (response) {
                    toastService.toast("success", $translate.instant("productReviews.detail.promoDelete"));
                    $location.path("/reviews");
                }, function (err) {
                    toastService.toast("danger", err.data.translations.fr);
                });
            }
        }



        $scope.GetReviewById();
        $scope.formatMoment = function (date){
            return moment(date).format('DD/MM/YYYY HH:MM');
        }
    }
]);
