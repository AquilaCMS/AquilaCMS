const PaymentControllers = angular.module("aq.payment.controllers", []);

PaymentControllers.controller("PaymentListCtrl", [
    "$scope", "$modal", "$filter", "Payment", "NSConstants", "$http", function ($scope, $modal, $filter, Payment, NSConstants, $http) {
        $scope.paymentStatus = NSConstants.paymentStatus;
        $scope.listPayment = [];
        $scope.currentPage = 1;
        $scope.page = 1;
        $scope.totalItems = 0;
        $scope.nbItemsPerPage = 12;
        $scope.maxSize = 10;
        $scope.filter = {};
        $scope.sort = {type: "payment.operationDate", reverse: true};
        $scope.dateOptions = {"year-format": "'yyyy'", "starting-day": 1};
        $scope.queryOrderStatus = {statusTodo: false, statusDone: false, statusCanceled: false, statusFailed: false};
        $scope.queryOrderType = {typeCredit: false, typeDebit: false};
        $scope.exportDates = {}

        $scope.getPayments = function (page) {

            const search = $scope.filter;
            let pageAdmin = { location: "payments", page: 1 };
            if (window.localStorage.getItem("pageAdmin") !== undefined && window.localStorage.getItem("pageAdmin") !== null) {
                pageAdmin = JSON.parse(window.localStorage.getItem("pageAdmin"));
            }
            if (page === undefined && pageAdmin.location === "payments") {
                const pageSaved = pageAdmin.page;
                $scope.page = pageSaved;
                $scope.currentPage = pageSaved;
                page = pageAdmin.page;

                if (pageAdmin.search !== undefined && pageAdmin.search !== null) {
                    $scope.filter = pageAdmin.search;
                }
            } else {
                window.localStorage.setItem("pageAdmin", JSON.stringify({ location: "payments", page, search }));
                $scope.page = page;
                $scope.currentPage = page;
                window.scrollTo(0, 0);
            }

            let filter = {};
            const sort = {};
            sort[$scope.sort.type] = $scope.sort.reverse ? -1 : 1;
            $scope.currentPage = page;

            cleanEmptyProperties($scope.filter);

            const filterKeys = Object.keys($scope.filter);
            for (let i = 0, leni = filterKeys.length; i < leni; i++) {
                if (filterKeys[i].includes("amount")) {
                    const key = filterKeys[i].split("_");
                    const value = $scope.filter[filterKeys[i]];
                    filter["payment.amount"] = {}
                    filter["payment.amount"][key[0] === "min" ? "$gte" : "$lte"] = value;
                } else if (filterKeys[i].includes("min_") || filterKeys[i].includes("max_")) {
                    const key = filterKeys[i].split("_");
                    const value = $scope.filter[filterKeys[i]];

                    if (filter[key[1]] === undefined) {
                        filter[key[1]] = {};
                    }
                    filter[key[1]][key[0] === "min" ? "$gte" : "$lte"] = key[1].toLowerCase().includes("date") ? value.toISOString() : value;
                } else {
                    filter[filterKeys[i]] = {$regex: $scope.filter[filterKeys[i]].toString(), $options: "i"};
                }
            }

            Payment.query({PostBody: {filter, structure: {payment: 1}, sort, page, limit: $scope.nbItemsPerPage}}, function (data) {
                const _orders = data.datas;
                $scope.totalItems = data.count;
                $scope.listPayment = [];

                for (let i = 0, leni = _orders.length; i < leni; i++) {
                    let item = {};
                    if(_orders[i].payment.length !== 0){
                        item = {
                            _id           : _orders[i]._id,
                            number        : _orders[i].number,
                            customer      : _orders[i].customer,
                            addresses     : _orders[i].addresses,
                            creationDate  : _orders[i].payment.creationDate,
                            operationDate : _orders[i].payment.operationDate,
                            status        : _orders[i].payment.status,
                            mode          : _orders[i].payment.mode,
                            transactionId : _orders[i].payment.transactionId,
                            type          : _orders[i].payment.type,
                            amount        : _orders[i].payment.amount ? _orders[i].payment.amount : _orders[i].priceTotal.ati,
                            id_payment    : _orders[i].payment._id,
                            auto          : _orders[i].payment.auto,
                            comment       : _orders[i].payment.comment
                        };
                        $scope.listPayment.push(item);
                    }

                }
            });
        };

        setTimeout(function () { //Obligé de timer sinon la requete s'effectue deux fois à cause du on-select-page du html
            $scope.getPayments();
        }, 100);

    }
]);
