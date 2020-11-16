var OrderControllers = angular.module("aq.order.controllers", []);

OrderControllers.controller("OrderListCtrl", [
    "$scope", "$http", "Orders", "$location", "NSConstants", "OrderColumns", "ExportCollectionCSV","$rootScope", function ($scope, $http, Orders, $location, NSConstants, OrderColumns, ExportCollectionCSV, $rootScope)
    {
        $scope.columns = OrderColumns;
        $scope.orderStatus = NSConstants.orderStatus.translation[$rootScope.adminLang];
        $scope.orders = [];
        $scope.page = 1;
        $scope.currentPage = 1;
        $scope.totalItems = 0;
        $scope.nbItemsPerPage = 12;
        $scope.maxSize = 10;
        $scope.filter = {};
        $scope.sort = {type: "createdAt", reverse: true};
        $scope.export = ExportCollectionCSV;

        $scope.getOrders = function (page)
        {
            var filter = {};
            var sort = {};

            const search = $scope.filter;
            let pageAdmin = { location: "orders", page: 1 };
            if (window.localStorage.getItem("pageAdmin") !== undefined && window.localStorage.getItem("pageAdmin") !== null) {
                pageAdmin = JSON.parse(window.localStorage.getItem("pageAdmin"));
            }
            if (page === undefined && pageAdmin.location === "orders") {
                const pageSaved = pageAdmin.page;
                $scope.page = pageSaved || 1;
                $scope.currentPage = pageSaved;
                page = pageAdmin.page;

                if (pageAdmin.search !== undefined && pageAdmin.search !== null) {
                    $scope.filter = pageAdmin.search;
                }
            } else {
                window.localStorage.setItem("pageAdmin", JSON.stringify({ location: "orders", page, search }));
                $scope.page = page;
                $scope.currentPage = page;
                window.scrollTo(0, 0);
            }
            
            sort[$scope.sort.type] = $scope.sort.reverse ? -1 : 1;
            // $scope.currentPage =2;
            // $scope.page =2;

            cleanEmptyProperties($scope.filter);

            var filterKeys = Object.keys($scope.filter);
            for(let i = 0, leni = filterKeys.length; i < leni; i++)
            {
                if(filterKeys[i].includes("min_") || filterKeys[i].includes("max_"))
                {
                    var key = filterKeys[i].split("_");
                    var value = $scope.filter[filterKeys[i]];

                    if(filter[key[1]] === undefined)
                    {
                        filter[key[1]] = {};
                    }

                    filter[key[1]][key[0] === "min" ? "$gte" : "$lte"] = value;
                }
                else
                {
                    filter[filterKeys[i]] = {$regex: $scope.filter[filterKeys[i]].toString(), $options: "i"};
                }
            }
            Orders.list({PostBody: {filter: filter, limit: $scope.nbItemsPerPage, page: page, sort: sort}}, function (response)
            {
                $scope.orders = response.datas;
                $scope.totalItems = response.count;
            });
        };

        setTimeout(function(){ //Obligé de timer sinon la requete s'effectue deux fois à cause du on-select-page du html
            $scope.getOrders();
        }, 100);

        function init()
        {
            $scope.sort = {
                type: "createdAt", // set the default sort type
                reverse: true // set the default sort order
            };
        }
        init();

        $("#query-date").datepicker({
            dateFormat: "dd/mm/yy", onClose: function (date)
            {
                $scope.$apply(function ()
                {
                    $scope.queryDate = new Date(date.substr(6, 4), date.substr(3, 2) - 1, date.substr(0, 2)).toISOString();
                });
            }
        });

        $scope.goToOrderDetails = function (orderId)
        {
            $location.path("/orders/" + orderId);
        };
    }
]);

OrderControllers.controller("OrderDetailCtrl", [
    "$scope", "$q", "$routeParams", "$sce", "Orders", "$modal", "NSConstants", "toastService", "OrderFields", "ClientCountry",
    "OrderRelayPoint", "Invoice", "$location", '$anchorScroll', '$rootScope',
    function ($scope, $q, $routeParams, $sce, Orders, $modal, NSConstants, toastService, OrderFields, ClientCountry, OrderRelayPoint, Invoice, $location, $anchorScroll, $rootScope)
    {
        $scope.fields = OrderFields;
        $scope.orderRelayPoint = OrderRelayPoint;
        $scope.editableMode = false;
        $scope.order = {};
        $scope.status = "";

        $scope.scrollTo = function(elemId) {
            $location.hash(elemId);
            $anchorScroll();

            $scope.changeStatus();// Si changeStatusId
        }

        $scope.init = function () {
            $scope.defaultLang = $rootScope.languages.find(function (lang)
            {
                return lang.defaultLanguage;
            }).code;

            Orders.list({PostBody: {filter: {_id: $routeParams.orderId}}, limit: 1, structure: '*', populate: ['items.id']}, function (response)
            {
                $scope.order = response.datas[0];
                $scope.status = $scope.order.status;
                if (!(['PAID', 'PROCESSED', 'PROCESSING', 'DELIVERY_PROGRESS', "FINISHED"]).includes($scope.order.status)) {
                    key = Object.keys($scope.orderStatus).find(key => $scope.orderStatus[key].code === "BILLED");
                    $scope.orderStatus.splice(key, 1);
                }
                Object.keys($scope.order.addresses).forEach(function (key)
                {
                    ClientCountry.query({PostBody: {filter: {code: $scope.order.addresses[key].isoCountryCode}}}, function (response)
                    {
                        // On récupére le nom du pays
                        $scope.order.addresses[key].country = response.name;
                    }, function (error)
                    {
                        console.error("Impossible de récupérer le pays des clients", error);
                        // si une erreur se produit on met le code iso du pays dans country
                        $scope.order.addresses[key].country = $scope.order.addresses[key].isoCountryCode;
                    });
                });
            }, function (error)
            {
                console.error(error);
            });
        };


        $scope.init();

        $scope.getOrderReceiptDate = function ()
        {
            if($scope.order.orderReceipt.date)
                return moment($scope.order.orderReceipt.date).format("DD/MM/YYYY HH:mm") + "h";
            return moment($scope.order.delivery.date).format("DD/MM/YYYY HH:mm") + "h";
        };

        /**
         * Permet de récupérer le prix unitaire du produit avec promo appliqué si necessaire
         * @param {*} item item pour lequel on calcul le prix unitaire
         * @returns {number} prix unitaire
         */
        $scope.getUnitPrice = function (item)
        {
            var order = $scope.order;
            let priceAti = item.price.unit.ati;
            if(item.price && item.price.special && item.price.special.ati >= 0)
            {
                priceAti = item.price.special.ati;
            }
            if(order.quantityBreaks && order.quantityBreaks.productsId && order.quantityBreaks.productsId.length)
            {
                const qtyBreakFound = order.quantityBreaks.productsId.find(prdId => prdId.productId.toString() === item.id._id.toString());
                if(qtyBreakFound)
                {
                    priceAti -= qtyBreakFound.discountATI;
                }
            }
            return priceAti;
        };

        $scope.getUnitPriceEt = function (item)
        {
            var order = $scope.order;
            let priceEt = item.price.unit.et;
            if(item.price && item.price.special && item.price.special.et >= 0)
            {
                priceEt = item.price.special.et;
            }
            if(order.quantityBreaks && order.quantityBreaks.productsId && order.quantityBreaks.productsId.length)
            {
                const qtyBreakFound = order.quantityBreaks.productsId.find(prdId => prdId.productId.toString() === item.id._id.toString());
                if(qtyBreakFound)
                {
                    priceEt -= qtyBreakFound.discountET;
                }
            }
            return priceEt;
        };

        $scope.oldPrice = function (item)
        {
            var _order = $scope.order;
            let basePriceATI = null;
            if(item.price.special && item.price.special.ati)
            {
                return item.price.unit.ati.toFixed(2);
            }
            if(_order.quantityBreaks && _order.quantityBreaks.productsId.length)
            {
                // On check si le produit courant a recu une promo
                const prdPromoFound = _order.quantityBreaks.productsId.find(productId => productId.productId.toString() === item.id.id.toString());
                if(prdPromoFound)
                {
                    basePriceATI = prdPromoFound.basePriceATI;
                    return (basePriceATI).toFixed(2);
                }
            }
            return false;
        };

        $scope.getDeliveryDate = function ()
        {
            if($scope.order.delivery && $scope.order.delivery.dateDelivery && $scope.order.delivery.dateDelivery.delayDelivery && $scope.order.delivery.dateDelivery.delayPreparation)
            {
                return $scope.order.delivery ? moment($scope.order.createdAt)
                    .add($scope.order.delivery.dateDelivery.delayDelivery, $scope.order.delivery.dateDelivery.unitDelivery)
                    .add($scope.order.delivery.dateDelivery.delayPreparation, $scope.order.delivery.dateDelivery.unitPreparation)
                    .format("L") : moment().format("L");
            }
            else
            {
                return moment().format("L");
            }
        };

        $scope.getTotalWeight = function ()
        {
            var totalWeight = 0;
            if($scope.order.items && $scope.order.items.length > 0)
            {
                for(var i = 0; i < $scope.order.items.length; i++)
                {
                    totalWeight += $scope.order.items[i].weight ? $scope.order.items[i].weight * $scope.order.items[i].quantity : 0;
                }
            }
            return totalWeight;
        };

        $scope.getParentItem = function (parent)
        {
            if($scope.order.items && $scope.order.items.length > 0)
            {
                var _parent = $scope.order.items.find(function (item)
                {
                    return item._id === parent;
                });
                if(_parent)
                {
                    return _parent.id.code;
                }
            }
        };

        $scope.enabledDisabled = function ()
        {
            $scope.editableMode = !$scope.editableMode;
        };

        $scope.orderToBill = function ()
        {
            let query = Invoice.orderToBill({idOrder: $scope.order._id});
            query.$promise.then(function (response) {
                toastService.toast('success', 'Facture créée')
                $scope.init()
            }).catch(function (err) {
                toastService.toast('danger', err.data.message);
            });
        };
        
        $scope.getTranslation = function (status){
            return 'order.status.' + status;
        }
        $scope.test = "order.detail.cancel";
        $scope.orderStatus = [...NSConstants.orderStatus.translation[$rootScope.adminLang]];

        $scope.getStatus = function(status){
            if(status !== undefined){
                let a = Object.keys(NSConstants.orderStatus.translation[$rootScope.adminLang]).find(key => NSConstants.orderStatus.translation[$rootScope.adminLang][key].code === status);
                return NSConstants.orderStatus.translation[$rootScope.adminLang][a].name;
            }
        }
        
        $scope.itemStatus = NSConstants.itemStatus;

        $scope.getAddress = function ()
        {
            if(!$scope.order.addresses)
            {
                return;
            }
            return $scope.order.addresses.delivery.line1 + " " +
                ($scope.order.addresses.delivery.line2 ? $scope.order.addresses.delivery.line2 : "") + " " +
                ($scope.order.addresses.delivery.phone ? $scope.order.addresses.delivery.phone : "") + " " +
                ($scope.order.addresses.delivery.phone_mobile ? $scope.order.addresses.delivery.phone_mobile : "") + " " +
                $scope.order.addresses.delivery.city + " " +
                $scope.order.addresses.delivery.zipcode + ", " +
                $scope.order.addresses.delivery.country;
        };

        $scope.updateOrder = function (field, data)
        {
            var d = $q.defer();
            if(field === "status")
            {
                if(data === $scope.order.status){
                    toastService.toast("danger", "La commande est déjà dans cet état !");
                }else if(data == "PAID"){
                    $scope.editStatus = false;
                    $scope.addInfoPayment();
                } else if (data == "DELIVERY_PARTIAL_PROGRESS" || data == "DELIVERY_PROGRESS") {
                    $scope.editStatus = false;
                    $scope.addPackage(data);
                } else if (data == "BILLED") {
                    if ($scope.displayBillButton() === true){
                        $scope.editStatus = false;
                        $scope.orderToBill();
                    }
                } else if (data == "RETURNED") {
                        $scope.editStatus = false;
                        $scope.returnItem();
                }else{
                    Orders.updateStatus({id: $scope.order._id, status: data}, function (result)
                    {
                        Orders.list({PostBody: {filter: {_id: $routeParams.orderId}}, limit: 1, structure: '*', populate: ['items.id']}, function (response) {
                            $scope.order = response.datas[0];
                            $scope.status = $scope.order.status;
                        });
                        if (!(['PAID', 'PROCESSED', 'PROCESSING', 'DELIVERY_PROGRESS', 'FINISHED']).includes($scope.order.status)) {
                            key = Object.keys($scope.orderStatus).find(key => $scope.orderStatus[key].code === "BILLED");
                            $scope.orderStatus.splice(key, 1);
                        }
                        $scope.editStatus = false;
                        d.resolve();
                    }, function (err)
                    {
                        if(err.data.message)
                        {
                            toastService.toast("danger", "Ce changement d'état n'est pas possible");
                            d.reject(err.data.message);
                        }
                        else
                        {
                            d.reject("Erreur serveur !");
                        }
                    });
                }
            }
            else
            {
                Orders.save({order: $scope.order}, function (res)
                {
                    d.resolve();

                }, function (e)
                {
                    d.reject("Erreur serveur !");
                });
            }
            return d.promise;
        };

        $scope.editStatus = false;
        $scope.changeStatus = function(){
            if ($scope.editStatus === false){
                $scope.editStatus = true;
            }else{
                $scope.editStatus = false;
            }
        }

        $scope.getProductsDatas = function (products, qty)
        {
            var productsList = products.map(function (product)
            {
                return product.product_code + " (" + product[qty] + ")";
            });

            return productsList.join(", ");
        };

        $scope.getPkgTotal = function (pkg)
        {
            var total = 0;
            for(var i = 0; i < pkg.products.length; i++)
            {
                total += pkg.products[i].qty_shipped;
            }
            return total;
        };

        $scope.delPkg = function (pkg)
        {
            Orders.delPkg({order: $scope.order._id, package: pkg}, function (res)
            {
                $scope.order = res;
            }, function (err)
            {
                console.error(err.data);
                toastService.toast("danger", "Impossible de supprimer le colis");
            });
        };

        function getQtyShipped(i)
        {
            var qty = 0;
            if($scope.order.delivery.package)
            {
                for(var j = 0; j < $scope.order.delivery.package.length; j++)
                {
                    for(var k = 0; k < $scope.order.delivery.package[j].products.length; k++)
                    {
                        if($scope.order.delivery.package[j].products[k].product_id === $scope.order.items[i].id._id)
                        {
                            qty += $scope.order.delivery.package[j].products[k].qty_shipped;
                        }
                    }
                }
            }
            return qty;
        }

        function getQtyReturned(i)
        {
            var qty = 0;
            if($scope.order.rma)
            {
                for(var j = 0; j < $scope.order.rma.length; j++)
                {
                    for(var k = 0; k < $scope.order.rma[j].products.length; k++)
                    {
                        if($scope.order.rma[j].products[k].product_id === $scope.order.items[i].id._id)
                        {
                            qty += $scope.order.rma[j].products[k].qty_returned;
                        }
                    }
                }
            }
            return qty;
        }

        $scope.addPackage = function (type)
        {
            $modal.open({
                templateUrl: "views/modals/order-packages.html",
                controller: "PackagesNewCtrl",
                windowClass: "modal-large",
                resolve: {
                    genericTools: function ()
                    {
                        return {
                            getQtyShipped: getQtyShipped,
                            getQtyReturned: getQtyReturned,
                        };
                    },
                    item: function ()
                    {
                        return $scope.order;
                    },
                    type : function(){
                        return type;
                    }
                }
            }).result.then(function ()
            {
                Orders.list({PostBody: {filter: {_id: $routeParams.orderId}}, limit: 1, structure: '*', populate: ['items.id']}, function (response) {
                    $scope.order = response.datas[0]
                });
            });
        };

        $scope.returnItem = function ()
        {
            $modal.open({
                templateUrl: "views/modals/order-rma.html",
                controller: "RMANewCtrl",
                windowClass: "modal-large",
                resolve: {
                    genericTools: function ()
                    {
                        return {
                            getQtyShipped: getQtyShipped,
                            getQtyReturned: getQtyReturned
                        };
                    },
                    item: function ()
                    {
                        return $scope.order;
                    }
                }
            }).result.then(function ()
            {
                Orders.list({PostBody: {filter: {_id: $routeParams.orderId}}, limit: 1, structure: '*', populate: ['items.id']}, function (response) {
                    $scope.order = response.datas[0]
                });
            });
        };

        $scope.addInfoPayment = function ()
        {
            $modal.open({
                windowClass: "modal-large",
                templateUrl: "views/modals/order-info-payment.html",
                controller: "InfoPaymentNewCtrl",
                resolve: {
                    item: function ()
                    {
                        return $scope.order;
                    }
                }
            }).result.then(function ()
            {
                Orders.list({PostBody: {filter: {_id: $routeParams.orderId}}, limit: 1, structure: '*', populate: ['items.id']}, function (response) {
                    $scope.order = response.datas[0];
                    $scope.orderStatus = [...NSConstants.orderStatus.translation[$rootScope.adminLang]];
                    // let key = Object.keys($scope.orderStatus).find(key => $scope.orderStatus[key].code === "PAYMENT_RECEIPT_PENDING");
                    // $scope.orderStatus.splice(key, 1);
                });
            });
        };

        $scope.changeAddress = function (type) {
            let modalInstance = $modal.open({
                windowClass: "modal-large",
                templateUrl: "views/modals/order-info-address.html",
                controller: "InfoAddressCtrl",
                resolve: {
                    item: function () {
                        return {
                            order :$scope.order,
                            type  :type
                        }
                    }
                }
            });
            modalInstance.result.then(function () {
                Orders.list({PostBody: {filter: {_id: $routeParams.orderId}}, limit: 1, structure: '*', populate: ['items.id']}, function (response) {
                    $scope.order = response.datas[0]
                });
            });
        }

        $scope.displayBillButton = function () {
            return (['PAID', 'PROCESSED', 'PROCESSING', 'DELIVERY_PROGRESS', 'FINISHED']).includes($scope.order.status)
        }

        $scope.calculateTotalQty = function(items) {
            if(items && items != undefined)
                return items.reduce((t, {quantity}) => t + quantity, 0);
        }
    }
]);

OrderControllers.controller("InfoAddressCtrl", [
    "$scope", "$modalInstance", "item", "Order", "Orders", "$rootScope", "toastService","TerritoryCountries",
    function ($scope, $modalInstance, item, Order, Orders, $rootScope, toastService, TerritoryCountries) {
        $scope.type = angular.copy(item.type);
        $scope.order = angular.copy(item.order);

        $scope.onCountrySelected = function(country){
            $scope.order.adresses[$scope.type];
        };

        $scope.defaultLang = $rootScope.languages.find(function (lang) {
            return lang.defaultLanguage;
        }).code;

        TerritoryCountries.query({ PostBody: { filter: { type: 'country' }, limit: 99 } }, function (countries) {
            $scope.countries = countries;
            $scope.countries.datas.forEach(function (country, i) {
                $rootScope.languages.forEach(lang => {
                    if (country.translation[lang.code] === undefined) {
                        $scope.countries.datas[i].translation[lang.code] = {};
                        $scope.countries.datas[i].translation[lang.code].name = country.code;
                    }
                })
            });
        });

        $scope.save = function () {
            let countryName = $scope.countries.datas.find(function (element) {
                if ($scope.order.addresses[$scope.type].isoCountryCode === element.code){
                    return element.translation[$scope.defaultLang].name;
                }
            }); 
            $scope.order.addresses[$scope.type].country = countryName.translation[$scope.defaultLang].name;
            Orders.save({order:$scope.order}, function(response){
                if(response.nModified === 1){
                    toastService.toast("success", "Adresse changée");
                    $modalInstance.close(3);
                    // $scope.order = Order.get({ orderId: $scope.order._id });
                }else{
                    toastService.toast("danger", "Erreur lors du changement d'adresse");
                }
            });
        };

        $scope.cancel = function () {
            $modalInstance.dismiss("cancel");
        };
    }
]);

OrderControllers.controller("HistoryStatusCtrl", [
    "$scope", "$modalInstance", "NSConstants", "historyStatus",
    function ($scope, $modalInstance, NSConstants, historyStatus)
    {

        $scope.orderStatus = NSConstants.orderStatus;
        $scope.historyStatus = historyStatus;
        $scope.close = function ()
        {
            $modalInstance.close();
        };
    }
]);

OrderControllers.controller("PackagesNewCtrl", [
    "$scope", "$modalInstance", "item", "Orders", "$rootScope", "toastService", "genericTools","type",
    function ($scope, $modalInstance, item, Orders, $rootScope, toastService, genericTools, type)
    {
        $scope.order = angular.copy(item);
        $scope.pkg = {tracking: "", products: []};
        if (type != undefined && type === "DELIVERY_PARTIAL_PROGRESS"){
            $scope.partial = true;
        }

        $scope.defaultLang = $rootScope.languages.find(function (lang)
        {
            return lang.defaultLanguage;
        }).code;

        for(var i = $scope.order.items.length - 1; i >= 0; i--)
        {
            if($scope.order.items[i].id)
            {
                var qty_shipped = genericTools.getQtyShipped(i);
                var qty_returned = genericTools.getQtyReturned(i);
                let productToPush = {
                    product_id: $scope.order.items[i].id,
                    product_code: $scope.order.items[i].code,
                    qty_returned: qty_returned,
                    qty_shipped: qty_shipped,
                    qty_delivered: $scope.order.items[i].quantity < qty_shipped ? 0 : $scope.order.items[i].quantity - qty_shipped
                }

                if($scope.order.items[i].type === 'bundle') {
                    productToPush.selections = $scope.order.items[i].selections;
                }

                $scope.pkg.products.push(productToPush);
            }
            else
            {
                $scope.order.items.splice(i, 1);
            }
        }

        $scope.pkg.products.reverse();

        $scope.setQty = function (index)
        {
            $scope.pkg.products[index].qty_delivered = $scope.order.items[index].quantity < $scope.pkg.products[index].qty_shipped ? 0 :
                $scope.order.items[index].quantity - $scope.pkg.products[index].qty_shipped;
        };

        $scope.sendPackage = function ()
        {
            var pkg = angular.copy($scope.pkg);
            pkg.status = "full";
            $scope.error = "";

            for(var i = pkg.products.length - 1; i >= 0; i--)
            {
                if($scope.order.items[i].quantity !== pkg.products[i].qty_delivered)
                {
                    pkg.status = "partial";
                }

                if(pkg.products[i].qty_delivered === 0)
                {
                    pkg.products.splice(i, 1);
                }
                else
                {
                    pkg.products[i].qty_shipped = pkg.products[i].qty_delivered;
                }
            }

            if(pkg.products.length > 0)
            {
                Orders.addPkg({order: $scope.order._id, package: pkg}, function ()
                {
                    toastService.toast("success", "Colis correctement ajouté");
                    $modalInstance.close();
                }, function (err)
                {
                    toastService.toast("danger", "Une erreur est survenue !");
                    if(err.data && err.data.translations)
                    {
                        toastService.toast("danger", err.data.translations[$scope.defaultLang]);
                    }
                    $modalInstance.close();
                });
            }
            else
            {
                $scope.error = "Colis vide";
                $scope.partial = true;
            }
        };

        $scope.cancel = function ()
        {
            $modalInstance.dismiss("cancel");
        };
    }
]);

OrderControllers.controller("RMANewCtrl", [
    "$scope", "$modalInstance", "item", "Orders", "$rootScope", "toastService", "genericTools", "ConfigV2",
    function ($scope, $modalInstance, item, Orders, $rootScope, toastService, genericTools, ConfigV2)
    {
        $scope.order = angular.copy(item);
        $scope.return = {mode: "", comment: "", in_stock: true, sendMail: true, refund: 0, tax: 0, products: []};
        $scope.taxerate = [];

        $scope.defaultLang = $rootScope.languages.find(function (lang)
        {
            return lang.defaultLanguage;
        }).code;

        ConfigV2.taxerate(function (data) {
            $scope.taxerate = data;
            $scope.return.tax = data[0].rate;
        });

        for(var i = $scope.order.items.length - 1; i >= 0; i--)
        {
            if($scope.order.items[i].id)
            {
                var qty_returned = genericTools.getQtyReturned(i);
                var qty_shipped = genericTools.getQtyShipped(i);
                let productToPush = {
                    product_id: $scope.order.items[i].id,
                    product_code: $scope.order.items[i].code,
                    qty_returned: qty_returned,
                    qty_shipped: qty_shipped,
                    qty_delivered: $scope.order.items[i].quantity < qty_shipped ? 0 : $scope.order.items[i].quantity - qty_shipped
                }

                if($scope.order.items[i].type === 'bundle') {
                    productToPush.selections = $scope.order.items[i].selections;
                }

                $scope.return.products.push(productToPush);
            }
            else
            {
                $scope.order.items.splice(i, 1);
            }
        }

        $scope.return.products.reverse();

        $scope.setQty = function (index)
        {
            $scope.return.refund = 0;

            if(index !== undefined)
            {
                $scope.return.products[index].qty_returning = $scope.order.items[index].quantity < $scope.return.products[index].qty_returned ? 0 :
                    $scope.order.items[index].quantity - $scope.return.products[index].qty_returned;
            }

            for(var i = 0; i < $scope.return.products.length; i++)
            {
                if($scope.return.products[i].qty_returning > 0)
                {
                    $scope.return.refund += ($scope.order.items[i].price.special !== undefined && $scope.order.items[i].price.special.ati !== undefined ?
                        $scope.order.items[i].price.special.ati : $scope.order.items[i].price.unit.ati) * $scope.return.products[i].qty_returning;
                }
            }
        };

        $scope.setQty();

        $scope.cancelItem = function ()
        {
            var returnData = angular.copy($scope.return);
            $scope.error = "";

            if(returnData.refund === 0)
            {
                returnData.mode = "";
            }

            for(var i = returnData.products.length - 1; i >= 0; i--)
            {
                if(returnData.products[i].qty_returning === 0)
                {
                    returnData.products.splice(i, 1);
                }
                else
                {
                    returnData.products[i].qty_returned = returnData.products[i].qty_returning;
                }
            }

            if(returnData.products.length > 0)
            {
                Orders.rma({order: $scope.order._id, return: returnData}, function ()
                {
                    toastService.toast("success", "Retour correctement ajouté");
                    $modalInstance.close();
                }, function (err)
                {
                    toastService.toast("danger", "Une erreur est survenue !");
                    if(err.data && err.data.translations)
                    {
                        toastService.toast("danger", err.data.translations[$scope.defaultLang]);
                    }
                    $modalInstance.close();
                });
            }
            else
            {
                $scope.error = "Aucun retour définit";
            }
        };

        $scope.cancel = function ()
        {
            $modalInstance.dismiss("cancel");
        };
    }
]);

OrderControllers.controller("InfoPaymentNewCtrl", [
    "$scope", "$modalInstance", "item", "Orders", "$rootScope", "toastService",
    function ($scope, $modalInstance, item, Orders, $rootScope, toastService)
    {
        $scope.order = angular.copy(item);
        $scope.return = {comment: "", mode: "", sendMail: true, amount: $scope.order.priceTotal.ati, type: "CREDIT", status: "DONE", products: []};

        $scope.defaultLang = $rootScope.languages.find(function (lang)
        {
            return lang.defaultLanguage;
        }).code;

        for(var i = $scope.order.items.length - 1; i >= 0; i--)
        {
            if($scope.order.items[i].id)
            {
                var qty_returned = 0;

                $scope.return.products.push({
                    product_id: $scope.order.items[i].id,
                    product_code: $scope.order.items[i].code,
                    qty_returned: qty_returned,
                    qty_returning: $scope.order.items[i].quantity - qty_returned
                });
            }
            else
            {
                $scope.order.items.splice(i, 1);
            }
        }

        $scope.return.products.reverse();

        $scope.setQty = function (index)
        {
            $scope.return.refund = 0;

            if(index !== undefined)
            {
                $scope.return.products[index].qty_returning = $scope.order.items[index].quantity < $scope.return.products[index].qty_returned ? 0 :
                    $scope.order.items[index].quantity - $scope.return.products[index].qty_returned;
            }

            for(var i = 0; i < $scope.return.products.length; i++)
            {
                if($scope.return.products[i].qty_returning > 0)
                {
                    $scope.return.refund += ($scope.order.items[i].price.special !== undefined && $scope.order.items[i].price.special.ati !== undefined ?
                        $scope.order.items[i].price.special.ati : $scope.order.items[i].price.unit.ati) * $scope.return.products[i].qty_returning;
                }
            }
        };

        $scope.validateInfoPayment = function ()
        {
            var returnData = angular.copy($scope.return);
            $scope.error = "";

            delete returnData.sendMail;
            Orders.infoPayment({order: $scope.order._id, params: returnData, sendMail: $scope.return.sendMail}, function ()
            {
                toastService.toast("success", "Information de paiement correctement ajoutée");
                $modalInstance.close();
            }, function (err)
            {
                toastService.toast("danger", "Une erreur est survenue !");
                if(err.data && err.data.translations)
                {
                    toastService.toast("danger", err.data.translations[$scope.defaultLang]);
                }
                $modalInstance.close();
            });
        };

        $scope.cancel = function ()
        {
            $modalInstance.dismiss("cancel");
        };
    }
]);
