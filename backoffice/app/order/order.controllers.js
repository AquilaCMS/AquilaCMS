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
        $scope.showLoader = true;

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
            Orders.list({PostBody: {filter: filter, limit: $scope.nbItemsPerPage, page: page, sort: sort, structure: $scope.columns.map((col) => {
                let field = col.cell.component_template
                return field.replace(/{{|}}|order\./ig, '')
            })}}, function (response) {
                $scope.showLoader = false;
                $scope.orders = response.datas;
                $scope.totalItems = response.count;
            }, function(error) {
                console.error("Can't get data");
                console.error(error);
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

        // $("#query-date").datepicker({
        //     dateFormat: "dd/mm/yy", onClose: function (date)
        //     {
        //         $scope.$apply(function ()
        //         {
        //             $scope.queryDate = new Date(date.substr(6, 4), date.substr(3, 2) - 1, date.substr(0, 2)).toISOString();
        //         });
        //     }
        // });

        $scope.goToOrderDetails = function (orderId)
        {
            $location.path("/orders/" + orderId);
        };
    }
]);

OrderControllers.controller("OrderDetailCtrl", [
    "$scope", "$q", "$routeParams", "$sce", "Orders", "$modal", "NSConstants", "toastService", "OrderFields", "ClientCountry",
    "OrderRelayPoint", "Invoice", "$location", '$anchorScroll', '$rootScope', 'OrderPackagePopup','$translate', "ClientV2", "NSConstants", "OrderDeliveryFields", "OrderDeliveryDate",
    function ($scope, $q, $routeParams, $sce, Orders, $modal, NSConstants, toastService, OrderFields, ClientCountry, OrderRelayPoint, Invoice, $location, $anchorScroll, $rootScope, OrderPackagePopup, $translate, ClientV2, NSConstants, OrderDeliveryFields, OrderDeliveryDate)
    {
        const orderStatuses = {};
        NSConstants.orderStatus.translation.fr.forEach((ele) => orderStatuses[ele.code] = ele.code)
        $scope.customer = {};
        $scope.fields = OrderFields;
        $scope.fieldsOrderDelivery = OrderDeliveryFields;
        $scope.dateOrderDelivery = OrderDeliveryDate;
        $scope.orderRelayPoint = OrderRelayPoint;
        $scope.orderPackagePopup = OrderPackagePopup;
        $scope.editableMode = false;
        $scope.order = {};
        $scope.status = "";
        $scope.scrollTo = function(elemId) {
            $location.hash(elemId);
            $anchorScroll();

            $scope.changeStatus();// Si changeStatusId
        }

        $scope.displayProducts = function (item) {
            var displayHtml = '';
            for (var i = 0; i < item.selections.length; i++) {
                var section = item.selections[i];
                if(!section.products.length){
                    //because sometimes it's a object (with api/v2/order/delpkg, and maybe others)
                    section.products = [section.products];
                }
                for (var j = 0; j < section.products.length; j++) {
                    var productSection = section.products[j];
                    // we choose the correct bundle
                    const correctBundle = item.bundle_sections.find((bundle_section) => bundle_section.ref === section.bundle_section_ref);
                    // we choose the correct product in the correct bundle
                    const productOfBundle = correctBundle.products.find((product) => product.id === productSection.id);
                    var text = "";
                    if(productOfBundle && productOfBundle.modifier_price && productOfBundle.modifier_price['et'] && productOfBundle.modifier_price['ati']){
                        //put the HT text
                        if(productOfBundle.modifier_price['et'] > 0){
                            text += '(ET: +';
                        }else{
                            text += '(';
                        }
                        text += `${productOfBundle.modifier_price['et'].aqlRound(2)} €)`;
                        //put the TTC text
                        text+= '/ATI: '
                        if(productOfBundle.modifier_price['ati'] > 0){
                            text += '+';
                        }else{
                            text += '';
                        }
                        text += `${productOfBundle.modifier_price['ati'].aqlRound(2)} €)`;
                    }
                    displayHtml += `<li key="${j}">${productSection.name} ${text}</li>`;
                }
            }
            return displayHtml;
        }

        $scope.checkOrderStatus = function () {
            if (!([orderStatuses.PAID, orderStatuses.PROCESSED, orderStatuses.PROCESSING, orderStatuses.DELIVERY_PROGRESS, orderStatuses.FINISHED]).includes($scope.order.status)) {
                const index = $scope.orderStatus.findIndex(oneStatus => oneStatus.code === orderStatuses.BILLED);
                if(index > -1){
                    $scope.orderStatus.splice(index, 1);
                }
            } else 
            // we add back the BILLED status into the select box status
            if (!$scope.orderStatus.find(oneStatus => oneStatus.code === orderStatuses.BILLED)) {
                $scope.orderStatus = [...NSConstants.orderStatus.translation[$rootScope.adminLang]]
            }
        }

        $scope.init = function () {
            $scope.defaultLang = $rootScope.languages.find(function (lang)
            {
                return lang.defaultLanguage;
            }).code;

            Orders.list({PostBody: {filter: {_id: $routeParams.orderId}}, limit: 1, structure: '*'}, function (response)
            {
                $scope.order = response.datas[0];
                // sort status
                if($scope.order && $scope.order.customer.id){
                    // we get the client informations to check to email and to check is user exists
                    ClientV2.query({PostBody: {filter: {_id: $scope.order.customer.id}, structure: '*', limit: 1}}, function (responseUserRequest) {
                        if(typeof responseUserRequest.PostBody !== "undefined") {
                            // if there are a PostBody, there is not content
                            $scope.customer = null;
                        } else {
                            $scope.customer = responseUserRequest;
                        }
                    }, function(error){
                        console.log(error);
                    });
                }
                else {
                    $scope.customer = null;
                }
                
                $scope.status = $scope.order.status;
                $scope.checkOrderStatus()
                Object.keys($scope.order.addresses).forEach(function (typeNameAdress) {
                    if(typeof $scope.order.addresses[typeNameAdress].country === "undefined" || $scope.order.addresses[typeNameAdress].country === null) {
                        ClientCountry.query({PostBody: {filter: {code: $scope.order.addresses[typeNameAdress].isoCountryCode}}}, function (response) {
                            // On récupére le nom du pays
                            $scope.order.addresses[typeNameAdress].country = response.translation[$scope.defaultLang].name;
                        }, function (error) {
                            console.error("Impossible de récupérer le pays des clients", error);
                            // si une erreur se produit on met le code iso du pays dans country
                            $scope.order.addresses[typeNameAdress].country = $scope.order.addresses[typeNameAdress].isoCountryCode;
                        });
                    }
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
                return item.price.unit.ati.aqlRound(2);
            }
            if(_order.quantityBreaks && _order.quantityBreaks.productsId.length)
            {
                // On check si le produit courant a recu une promo
                const prdPromoFound = _order.quantityBreaks.productsId.find(productId => productId.productId.toString() === item.id.id.toString());
                if(prdPromoFound)
                {
                    basePriceATI = prdPromoFound.basePriceATI;
                    return (basePriceATI).aqlRound(2);
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
                toastService.toast('success', $translate.instant("order.detail.invoiceCreated"))
                $scope.init()
            }).catch(function (err) {
                toastService.toast('danger', err.data.message);
            });
        };

        $scope.getTranslation = function (status){
            return 'order.status.' + status;
        }
        $scope.test = "order.detail.cancel";
        $scope.orderStatus = [...NSConstants.orderStatus.translation[$rootScope.adminLang]]

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
                    toastService.toast("danger", $translate.instant("order.detail.orderAlreadyState"));
                }else if(data == orderStatuses.PAID){
                    $scope.editStatus = false;
                    $scope.addInfoPayment("PAID");
                } else if (data == orderStatuses.DELIVERY_PARTIAL_PROGRESS || data == orderStatuses.DELIVERY_PROGRESS) {
                    $scope.editStatus = false;
                    $scope.addPackage(data);
                } else if (data == orderStatuses.BILLED) {
                    if ($scope.displayBillButton() === true){
                        $scope.editStatus = false;
                        $scope.orderToBill();
                    }
                } else if (data == orderStatuses.RETURNED) {
                        $scope.editStatus = false;
                        $scope.returnItem();
                }else{
                    Orders.updateStatus({id: $scope.order._id, status: data}, function (result)
                    {
                        Orders.list({PostBody: {filter: {_id: $routeParams.orderId}}, limit: 1, structure: '*', populate: ['items.id']}, function (response) {
                            $scope.order = response.datas[0];
                            $scope.status = $scope.order.status;
                            $scope.checkOrderStatus()
                        });
                        $scope.editStatus = false;
                        d.resolve();
                    }, function (err)
                    {
                        if(err.data.message)
                        {
                            toastService.toast("danger", $translate.instant("order.detail.changeStateImpossible"));
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
            if (confirm($translate.instant("confirm.deletePackageOrder"))) {
                Orders.delPkg({ order: $scope.order._id, package: pkg }, function (res) {
                    $scope.order = res;
                    toastService.toast("success", $translate.instant("order.detail.removedPackage"));
                }, function (err) {
                    console.error(err.data);
                    toastService.toast("danger", $translate.instant("order.detail.removePackage"));
                });
            }
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
                        if($scope.order.delivery.package[j].products[k].product_id === ($scope.order.items[i].id._id || $scope.order.items[i].id))
                        {
                            if($scope.order.delivery.package[j].products[k].qty_shipped){
                                qty += $scope.order.delivery.package[j].products[k].qty_shipped;
                            }
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
                            if($scope.order.rma[j].products[k].qty_returned){
                                qty += $scope.order.rma[j].products[k].qty_returned;
                            }
                        }
                    }
                }
            }
            return qty;
        }
        $scope.getQtyShipped = getQtyShipped;
        $scope.getQtyReturned = getQtyReturned;

        $scope.getOrder = function () {
            Orders.get({
                PostBody: {
                    filter: {_id: $routeParams.orderId}
                },
                limit: 1,
                structure: '*',
                populate: ['items.id']
            }, function (response) {
                $scope.order = response
                $scope.checkOrderStatus()
            }, function (error) {
                toastService.toast("danger", $translate.instant("global.standardError"));
                console.error(error);
            });
        }

        $scope.addPackage = function (type) {
            $modal.open({
                templateUrl : "views/modals/order-packages.html",
                controller  : "PackagesNewCtrl",
                windowClass : "modal-large",
                backdrop    : 'static',
                keyboard    : false,
                resolve: {
                    genericTools: function () {
                        return {
                            getQtyShipped: getQtyShipped,
                            getQtyReturned: getQtyReturned,
                        };
                    },
                    item: function () {
                        return $scope.order;
                    },
                    type : function () {
                        return type;
                    }
                }
            }).result.then(function () {
                $scope.getOrder()
            });
        };

        $scope.returnItem = function ()
        {
            $modal.open({
                templateUrl : "views/modals/order-rma.html",
                controller  : "RMANewCtrl",
                windowClass : "modal-large",
                backdrop    : 'static',
                keyboard    : false,
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
                $scope.getOrder()
            });
        };

        $scope.addInfoPayment = function (status)
        {
            $modal.open({
                windowClass: "modal-large",
                templateUrl: "views/modals/order-info-payment.html",
                controller: "InfoPaymentNewCtrl",
                resolve: {
                    item: function ()
                    {
                        return $scope.order;
                    },
                    status: function ()
                    {
                        return status;
                    }
                }
            }).result.then(function ()
            {
                $scope.getOrder()
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
                $scope.getOrder()
            });
        }

        $scope.displayBillButton = function () {
            return ([orderStatuses.PAID, orderStatuses.PROCESSED, orderStatuses.PROCESSING, orderStatuses.DELIVERY_PROGRESS, orderStatuses.FINISHED]).includes($scope.order.status)
        }

        $scope.calculateTotalQty = function(items) {
            if(items && items != undefined)
                return items.reduce((t, {quantity}) => t + quantity, 0);
        }
    }
]);

OrderControllers.controller("InfoAddressCtrl", [
    "$scope", "$modalInstance", "item", "Order", "Orders", "$rootScope", "toastService","TerritoryCountries", "$translate",
    function ($scope, $modalInstance, item, Order, Orders, $rootScope, toastService, TerritoryCountries, $translate) {
        $scope.type = angular.copy(item.type);
        $scope.order = angular.copy(item.order);

        $scope.onCountrySelected = function(country){
            $scope.order.adresses[$scope.type];
        };

        $scope.defaultLang = $rootScope.languages.find(function (lang) {
            return lang.defaultLanguage;
        }).code;

        TerritoryCountries.query({ PostBody: { filter: { type: 'country' }, limit: 0 } }, function (countries) {
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
                    toastService.toast("success", $translate.instant("order.detail.addressChanged"));
                    $modalInstance.close(3);
                    // $scope.order = Order.get({ orderId: $scope.order._id });
                }else{
                    toastService.toast("danger", $translate.instant("order.detail.errorChangingAddress"));
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
    "$scope", "$modalInstance", "item", "Orders", "$rootScope", "toastService", "genericTools", "type", "OrderPackageInPopupHook", "Shipment", "$translate", "NSConstants",
    function ($scope, $modalInstance, item, Orders, $rootScope, toastService, genericTools, type, OrderPackageInPopupHook, Shipment, $translate, NSConstants) {
        $scope.typePopUp = "new"; // useful for plugin, they can have one controller and one html for the send and return
        $scope.order = angular.copy(item);
        // the Hook for package module
        // note if you want your module by defualt in the popUp, you can add the parameters "default" in the hook
        const codeShipment = $scope.order.delivery.code;
        const orderStatuses = {};
        NSConstants.orderStatus.translation.fr.forEach((ele) => orderStatuses[ele.code] = ele.code)
        $scope.packagePluginHook = [];
        let onePlugin = [];
        if(OrderPackageInPopupHook.length > 0){
            onePlugin = OrderPackageInPopupHook.filter((element) => {
                if(element.default && element.default == true){
                    return true;
                }
                if(element.code_shipment && element.code_shipment == codeShipment){
                    return true;
                }
            });
        }
        if(typeof onePlugin !== "undefined"){
            $scope.packagePluginHook = onePlugin;
        }
        //utils function acces them with $scope.$parent.$parent.utils;
        $scope.utils = {
            order: item,
            type: type,
            genericTools: genericTools
        };
        $scope.error = {
            text: ""
        };
        $scope.disabledAddButton = false;
        $scope.loadingAdd = false;
        $scope.partial = false;
        
        $scope.changeToPartial = function(){
            $scope.partial = true
        }

        $scope.loadImgShipment = function(name, code){
            $scope.shipmentName = name;
            Shipment.detail({
                PostBody: {
                    filter : {
                        code: code
                    },
                    structure: '*',
                }
            },function(response){
                if(response.url_logo){
                    $scope.url_logo = response.url_logo;
                }
            },function(error){
                //not found ?
            });
        }

        $scope.loadImgShipment($scope.order.delivery.name, $scope.order.delivery.code);

        $scope.pkg = {tracking: "", products: []};
        if (type != undefined && type === orderStatuses.DELIVERY_PARTIAL_PROGRESS){
            $scope.partial = true;
        }

        $scope.defaultLang = $rootScope.languages.find(function (lang) {
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
                    selected_variant: $scope.order.items[i].selected_variant,
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

        $scope.setQty = function (index) {
            if($scope.order.items[index].quantity < $scope.pkg.products[index].qty_shipped){
                $scope.pkg.products[index].qty_delivered = 0;
            }else{
                $scope.pkg.products[index].qty_delivered = $scope.order.items[index].quantity - $scope.pkg.products[index].qty_shipped;
            }
        };

        $scope.sendPackage = function () {
            $scope.disabledAddButton = true;
            $scope.loadingAdd = true; // we separate disabledButton and loadingAdd, ike this, a module can use it :)

            var pkg = angular.copy($scope.pkg);
            pkg.status = "full";
            $scope.error.text = "";

            let nbProducts = pkg.products.length;
            for(var count = 0; count < nbProducts; count++) {
                if(pkg.products[count]){
                    if(typeof pkg.products[count].qty_delivered === "undefined"){
                        pkg.products[count].qty_delivered = 0;
                    }
                    if($scope.order.items[count].quantity !== pkg.products[count].qty_delivered) {
                        pkg.status = "partial";
                    }
                    if(pkg.products[count].qty_delivered === 0) {
                        pkg.products.splice(count, 1);
                        count = count - 1;
                    } else {
                        pkg.products[count].qty_shipped = pkg.products[count].qty_delivered;
                    }
                }else{
                    break;
                }
            }

            if(pkg.products.length > 0) {
                if(pkg.tracking != ""){
                    Orders.addPkg({order: $scope.order._id, package: pkg}, function () {
                        toastService.toast("success", $translate.instant("order.detail.addedParcel"));
                        $scope.disabledAddButton = false;
                        $scope.loadingAdd = false;
                        $scope.close();
                    }, function (err) {
                        $scope.disabledAddButton = false;
                        $scope.loadingAdd = false;
                        if(err.data && err.data.translations) {
                            toastService.toast("danger", err.data.translations[$scope.defaultLang]);
                        }else if (err.data.message) {
                            toastService.toast('danger', err.data.message);
                        }else{
                            toastService.toast("danger", $translate.instant("global.standardError"));
                        }
                        $scope.close();
                    });
                }else{
                    $scope.disabledAddButton = false;
                    $scope.loadingAdd = false;
                    $scope.error.text = "order.error.noTrackNum";
                }
            } else {
                $scope.disabledAddButton = false;
                $scope.loadingAdd = false;
                $scope.error.text = "order.error.emptyPkg";
                $scope.partial = true;
            }
        };

        $scope.cancel = function () {
            $modalInstance.dismiss("cancel");
        };

        $scope.close = function(){
            $modalInstance.close();
        }
    }
]);

OrderControllers.controller("RMANewCtrl", [
    "$scope", "$modalInstance", "item", "Orders", "$rootScope", "toastService", "genericTools", "ConfigV2", "orderReturnHook", "$translate", 
    function ($scope, $modalInstance, item, Orders, $rootScope, toastService, genericTools, ConfigV2, orderReturnHook, $translate)
    {
        $scope.typePopUp = "rma"; // useful for plugin, they can have only one controller and one html for the send and return
        // variable
        $scope.order = angular.copy(item);
        $scope.return = {mode: "", comment: "", in_stock: true, sendMail: true, refund: 0, tax: 0, products: []};
        $scope.taxerate = [];
        
        /* 
            Hook for the return (rma) PopUp
            note if you want your module by default in the popUp, you can add the parameters 
            {
                "default:": true
            }
            in the hook
        */
        const codeShipment = $scope.order.delivery.code;
        $scope.packagePluginHook = [];
        let onePlugin = [];
        if(orderReturnHook.length > 0){
            onePlugin = orderReturnHook.filter((element) => {
                if(element.default && element.default == true){
                    return true;
                }
                if(element.code_shipment && element.code_shipment == codeShipment){
                    return true;
                }
            });
        }
        if(typeof onePlugin !== "undefined"){
            $scope.packagePluginHook = onePlugin;
        }

        $scope.error = {
            text: ""
        };
        $scope.disabledButton = false;
        $scope.loadingAdd = false; // we separate disabledButton and loadingAdd, ike this, a module can use it :)

        $scope.defaultLang = $rootScope.languages.find(function (lang)
        {
            return lang.defaultLanguage;
        }).code;

        ConfigV2.get({PostBody: {structure: {taxerate: 1}}}, function (config) {
            $scope.taxerate = config.taxerate;
            $scope.return.tax = config.taxerate[0].rate;
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
                    qty_returning: 0, //default value
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

        $scope.setQty = function (index) {
            $scope.return.refund = 0;
            // if index, the function calculate the returning qty
            if(typeof index !== "undefined") {                
                if($scope.order.items[index].quantity <= $scope.return.products[index].qty_returned) {
                    if($scope.return.products[index].qty_shipped > $scope.return.products[index].qty_returned){
                        $scope.return.products[index].qty_returning = $scope.return.products[index].qty_shipped - $scope.return.products[index].qty_returned;
                    }else{
                        $scope.return.products[index].qty_returning = 0;
                    }
                }else{
                    $scope.return.products[index].qty_returning = $scope.order.items[index].quantity - $scope.return.products[index].qty_returned;
                }
            }
            // we calculate the refund value
            const lengthProducts = $scope.return.products.length;
            for(var i = 0; i < lengthProducts; i++) {
                if(!$scope.return.products[i].qty_returned) {
                    // we put a start value of 0 or the API will be unhappy :( 
                    $scope.return.products[i].qty_returned = 0;
                }
                if($scope.return.products[i].qty_returning > 0) {
                    if((typeof $scope.order.items[i].price.special !== "undefined") && (typeof $scope.order.items[i].price.special.ati !== "undefined")) {
                        $scope.return.refund += $scope.order.items[i].price.special.ati * $scope.return.products[i].qty_returning;
                    }else{
                        $scope.return.refund += $scope.order.items[i].price.unit.ati * $scope.return.products[i].qty_returning;
                    }
                }
            }
        };

        $scope.setQty();

        $scope.cancelItem = function () {
            $scope.disabledButton = true; // no spam click
            $scope.loadingAdd = true;
            var returnData = angular.copy($scope.return);
            $scope.error.text = "";
            
            if(returnData.refund === 0) {
                returnData.mode = "";
            }else{
                // it need a refund mode
                if(!returnData.mode || returnData.mode == ""){
                    $scope.error.text = "order.error.refundMode";
                    $scope.disabledButton = false;
                    $scope.loadingAdd = false;
                    return
                }
            }

            let nbProducts = returnData.products.length;
            for(let count = 0; count < nbProducts; count++) {
                if(returnData.products[count]){
                    if(typeof returnData.products[count].qty_returning === "undefined"){
                        returnData.products[count].qty_returning = 0;
                    }
                    if(returnData.products[count].qty_returning === 0){
                        returnData.products.splice(count, 1);
                        count = count - 1;
                    } else {
                        returnData.products[count].qty_returned = returnData.products[count].qty_returning;
                    }
                }else{
                    break;
                }
            }

            if(returnData.products.length > 0) {
                Orders.rma({order: $scope.order._id, return: returnData, lang: $scope.defaultLang}, function () {
                    toastService.toast("success", $translate.instant("order.detail.returnAdded"));
                    $scope.disabledButton = false;
                    $scope.loadingAdd = false;
                    $scope.close();
                }, function (err) {
                    $scope.disabledButton = false;
                    $scope.loadingAdd = false;
                    toastService.toast("danger", $translate.instant("global.standardError"));
                    if(err.data){
                        if(err.data.translations) {
                            toastService.toast("danger", err.data.translations[$scope.defaultLang]);
                        }else if(err.data.message) {
                            toastService.toast("danger", err.data.message);
                        }
                    }
                    $scope.close();
                });
            } else {
                $scope.disabledButton = false;
                $scope.loadingAdd = false;
                $scope.error.text = "order.error.noReturnDef";
            }
        };

        $scope.cancel = function () {
            $modalInstance.dismiss("cancel");
        };
        $scope.close = function() {
            $modalInstance.close();
        }
    }
]);

OrderControllers.controller("InfoPaymentNewCtrl", [
    "$scope", "$modalInstance", "item", "status", "Orders", "$rootScope", "toastService", "$translate", "NSConstants",
    function ($scope, $modalInstance, item, status, Orders, $rootScope, toastService, $translate, NSConstants) {
        $scope.order = angular.copy(item);
        const orderStatuses = {};
        NSConstants.orderStatus.translation.fr.forEach((ele) => orderStatuses[ele.code] = ele.code)
        $scope.error = {
            text: ""
        };
        $scope.return = {
            comment: "",
            mode: "",
            sendMail: true,
            amount: Number($scope.order.priceTotal.ati.aqlRound(2)),
            type: "CREDIT",
            status: "DONE",
            products: []
        };

        $scope.pay = {
            disabled: false,
        };
    
        if(status && status == orderStatuses.PAID){
            $scope.return.type = "DEBIT";
            $scope.pay.disabled = true;
        }

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

        $scope.setQty = function (index) {
            $scope.return.refund = 0;

            if(typeof index !== "undefined") {
                if($scope.order.items[index].quantity < $scope.return.products[index].qty_returned){
                    $scope.return.products[index].qty_returning = 0;
                }else{
                    $scope.return.products[index].qty_returning = $scope.order.items[index].quantity - $scope.return.products[index].qty_returned;
                }
            }

            for(var i = 0; i < $scope.return.products.length; i++) {
                if(typeof $scope.return.products[i].qty_returning === "undefined"){
                    $scope.return.products[i].qty_returning = 0;
                }
                if($scope.return.products[i].qty_returning > 0) {
                    if((typeof $scope.order.items[i].price.special !== "undefined") && (typeof $scope.order.items[i].price.special.ati !== "undefined") ){
                        $scope.return.refund = $scope.order.items[i].price.special.ati * $scope.return.products[i].qty_returning;
                    }else{
                        $scope.return.refund = $scope.order.items[i].price.unit.ati * $scope.return.products[i].qty_returning;
                    }
                }
            }
        };

        $scope.validateInfoPayment = function ()
        {
            var returnData = angular.copy($scope.return);
            $scope.error.text = "";

            delete returnData.sendMail;
            Orders.infoPayment({order: $scope.order._id, params: returnData, sendMail: $scope.return.sendMail, lang: $scope.defaultLang}, function ()
            {
                toastService.toast("success", $translate.instant("order.detail.paymentInfoAdded"));
                $scope.close();
            }, function (err)
            {
                toastService.toast("danger", $translate.instant("global.standardError"));
                if(err.data && err.data.translations)
                {
                    toastService.toast("danger", err.data.translations[$scope.defaultLang]);
                }
                $scope.close();
            });
        };

        $scope.cancel = function ()
        {
            $modalInstance.dismiss("cancel");
        };

        $scope.close = function ()
        {
            $modalInstance.close("cancel");
        };
    }
]);
