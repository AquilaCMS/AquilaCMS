var InvoiceController = angular.module('aq.invoices.controllers', []);

InvoiceController.controller("InvoicesController", [
    "$scope", "$modal", "$filter", "Invoice", "InvoiceColumns", "$http", "$translate", '$rootScope', "toastService", '$location', "ExportCollectionCSV", function ($scope, $modal, $filter, Invoice, InvoiceColumns, $http, $translate, $rootScope, toastService, $location, ExportCollectionCSV) {
        $scope.columns = InvoiceColumns;
        $scope.currentPage = 1;
        $scope.page = 1;
        $scope.totalItems = 0;
        $scope.nbItemsPerPage = 12;
        $scope.maxSize = 10;
        $scope.filter = {};
        $scope.sort = { type: "createdAt", reverse: true };
        $scope.disabledButton = false;
        $scope.showLoader = true;

        function init() {
            $scope.sortType = "createdAt"; // set the default sort type
            $scope.sortReverse = true;  // set the default sort order
        }

        init();
        $scope.dateOptions = {
            "year-format": "'yyyy'", "starting-day": 1
        };

        $scope.generatePDF = function (invoice) {
            $scope.disabledButton = true;
            $http({
                method: 'POST',
                url: 'v2/bills/generatePDF',
                data: {
                    PostBody: {
                        structure: { "__v": 0 },
                        filter: { _id: invoice._id }
                    }
                },
                headers: { 'Content-Type': 'application/json' },
                responseType: 'blob'
            }).success(function (data, status, headers) {
                $scope.disabledButton = false;
                if (data.size === 0) {
                    toastService.toast('danger', $translate.instant("global.apiError"));
                    return;
                } else if (data.size === 20 || data.size === 28) {
                    data.text().then(msg => {
                        toastService.toast('danger', msg);
                    });
                    return;
                }
                headers = headers();
                let filename = `bill-${invoice.facture}.pdf`;
                let contentType = headers['content-type'];

                let linkElement = document.createElement('a');
                try {
                    let blob = new Blob([data], { type: contentType });
                    let url = window.URL.createObjectURL(blob);

                    linkElement.setAttribute('href', url);
                    linkElement.setAttribute("download", filename);

                    let clickEvent = new MouseEvent("click", {
                        "view": window,
                        "bubbles": true,
                        "cancelable": false
                    });
                    linkElement.dispatchEvent(clickEvent);
                } catch (ex) {
                    console.error(ex);
                }
            }).error(function (data) {
                $scope.disabledButton = false;
                if (data) {
                    if (data.translations) {
                        if (data.translations[$rootScope.adminLang]) {
                            toastService.toast('danger', data.translations[$rootScope.adminLang]);
                        } else {
                            toastService.toast('danger', $translate.instant("global.apiError"));
                        }
                    } else if (data.message) {
                        toastService.toast('danger', data.message);
                    } else if (data.code) {
                        toastService.toast('danger', data.code);
                    } else {
                        toastService.toast('danger', $translate.instant("global.apiError"));
                    }
                } else {
                    toastService.toast('danger', $translate.instant("global.apiError"));
                }
            });
        };

        $scope.goToOrder = function (invoice) {
            $location.path('/orders/' + invoice.order_id._id)
        }

        $scope.getInvoices = function (page) {
            var sort = {};
            sort[$scope.sort.type] = $scope.sort.reverse ? -1 : 1;
            $scope.currentPage = page;

            if ($scope.filter.order_id && $scope.filter.order_id.number === "") {
                delete $scope.filter.order_id;
            }

            const search = $scope.filter;
            let pageAdmin = { location: "invoices", page: 1 };
            if (window.localStorage.getItem("pageAdmin") !== undefined && window.localStorage.getItem("pageAdmin") !== null) {
                pageAdmin = JSON.parse(window.localStorage.getItem("pageAdmin"));
            }

            if (pageAdmin.search && pageAdmin.search.order_id && pageAdmin.search.order_id.number === "") {
                delete pageAdmin.search.order_id;
            }

            if (page === undefined && pageAdmin.location === "invoices") {
                const pageSaved = pageAdmin.page;
                $scope.page = pageSaved;
                $scope.currentPage = pageSaved;
                page = pageAdmin.page;

                if (pageAdmin.search !== undefined && pageAdmin.search !== null) {
                    $scope.filter = pageAdmin.search;
                }
            } else {
                window.localStorage.setItem("pageAdmin", JSON.stringify({ location: "invoices", page, search }));
                $scope.page = page;
                $scope.currentPage = page;
                window.scrollTo(0, 0);
            }

            let filter = {};
            const filterKeys = Object.keys($scope.filter);
            for (let i = 0, leni = filterKeys.length; i < leni; i++) {
                if ($scope.filter[filterKeys[i]] === null) {
                    break;
                }
                if (filterKeys[i].includes("amount")) {
                    const key = filterKeys[i].split("_");
                    const value = $scope.filter[filterKeys[i]];
                    filter["payment.0.amount"] = {}
                    filter["payment.0.amount"][key[0] === "min" ? "$gte" : "$lte"] = Number(value);
                } else if (filterKeys[i].includes("min_") || filterKeys[i].includes("max_")) {
                    const key = filterKeys[i].split("_");
                    const value = $scope.filter[filterKeys[i]];

                    if (filter[key[1]] === undefined) {
                        filter[key[1]] = {};
                    }
                    filter[key[1]][key[0] === "min" ? "$gte" : "$lte"] = key[1].toLowerCase().includes("date") ? value.toISOString() : value;
                } else if (filterKeys[i].includes("avoir")) {
                    if ($scope.filter.avoir == "true") {
                        filter["avoir"] = true;
                    } else if ($scope.filter.avoir == "false") {
                        filter["avoir"] = false;
                    }
                } else {
                    if (typeof ($scope.filter[filterKeys[i]]) === 'object') {
                        filter[filterKeys[i] + ".number"] = { $regex: $scope.filter[filterKeys[i]].number, $options: "i" };
                    } else {
                        filter[filterKeys[i]] = { $regex: $scope.filter[filterKeys[i]].toString(), $options: "i" };
                    }
                }
            }

            const structure = {};
            $scope.columns.map((col) => {
                let field = col.cell.component_template
                structure[field.replace(/{{|}}|invoice\./ig, '')] = 1
            })
            Invoice.query({ PostBody: { filter, limit: $scope.nbItemsPerPage, page, populate: ['order_id'], structure } }, function (invoicesList) {
                $scope.showLoader = false;
                $scope.invoices = invoicesList.datas.map(function (invoice) {

                    invoice.type = (invoice.avoir ? "invoices-list.avoir" : "invoices-list.facture")
                    return invoice
                });
                $scope.totalItems = invoicesList.count;
            }, function (error) {
                console.error("Can't get data");
                console.error(error);
            });
        };

        setTimeout(function () { //Obligé de timer sinon la requete s'effectue deux fois à cause du on-select-page du html
            $scope.getInvoices();
        }, 100);

        $scope.export = ExportCollectionCSV;
    }
]);