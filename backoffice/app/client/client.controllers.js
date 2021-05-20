const ClientControllers = angular.module("aq.client.controllers", []);

ClientControllers.controller("ClientCtrl", [
    "$scope", "$location", "ClientSearch", "Client", "toastService", "ClientColumns", "User", "$http", "ExportCollectionCSV", "ClientV2",
    function ($scope, $location, ClientSearch, Client, toastService, ClientColumns, User, $http, ExportCollectionCSV, ClientV2) {
        $scope.columns = ClientColumns;
        $scope.query = {search: ""};
        $scope.page = 1;
        $scope.nbItemsPerPage = 10;
        $scope.maxSize = 5;
        $scope.filter = {};
        $scope.valeurTri = -1;
        $scope.tri = {createdAt : -1}
        
        function getFilter(){
            let filter = {};
            const filterKeys = Object.keys($scope.filter);
            for (let i = 0, leni = filterKeys.length; i < leni; i++) {
                if($scope.filter[filterKeys[i]] === null){
                    break;
                }
                if(filterKeys[i].includes("company")) {
                    if($scope.filter.company != ""){
                        filter["company.name"] = { $regex: $scope.filter.company, $options: "i" };
                    }
                } else if (filterKeys[i].includes("min_") || filterKeys[i].includes("max_")) {
                    const key = filterKeys[i].split("_");
                    const value = $scope.filter[filterKeys[i]];

                    if (filter[key[1]] === undefined) {
                        filter[key[1]] = {};
                    }
                    filter[key[1]][key[0] === "min" ? "$gte" : "$lte"] = key[1].toLowerCase().includes("date") ? value.toISOString() : value;
                } else {
                    if (typeof ($scope.filter[filterKeys[i]]) === 'object'){
                        filter[filterKeys[i] + ".number"] = { $regex: $scope.filter[filterKeys[i]].number, $options: "i" };
                    }else{
                        if($scope.filter[filterKeys[i]].toString() != ""){
                            filter[filterKeys[i]] = { $regex: $scope.filter[filterKeys[i]].toString(), $options: "i" };
                        }
                    }
                }
            }
            filter["isAdmin"] = false;
            return filter;
        }
        $scope.sortSearch = function(name, pageNumber){
            if($scope.valeurTri == 1){
                $scope.valeurTri = -1;
            }else{
                $scope.valeurTri = 1;
            }
            if(name){
                $scope.tri = { [name]: $scope.valeurTri};
            }
            if(pageNumber){
                $scope.page = pageNumber;
            }
            let filter = getFilter();
            ClientV2.list({type: "users"}, {PostBody : {
                filter,
                structure : {createdAt: 1, company : 1},
                page      : $scope.page,
                limit     : $scope.nbItemsPerPage,
                sort      : $scope.tri
            }}, function (response) {
                $scope.clients = response.datas;
                $scope.totalClients = response.count;
            }, function(error){
                console.error(error);
                //deal with error here
            });
        }


        $scope.onClientsPageChange = function (page) {

            const search = $scope.query;
            let pageAdmin = { location: "clients", page: 1 };
            if (window.localStorage.getItem("pageAdmin") !== undefined && window.localStorage.getItem("pageAdmin") !== null) {
                pageAdmin = JSON.parse(window.localStorage.getItem("pageAdmin"));
            }
            if (page === undefined && pageAdmin.location === "clients") {
                const pageSaved = pageAdmin.page;
                $scope.page = pageSaved;
                $scope.currentClientsPage = pageSaved;
                page = pageAdmin.page;

                if (pageAdmin.search !== undefined && pageAdmin.search !== null) {
                    $scope.query = pageAdmin.search;
                }
            } else {
                window.localStorage.setItem("pageAdmin", JSON.stringify({ location: "clients", page, search }));
                $scope.page = page;
                $scope.currentClientsPage = page;
                window.scrollTo(0, 0);
            }

            $scope.currentClientsPage = page;
            let filter = getFilter();
            ClientV2.list({type: "users"}, {PostBody : {
                filter,
                structure : {createdAt: 1, company : 1},
                page,
                limit     : $scope.nbItemsPerPage,
                sort      : $scope.tri
            }}, function (response) {
                $scope.clients = response.datas;
                $scope.totalClients = response.count;
            });

        };
        $scope.search = function () {
            $scope.onClientsPageChange(1);
        };

        setTimeout(function () { //Obligé de timer sinon la requete s'effectue deux fois à cause du on-select-page du html
            $scope.onClientsPageChange();
        }, 100);

        $scope.goToClientDetails = function (clientId) {
            $location.path(`/clients/${clientId}`);
        };

        $scope.export = ExportCollectionCSV;
    }
]);

ClientControllers.controller("ClientDetailCtrl", [
    "$scope", "$routeParams", "$location", "toastService", "ClientFields", "ClientBlocks", "Orders", "Carts", "Newsletter",
    "$rootScope", "ClientAdmin", "ClientCountry", "ActivateAccount", "ProductsV2", "TerritoryCountries", 'SetAttributesV2', 'AttributesV2', 'ClientV2', 'RulesV2', "$translate",
    function ($scope, $routeParams, $location, toastService, ClientFields, ClientBlocks, Orders, Carts,
         Newsletter, $rootScope, ClientAdmin, ClientCountry, ActivateAccount, ProductsV2, TerritoryCountries, SetAttributesV2, AttributesV2, ClientV2, RulesV2, $translate) {
        $scope.isEditMode = false;

        $scope.fields = ClientFields;
        $scope.blocks = ClientBlocks;
        $scope.rules = [];
        $scope.countries = [];
        $scope.setAttributes = [];
        $scope.lang = '';
        $scope.civilities = [
            {
                code : 0,
                name : "client.detail.address.civility.0"
            },
            {
                code: 1,
                name: "client.detail.address.civility.1"
            }
        ];

        $scope.downloadHistory = []
        $scope.downloadHistoryItemsPerPage = 20;
        $scope.downloadHistoryPage = 1;
        $scope.downloadHistoryCount = 0;

        $scope.lang = $rootScope.languages.find(function (lang) {
            return lang.defaultLanguage;
        }).code;

        if ($scope.langChange) {
            $scope.langChange($scope.lang);
        }

        getAttributesClient = function(){
            SetAttributesV2.list({PostBody: {filter: { type: 'users' }, limit: 99, structure: '*', populate: ['attributes']}}, function ({datas}) {
                $scope.setAttributes = datas;

                if ($scope.client && $scope.client.set_attributes === undefined) {
                    const set_attributes = datas.find(function (setAttr) {
                        return setAttr.code === "defautUser";
                    });
                    if (set_attributes) {
                        $scope.client.set_attributes = set_attributes._id;
                        $scope.loadNewAttrs();
                    }

                }
                // $scope.address.civility = $scope.client.addresses[0].civility;
            });
        }


        $scope.itemObjectSelected = function (item) {
            $scope.selectedDropdownItem = item.type;
        };

        $scope.filterDropdown = function (userInput) {
            if (userInput !== undefined) {
                $scope.selectedDropdownItem = userInput;
            }
            $scope.dropdownItems = [];
            return ClientV2.getUserTypes({query: userInput || ""}).$promise.then(function (response) {
                $scope.dropdownItems = response.map(function (item) {
                    const dropdownObject = angular.copy(item);
                    dropdownObject.readableName = item.type;
                    return dropdownObject;
                });
                return $scope.dropdownItems;
            });
        };

        $scope.filterDropdown();

        if ($routeParams.clientId !== "new") {
            Orders.list({PostBody: {filter: {['customer.id']: $routeParams.clientId}, limit: 99}}, function(response) {
                $scope.orders = response.datas;
            })
            $scope.carts = Carts.getCarts({param: $routeParams.clientId});
            $scope.rules = ClientV2.testUser({user_id: $routeParams.clientId});
            TerritoryCountries.query({ PostBody: { filter: { type: 'country' }, limit: 99 } }, function (countries) {
                $scope.countries = countries;
                $scope.countries.datas.forEach(function (country, i) {
                    $rootScope.languages.forEach(lang => {
                        if (country.translation && country.translation[lang.code] === undefined) {
                            $scope.countries.datas[i].translation[lang.code] = {};
                            $scope.countries.datas[i].translation[lang.code].name = country.code;
                        }
                    })
                });
            });
            // On récupere les rules  de type discount
            $scope.rules.$promise.then(function (result) {
                $scope.rules = result;
            });

            $scope.client = {};

            ClientV2.query({PostBody: {filter: {_id: $routeParams.clientId}, structure: '*', limit: 1}}, function (response) {
                if (response._id === undefined) {
                    toastService.toast("danger", $translate.instant("global.customerNotExist"));
                    $location.path("/clients");
                }
                $scope.client = response;
                $scope.civilities.find(function (element) {
                    if($scope.client.addresses.length !== 0){
                        if ($scope.client.addresses[0].civility == element.code) {
                            element.active = true;
                            // $scope.address.civility = $scope.client.addresses[0].civility;
                        }
                    }
                });

                {
                    //On récupére le nom des pays des adresses
                    for(let i = 0; i < $scope.client.addresses.length; i++)
                    {
                        var isoCountryCode = $scope.client.addresses[i].isoCountryCode;
                        if(isoCountryCode){
                            ClientCountry.query({PostBody: {filter: {code: isoCountryCode}}}, function (response)
                            {
                                // On récupére le nom du pays
                                $scope.client.addresses[i].country = response.name;
                            }, function (error) {
                                console.error("Impossible de récupérer le pays des clients", error);
                                // si une erreur se produit on met le code iso du pays dans country
                                $scope.client.addresses[i].country = $scope.client.addresses[i].isoCountryCode;
                            });
                        }
                    }
                }

                // recup les attributs (tous les attr users en gros)
                genAttributes();

                $scope.selectedDropdownItem = $scope.client.type ? $scope.client.type : "";

                Newsletter.list({email: $scope.client.email}, function (response) {
                    $scope.newsletter = response;
                });

                $scope.client.oldEmail = response.email;
                $scope.isEditMode = true;

                // on recup ceux lié a cet user
                getAttributesClient();

                $scope.downloadHistoryFilters = {$and: [{[`product.translation.${$rootScope.adminLang}.name`]: {$regex: "", $options: "i"}}, { "user.email": $scope.client.email}]}
                $scope.downloadHistoryQueryKey =`product.translation.${$rootScope.adminLang}.name`

                $scope.getDownloadHistory = function (page = 1) {
                    ProductsV2.getDownloadHistory({PostBody: {filter: $scope.downloadHistoryFilters, limit: $scope.downloadHistoryItemsPerPage, page: page, structure: '*'}}, function (response) {
                        $scope.downloadHistory = response.datas
                        $scope.downloadHistoryCount = response.count
                        $scope.downloadHistoryPage = response.page
                    })
                }
            });
        } else {
            $scope.client = {};
        }


        $scope.detail = function (promo) {
            $location.url(`/promos/${promo._id}`);
        };

        $scope.setStatus = function (name, status) {
            Newsletter.query({email: $scope.client.email}, {
                name,
                optin : !status
            }, function (response) {
                $scope.newsletter = response;
            });
        };

        $scope.save = function (isQuit) {
            if ($scope.client.attributes) {
                for (let i = 0; i < $scope.client.attributes.length; i++) {
                    const attr = $scope.client.attributes[i];
                    if (attr.type === "Intervalle" || attr.type === "interval") {
                        const attrTransKeys = Object.keys(attr.translation);
                        for (let j = 0; j < attrTransKeys.length; j++) {
                            const lang = attrTransKeys[j];
                            attr.translation[$scope.lang].value = [];
                            if (attr.translation[$scope.lang].min <= attr.translation[$scope.lang].max) {
                                for (let k = attr.translation[$scope.lang].min; k < attr.translation[$scope.lang].max + 1; k++) {
                                    attr.translation[$scope.lang].value.push(k);
                                }

                                delete attr.translation[$scope.lang].min;
                                delete attr.translation[$scope.lang].max;
                            } else if (attr.translation[$scope.lang].min !== undefined && attr.translation[$scope.lang].max !== undefined && attr.translation[$scope.lang].min !== "" && attr.translation[$scope.lang].max !== "") {
                                attrsErrors = true;
                                toastService.toast("danger", `Le minimum de l'attribut ${attr.translation[$scope.lang].name}(${lang}) est plus grand que le maximum`);
                            }
                        }
                    } else if ((attr.type === "Couleur" || attr.type === "color") && !(/\#([a-z0-9]{3}|[a-z0-9]{6})$/i).test(attr.translation[$scope.lang].value)) {
                        attrsErrors = true;
                        toastService.toast("danger", $translate.instant("global.incorrectHex"));
                        return;
                    }
                }
            }
            $scope.form.nsSubmitted = true;
            if ($scope.form.$invalid) {
                toastService.toast("danger", $translate.instant("global.invalidEntry"));
                return;
            }
            $scope.client.type = $scope.selectedDropdownItem === "" ? null : $scope.selectedDropdownItem;

            $scope.disableSave = !$scope.isEditMode;

            ClientV2.save($scope.client, function(response) {
                for(var i = 0; i < $scope.blocks.length; i++)
                {
                    if($scope.blocks[i].callback)
                    {
                        $scope.blocks[i].callback();
                    }
                }
                if (isQuit) {
                    $location.path("/clients");
                } else {
                    toastService.toast("success", $translate.instant("global.infoSaved"));
                    $location.path(`/clients/${response.user._id}`);
                }
            }, function(err) {
                console.error(err)
                if(err.data.code === 'login_subscribe_email_existing') {
                    if(err.data && err.data.translations && err.data.translations[$rootScope.adminLang]){
                    toastService.toast('danger', err.data.translations[$rootScope.adminLang]);
                    }else{
                        toastService.toast('danger', $translate.instant("global.alreadyExistEmail"));
                    }
                }else{
                    toastService.toast('danger', err.data.message);
                }
            })
        };

        $scope.remove = function () {
            if (confirm("Etes-vous sûr de vouloir supprimer ce client ? Ses commandes seront également supprimées !")) {
                ClientV2.delete({type: 'user', id: $scope.client._id}, function (response) {
                    toastService.toast("success", $translate.instant("global.customerDeleted"));
                    $location.path("/clients");
                });
            }
        };

        const loginAdminAsClient = function () {
            ClientAdmin.logAsClient({_id: $scope.client._id}, function (response) {
                document.cookie = `jwt=${response.data};path=/`;
                toastService.toast("success", $translate.instant("global.customerConnected"));
            });
        };

        const submitResetRequest = function () {
            if ($scope.client.email !== undefined && $scope.client.email != ""
                && new RegExp(/^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i).test($scope.client.email)) {
                const userRes = ClientV2.resetpassword({email: $scope.client.email, lang: $scope.client.preferredLanguage}, function () {
                    $scope.mailError = undefined;
                    toastService.toast("success", $translate.instant("global.requestSend"));
                }, function (res) {
                    if (res.data != null) {
                        toastService.toast("danger", res.data.message);
                    } else {
                        toastService.toast("danger", $translate.instant("global.errorContactAdmin"));
                    }
                });
            } else {
                toastService.toast("danger", $translate.instant("global.customerEmailinvalid"));
            }
        };
        const submitActiveAccountRequest = function () {
            ActivateAccount.query({userId: $scope.client._id, lang: $scope.adminLang}, function (resp) {
                if (resp.accepted && resp.accepted.length) {
                    toastService.toast("success", $translate.instant("global.confirmationEmailSent"));
                } else {
                    toastService.toast("danger", $translate.instant("global.errorSendMail"));
                }
            }, function (res) {
                if (res.data != null) {
                    toastService.toast("danger", res.data.translations[$scope.adminLang]);
                } else {
                    toastService.toast("danger", $translate.instant("global.errorContactAdmin"));
                }
            });
        };

        $scope.momentDate = function (date) {
            if (date === null) {
                return '*';
            }
            return moment(date).format('L');
        };


        $scope.loadNewAttrs = async function () {
            AttributesV2.list({PostBody: {filter: {set_attributes: $scope.client.set_attributes, _type: 'users'}, structure: '*', limit: 99}}, function ({datas}) {
                //console.log(datas)
                $scope.client.attributes = datas.map(function (attr) {
                    attr.id = attr._id;
                    delete attr._id;
                    return attr;
                });
            });
        };

        $scope.applyAttributes = function () {
            $scope.client.attributes = $scope.setAttributes.attributes
        }

        function genAttributes() {
            angular.forEach($scope.client.attributes, function (attributeI) {
                AttributesV2.query({PostBody: {filter: {_id: attributeI.id, _type: 'users'}, structure: '*'}}, function (attribute) {
                    const langKeys = Object.keys(attribute.translation);

                    if (attributeI.translation === undefined) {
                        attributeI.translation = {};
                    }

                    for (let i = 0; i < langKeys.length; i++) {
                        if (attributeI.translation[langKeys[i]] === undefined) {
                            attributeI.translation[langKeys[i]] = {};
                        }

                        attributeI.translation[langKeys[i]].name = attribute.translation[langKeys[i]].name;
                        if (attribute.type === "Intervalle" && attributeI.translation[langKeys[i]].value && attributeI.translation[langKeys[i]].value.length > 0) {
                            attributeI.translation[langKeys[i]].min = attributeI.translation[langKeys[i]].value.min();
                            attributeI.translation[langKeys[i]].max = attributeI.translation[langKeys[i]].value.max();
                        }

                        if (attribute.translation[langKeys[i]].values) {
                            attributeI.translation[langKeys[i]].values = attribute.translation[langKeys[i]].values;
                        }
                    }

                    attributeI.type = attribute.type;
                    attributeI.code = attribute.code;
                    attributeI.param = attribute.param;
                    attributeI.position = attribute.position;
                });
            });
        }

        $scope.additionnalButtons = [
            {
                text: 'client.detail.connectAs',
                onClick: function () {
                    loginAdminAsClient();
                },
                icon: '<i class="fa fa-user-secret" aria-hidden="true"></i>',
            }
        ];

        $scope.moreButtons = [
            {
                text: 'client.detail.resetMdp',
                onClick: function () {
                    submitResetRequest();
                },
                icon: '<i class="fa fa-eraser" aria-hidden="true"></i>',
            },
            {
                text: 'client.detail.activeAccount',
                onClick: function () {
                    submitActiveAccountRequest();
                    //pas de controle de succes/erreur ? de toast ?
                },
                icon: '<i class="fa fa-envelope-o" aria-hidden="true"></i>',
                isDisplayed: !$scope.client.isActiveAccount
            }
        ];

    }
]);
