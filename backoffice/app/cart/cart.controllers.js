var CartControllers = angular.module("aq.cart.controllers", []);

CartControllers.controller("CartListCtrl", [
    "$scope", "Carts", "$location", function ($scope, Carts, $location) {

        $scope.carts = [];
        $scope.page = 1;
        $scope.currentPage = 1;
        $scope.totalItems = 0;
        $scope.nbItemsPerPage = 15;
        $scope.filter = {};
        $scope.showLoader = true;

        $scope.getCarts = function (page) {

            $scope.currentPage = page;

            const search = $scope.filter;
            let pageAdmin = { location: "carts", page: 1 };
            if (window.localStorage.getItem("pageAdmin") !== undefined && window.localStorage.getItem("pageAdmin") !== null) {
                pageAdmin = JSON.parse(window.localStorage.getItem("pageAdmin"));
            }
            if (page === undefined && pageAdmin.location === "carts") {
                const pageSaved = pageAdmin.page;
                $scope.page = pageSaved;
                $scope.currentPage = pageSaved;
                page = pageAdmin.page;

                if (pageAdmin.search !== undefined && pageAdmin.search !== null) {
                    $scope.filter = pageAdmin.search;
                }
            } else {
                window.localStorage.setItem("pageAdmin", JSON.stringify({ location: "carts", page, search }));
                $scope.page = page;
                $scope.currentPage = page;
                window.scrollTo(0, 0);
            }

            let filter = {};
            cleanEmptyProperties($scope.filter);

            const filterKeys = Object.keys($scope.filter);
            for (let i = 0, leni = filterKeys.length; i < leni; i++) {


                if (filterKeys[i].includes("amount")) {
                    const key = filterKeys[i].split("_");
                    const value = $scope.filter[filterKeys[i]];
                    filter["payment.0.amount"] = {}
                    filter["payment.0.amount"][key[0] === "min" ? "$gte" : "$lte"] = value;
                } else if (filterKeys[i].includes("min_") || filterKeys[i].includes("max_")) {
                    if (!filter["priceTotal.ati"]){
                        filter["priceTotal.ati"] = {};
                    }
                    if (filterKeys[i] === 'min_priceTotal'){
                        filter["priceTotal.ati"]["$gte"] = $scope.filter[filterKeys[i]];
                        break
                    }
                    if (filterKeys[i] === 'max_priceTotal') {
                        filter["priceTotal.ati"]["$lte"] = $scope.filter[filterKeys[i]];
                        break
                    }
                    const key = filterKeys[i].split("_");
                    const value = $scope.filter[filterKeys[i]];

                    if (filter[key[1]] === undefined) {
                        filter[key[1]] = {};
                    }
                    filter[key[1]][key[0] === "min" ? "$gte" : "$lte"] = key[1].toLowerCase().includes("date") ? value.toISOString() : value;
                } else {
                    if (filterKeys[i] === 'email') {
                        filter["customer.email"] = { $regex: $scope.filter[filterKeys[i]].toString(), $options: "i" };
                    } else if (filterKeys[i] === 'priceTotal') {
                        filter["priceTotal.ati"] = { $regex: $scope.filter[filterKeys[i]].ati, $options: "i" };
                    } else {
                    filter[filterKeys[i]] = { $regex: $scope.filter[filterKeys[i]].toString(), $options: "i" };
                    }
                }
            }

            Carts.list({ carts: 'carts' }, {
                PostBody: {
                    filter,
                    structure: { updatedAt: 1 },
                    limit: $scope.nbItemsPerPage,
                    page: page,
                    populate: ['customer.id'],
                    sort: {
                        updatedAt: 1
                    }
                }
            },function (response) {
                $scope.showLoader = false;
                $scope.carts = response.datas;
                $scope.totalItems = response.count;
            }, function(error) {
                console.error("Can't get data");
                console.error(error);
            });
        };

        setTimeout(function () { //Obligé de timer sinon la requete s'effectue deux fois à cause du on-select-page du html
            $scope.getCarts();
        }, 100);



        $scope.filterOnLength = function (item) {
            return item.items.length > 0;
        };


        $scope.goToCartDetails = function (cartId) {
            $location.path("/cart/" + cartId);
        };


    }
]);





CartControllers.controller("CartListDetails", [
    "$scope", "Carts", "$location", "$routeParams", function ($scope, Carts, $location, $routeParams) {

        $scope.cart = {};

        $scope.getCart = function (page) {
            Carts.details({ carts: 'cart', param: $routeParams.cartId }, {
                PostBody: {
                    populate: ['customer.id']
                }
            }, function (response) {
                $scope.cart = response;
            }, function (response) {
                $location.path("/cart");
            });
        };

        $scope.getCart();
    }
]);
