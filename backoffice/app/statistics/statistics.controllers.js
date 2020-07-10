angular.module("aq.statistics.controllers", []).value("googleChartApiConfig", {
    version          : "1",
    optionalSettings : {
        packages : ["corechart"],
        language : "fr"
    }
}).controller("StatisticsCtrl", ["$scope", "$http", "$location"/* , "googleChartApiPromise" */,"toastService","Statistics", function ($scope, $http, $location/* , googleChartApiPromise */,toastService,Statistics) {
    $scope.obj                   = {};
    $scope.obj.loading           = true;
    $scope.filter                = {};
    $scope.filter.granularity    = "day";
    $scope.filter.dateStart      = moment().add(-7, "day");
    $scope.filter.dateEnd        = moment();
    const isPageSell               = $location.path().endsWith("sells");
    let currentRoute             = isPageSell ? "canceledCart" : "newCustomer";
    //$scope.downloadLink = '';


    /**
     * Changement d onglets
     */
    $scope.changeTab = function (tabName) {
        currentRoute = tabName;
        setTimeout(function () { $scope.loadDatas(); }, 300);
    };

    /**
     * Charge les stats (non globale)
     */
    $scope.loadDatas = function () {
        $scope.obj.loading = true;
        const {dateStart, dateEnd} = getDates();
        const parameters = `granularity=${$scope.filter.granularity}&dateStart=${dateStart}&dateEnd=${dateEnd}`;
        const formatDate = $scope.filter.granularity === "day" ? "DD/MM/YYYY" : "MM/YYYY";
        $http({url: `/v2/statistics/${isPageSell ? 'sell' : 'customer'}/${currentRoute}?${parameters}`, method: 'GET'}).then((response) => {
            if (currentRoute !== "topCustomer" && currentRoute !== "capp") {
                if(response.data.datas){
                    for (let i = 0, _len = response.data.datas.length; i < _len; i++) {
                        response.data.datas[i].c[0].v = moment(response.data.datas[i].c[0].v).format(formatDate);
                    }
                }
            }

            if (isPageSell) {
                $scope.charts.orders[currentRoute].data.rows = response.data.datas;
            } else {
                $scope.charts.clients[currentRoute].data.rows = response.data.datas;
            }
            $scope.obj.loading = false;
        }, function errorCallback(response) {
            console.log(response);
            $scope.obj.loading = false;
        });
    };

    /**
     * Format les dates
     */
    let getDates = function () {
        const dateStart = moment($scope.filter.dateStart).format("YYYY-MM-DD");
        const dateEnd = moment($scope.filter.dateEnd).format("YYYY-MM-DD");

        return {dateStart, dateEnd};
    };


    /**
     * Download datas : DONE/TODO P2 : Permettre de pouvoir télécharger une stats affiché sur le back
     */
    $scope.downloadDatas = function (datas) {
        $scope.obj.loading = true;
        const {dateStart, dateEnd} = getDates();
        const parameters = `granularity=${$scope.filter.granularity}&dateStart=${dateStart}&dateEnd=${dateEnd}`;
        const formatDate = $scope.filter.granularity === "day" ? "DD/MM/YYYY" : "MM/YYYY";
        $http({url: `/v2/statistics/${isPageSell ? 'sell' : 'customer'}/${currentRoute}?${parameters}`, method: 'GET'}).then((response) => {
            Statistics.generate({params: response.data.datasObject, currentRoute}, function (response) {
                if(response.file && response.csv) {
                    const filename = response.file;
                    const linkElement = document.createElement("a");
                    try {
                        const blob = new Blob([response.csv]);
                        const url = window.URL.createObjectURL(blob);
                        linkElement.setAttribute("href", url);
                        linkElement.setAttribute("download", filename);
                        const clickEvent = new MouseEvent("click", {"view": window, "bubbles": true, "cancelable": false});
                        linkElement.dispatchEvent(clickEvent);
                    }
                    catch(err) {
                        toastService.toast("danger", "Une erreur s'est produite lors de la génération du fichier .csv");
                    }
                } else {
                    toastService.toast("danger", "Pas d'informations a exporter");
                }
            });
            $scope.obj.loading = false;
        }, function errorCallback(response) {
            console.log(response);
            $scope.obj.loading = false;
        });
    };

    /**
     * Load global datas if needed
     */
    loadGlobalStats = function () {
        if ($location.path().endsWith("statistics")) {
            $http({url: '/v2/statistics/globale', method: 'GET'}).then((response) => {
                $scope.adminStats = response.data;
                $scope.toJSON = '';
                $scope.toJSON = angular.toJson($scope.adminStats);
                //const blob = new Blob([$scope.toJSON], {type: "application/json;charset=utf-8;"});
                //$scope.downloadLink = (window.URL || window.webkitURL).createObjectURL(blob);
                $scope.obj.loading = false;
            });
            return true;
        }
    };

    // --- Start here ----
    if (!loadGlobalStats()) { // On charge les data global si besoin
        $scope.loadDatas(); // Sinon les autres
    }


    $scope.charts = {
        clients : {
            newCustomer : {
                type    : "ColumnChart",
                options : {
                    curveType : 'function',
                    title     : "Nombre de créations de compte",
                    legend    : "none",
                    hAxis     : {
                        title : "Date"
                    },
                    vAxis : {
                        title      : "Comptes",
                        format     : "#,###",
                        minValue   : 0,
                        viewWindow : {
                            min : 0
                        }
                    },
                    height : 600
                },
                data : {
                    cols : [
                        {id: "dates", label: "Dates", type: "string"},
                        {id: "clients", label: "Comptes", type: "number"}
                    ],
                    rows : []
                }
            },
            // End New
            topCustomer : {
                type    : "Table",
                options : {
                    curveType : 'function',
                    title     : "Top clients par CA",
                    legend    : "none",
                    hAxis     : {
                        title : "Customer"
                    },
                    vAxis : {
                        title  : "CA Net €",
                        format : "#,###"
                    }
                },
                data : {
                    cols : [
                        {id: "customer", label: "Customer", type: "string"},
                        {id: "canet", label: "CA Net €", type: "number"}
                    ],
                    rows : []
                }
            }
            // End topCustomer
        },
        // End Clients
        orders : {
            canceledCart : {
                type    : "ColumnChart",
                options : {
                    curveType : 'function',
                    title     : "Abandons de paniers",
                    legend    : "none",
                    hAxis     : {
                        title : "Date"
                    },
                    vAxis : {
                        title      : "Paniers",
                        format     : "#.#",
                        minValue   : 0,
                        viewWindow : {
                            min : 0
                        }
                    }
                },
                data : {
                    cols : [
                        {id: "dates", label: "Dates", type: "string"},
                        {id: "cart", label: "Paniers", type: "number"}
                    ],
                    rows : []
                }
            },
            // End Test
            cag : {
                type    : "LineChart", // LineChart | ColumnChart | Table
                options : {
                    curveType : 'function',
                    title     : "Chiffre affaire global",
                    legend    : "none",
                    hAxis     : {
                        title : "Date"
                    },
                    vAxis : {
                        title      : "CA Net €",
                        format     : "#,###",
                        minValue   : 0,
                        viewWindow : {
                            min : 0
                        }
                    }
                },
                data : {
                    cols : [
                        {id: "dates", label: "Dates", type: "string"},
                        {id: "ca", label: "CA Net €", type: "number"}
                    ],
                    rows : []
                }
            },
            // End cag
            capp : {
                type    : "Table",
                options : {
                    allowHtml     : true,
                    curveType     : 'function',
                    title         : "Chiffre d'affaire par produits",
                    sortColumn    : 6,
                    sortAscending : false
                },
                data : {
                    cols : [
                        {id: "id", label: "id", type: "string"},
                        {id: "name", label: "Product name", type: "string"},
                        {id: "photo", label: "Image", type: "string"},
                        {id: "puht", label: "PU HT €", type: "number"},
                        {id: "puttc", label: "PU TTC €", type: "number"},
                        {id: "nbordered", label: "Nombre cdé", type: "number"},
                        {id: "caht", label: "CA HT €", type: "number"},
                        {id: "cattc", label: "CA TTC €", type: "number"}
                    ],
                    rows : []
                }
            },
            // End capp
            nbOrder : {
                type    : "LineChart",
                options : {
                    // curveType: 'function',
                    title  : "Nombre de commandes",
                    legend : "none",
                    hAxis  : {
                        title : "Date"
                    },
                    vAxis : {
                        title      : "Commandes",
                        format     : "#,###",
                        minValue   : 0,
                        viewWindow : {
                            min : 0
                        }
                    }
                },
                data : {
                    cols : [
                        {id: "dates", label: "Dates", type: "string"},
                        {id: "orders", label: "Commandes", type: "number"}
                    ],
                    rows : []
                }
            }
            // End nbOrder
        }
        // End orders

    };
}]);
