let PromoControllers = angular.module("aq.promo.controllers", []);

/**
 * Controller de la page contenant la liste des Promos
 */
PromoControllers.controller("PromoListCtrl", [
    "$scope", "$location", "PromosV2", function ($scope, $location, PromosV2) {
        $scope.maxSize = 10;
        $scope.nbPromosPerPage = 10;
        $scope.page = 1;
        $scope.totalPromos = 0;
        $scope.searchPromoByName = "";
        $scope.sort = {type: "createdAt", reverse: false};
        $scope.filter = {};

        $scope.detail = function (promo) {
            $location.url(`/promos/${promo._id}`);
        };
        $scope.getPromos = function (page, filter) {
            query = {PostBody: {filter: {_id: {$exists: true}}, structure: '*', page: page, limit: $scope.nbPromosPerPage, sort: {[$scope.sort.type]: $scope.sort.reverse ? 1 : -1}}};
            if (filter) {
                query.PostBody.filter = filter;
            }
            PromosV2.list(query, function ({datas, count}) {
                $scope.totalPromos = count;
                $scope.promos = datas;
            }, function (reject) {
                console.error(reject);
            });
        };
        $scope.getPromos($scope.page);

        $scope.momentDate = function (date) {
            if (date === null) {
                return "";
            }
            return moment(date).format("L, LTS");
        };
        $scope.search = function (searchPromoByName) {
            $scope.searchPromoByName = searchPromoByName;
            $scope.onPageChange(1, {name: {$regex: searchPromoByName, $options: "i"}});
        };

        $scope.getPromo = function (page) {
            $scope.page = page;
            $scope.getPromos($scope.page, getFilter());
        };

        $scope.onPageChange = function (page) {
            $scope.page = page;
            $scope.getPromos($scope.page, getFilter());
        };

        function getFilter(){
            let filter = {};
            const filterKeys = Object.keys($scope.filter);
            for (let i = 0, leni = filterKeys.length; i < leni; i++) {
                if($scope.filter[filterKeys[i]] === null){
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
                } else if(filterKeys[i].includes("active")) {
                    if($scope.filter.active == "true"){
                        filter["actif"] = true;
                    }else if($scope.filter.active == "false"){
                        filter["actif"] = false;
                    }
                } else if(filterKeys[i].includes("nextRules")) {
                    if($scope.filter.nextRules == "true"){
                        filter["applyNextRules"] = true;
                    }else if($scope.filter.nextRules == "false"){
                        filter["applyNextRules"] = false;
                    }
                } else if(filterKeys[i].includes("priority")) {
                    if($scope.filter.priority != ""){
                        filter["priority"] = $scope.filter.priority;
                    }
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
            return filter;
        }
    }
]);


/**
 * Controller de la page contenant le detail d'un Promo
 */
PromoControllers.controller("PromoDetailCtrl", [
    "$scope", "$q", "$routeParams", "$modal", "$location", "toastService", "PromosV2", "PromoCheckOrderById", "RulesV2", "PromoClone", "PromoCodeV2", "$translate",
    function ($scope, $q, $routeParams, $modal, $location, toastService, PromosV2, PromoCheckOrderById, RulesV2, PromoClone, PromoCodeV2, $translate) {
        $scope.promo = {
            discountType         : null,
            actif                : false,
            gifts                : [],
            codes                : [],
            dateStart            : null,
            dateEnd              : null,
            priority             : 0,
            applyNextRules       : false,
            discountValue        : 0,
            discountValueMessage : false
        };
        $scope.rule = {
            conditions : []
        };
        $scope.filter = {};
        $scope.filterCode = [];
        $scope.searchPromoByName = "";
        $scope.sort = {type: "createdAt", reverse: false};
        $scope.dateIsValid = true;
        $scope.tabActive = "general";
        $scope.gifts = [{value: "", isValid: false}];
        $scope.timeStart = {hours: "00", minutes: "00"};
        $scope.timeEnd = {hours: "00", minutes: "00"};
        // Permet de switch entre une promotion dans laquelle on offre des produits et une promotion dans laquelle on offre une reduction
        $scope.discountCategory = "discount";
        $scope.actions = [];

        if ($routeParams.promoId != "new") {
            $scope.isEditMode = true;
            // On appel les rules
        } else {
            // Mode création
            $scope.isEditMode = false;
        }
        /**
         * Permet de checker les code promo matchant avec la recherche utilisateur
         */
        $scope.searchCodeByField = function () {
            let tCodes = [...$scope.promo.codes];
            let nbDelete = 0;
            for (let i = 0; i < $scope.promo.codes.length; i++) {
                let oCode = $scope.promo.codes[i];
                let isNotFound = false;
                let tFields = Object.entries($scope.filter);
                for (let j = 0; j < tFields.length; j++) {
                    const [key, value] = tFields[j];
                    // Si aucune valeur n'est présente, ou que oCode[key] === null (dans le cas d'une utilisation de code infini)
                    // alors on passe a la key,value suivante
                    if (!value || oCode[key] === null) {
                        continue;
                    }
                    let fieldValue = oCode[key].toString();
                    // Si une valeur n'est pas trouvé alors on sort de la boucle et en met isNotFound a true
                    // Ce qui supprimera le tCodes[i]
                    if (!fieldValue.includes(value)) {
                        isNotFound = true;
                        break;
                    }
                }
                if (isNotFound === true) {
                    tCodes.splice(i - nbDelete, 1);
                    nbDelete++;
                }
            }
            $scope.filterCode = tCodes;
        };
        /**
         * Fonction permettant d'afficher ou non les codes promos (en fonction des filtres si ils sont set)
         * @param {*} code
         */
        $scope.checkSearch = function (code) {
            let filterExists = false;
            // Si aucun filtre n'est défini alors on affiche les codes promos
            let tFields = Object.entries($scope.filter);
            for (let i = 0; i < tFields.length; i++) {
                const [key, value] = tFields[i];
                // Si aucune valeur n'est présente, on passe a la key,value suivante
                if (!value) {
                    continue;
                }
                filterExists = true;
            }
            // Si filterExists est false alors on affiche les codes promos sans restriction de recherche
            if (!filterExists) {
                return true;
            }
            if ($scope.filterCode.length) {
                let tCode = $scope.filterCode.filter(function (filterCode) {
                    return filterCode._id === code._id;
                });
                // On affiche l'item car il a été trouvé avecd les bons filtre
                if (tCode.length) {
                    return true;
                }
                return false;
            }
        };

        // check the discount value and alert if it is negative
        $scope.checkDiscount = function (){
            if($scope.promo.discountType == "FVet" || $scope.promo.discountType == "FVati"){
                $scope.promo.discountValueMessage = false;
                if($scope.promo.discountValue < 0 ){
                    $scope.promo.discountValue = 0;
                }
            }else{
                if($scope.promo.discountValue < 0 ){
                    $scope.promo.discountValueMessage = true;
                }else{
                    $scope.promo.discountValueMessage = false;
                }
            }
        }

        // Permet de recupérer une promo en fonction de son id
        $scope.PromoGetById = function () {
            PromosV2.query({PostBody: {filter: {_id: $routeParams.promoId}, structure: '*'}}, function (promo) {
                $scope.promo = promo;
                $scope.checkDiscount();
                let dateStart = $scope.promo.dateStart;
                let dateEnd = $scope.promo.dateEnd;
                // on ajoute les heures et minutes au objet timeStart et timeEnd
                $scope.timeStart = {hours: new Date(dateStart).getUTCHours(), minutes: new Date(dateStart).getUTCMinutes()};
                $scope.timeEnd = {hours: new Date(dateEnd).getUTCHours(), minutes: new Date(dateEnd).getUTCMinutes()};
                // Si le tableau gifts n'est pas = a 0 alors on met le discountCategory en gifts sinon on laisse en discount
                if ($scope.promo.gifts.length) {
                    $scope.discountCategory = "gifts";
                    $scope.gifts = $scope.promo.gifts.map(function(gift) {return ({value: gift, isValid: true})});
                }
            });
            RulesV2.query({PostBody: {filter: {owner_id: $routeParams.promoId, owner_type: "discount"}, structure: '*'}}, function (rule) {
                if (rule.operand === undefined) {
                    Object.assign($scope.rule, {owner_id: $routeParams.promoId, conditions: [], other_rules: []});
                } else {
                    $scope.rule = rule;
                }
            });
            RulesV2.list({PostBody: {filter: {owner_id: $routeParams.promoId, owner_type: "discountAction"}, structure: '*', limit: 0}}, function ({datas}) {
                $scope.actions = datas;

                $scope.promo.actions = datas.map(function (action) {
                    return action._id;
                });
            });
        };
        // On récupére le document uniquement si nous sommes en mode edit
        if ($scope.isEditMode) {
            $scope.PromoGetById();
        } else {
            // Permet de lancer un modal au lancement de la page
            $modal.open({
                templateUrl : "app/promo/views/modals/promo-type.html",
                controller  : "PromoDetailTypeCtrl"
            }).result.then(function (type) {
                $scope.promo.type = type;
            }, function (reject) {
                // Si "annuler" ou si on ferme la modal alors on retourne sur la page /promos
                $location.path("/promos");
            });
        }

        /**
         * Lors de la sauvegarde on check la validité des orderId, les orderId non valide ne seront pas ajoutés a promo.gifts
         */
        function processGifts() {
            $scope.promo.gifts = [];
            for (let i = 0; i < $scope.gifts.length; i++) {
                let gift = $scope.gifts[i];
                if (!gift.isValid) {
                    continue;
                }
                $scope.promo.gifts.push(gift.value);
            }
        }

        /**
         * Fonction permettant d'ajouter les heures et minutes a la date
         */
        function createDate() {
            if ($scope.promo.dateStart) {
                let dateStart = new Date($scope.promo.dateStart);
                dateStart.setHours($scope.timeStart.hours);
                dateStart.setMinutes($scope.timeStart.minutes);
                $scope.promo.dateStart = dateStart;
            }
            if ($scope.promo.dateEnd) {
                let dateEnd = new Date($scope.promo.dateEnd);
                dateEnd.setHours($scope.timeEnd.hours);
                dateEnd.setMinutes($scope.timeEnd.minutes);
                $scope.promo.dateEnd = dateEnd;
            }
        }

        /**
         * Fonction permettant de verifier que la date de début est plus petite que la date de fin
         */
        $scope.compareDate = function () {
            createDate();
            // Si une des deux dates n'est pas défini alors on ne compare pas
            if (!$scope.promo.dateStart || !$scope.promo.dateEnd) {
                return;
            }
            if ($scope.promo.dateStart.getTime() >= $scope.promo.dateEnd.getTime()) {
                $scope.dateIsValid = false;
            } else {
                $scope.dateIsValid = true;
            }
        };
        /**
         * On verifie que les heures sont bien entrées par l'utilisateur
         * @param {*} time
         */
        $scope.checkHours = function (time) {
            // Si time est undefined (qu'il ne passe pas les regex dans le pattern) alors on set l'heure a 00
            if (typeof time.hours === "undefined") {
                time.hours = "00";
            }
            $scope.compareDate();
        };
        /**
         * On verifie que les minutes sont bien entrées par l'utilisateur
         * @param {*} time
         */
        $scope.checkMinutes = function (time) {
            // Si time est undefined (qu'il ne passe pas les regex dans le pattern) alors on set les minutes a 00
            if (typeof time.minutes === "undefined") {
                time.minutes = "00";
            }
            $scope.compareDate();
        };
        /**
         * Permet de changer d'onglet et d'afficher le bon contenu
         * @param {*} tabActive
         */
        $scope.changeTab = function (tabActive) {
            if ($scope.promo.type === "2" && tabActive === "code_promo") {
                return;
            }
            if (!$scope.isEditMode && (tabActive === "segmentation" || tabActive === "action")) {
                return;
            }
            $scope.tabActive = tabActive;
        };
        // Ajoute un objet gift
        $scope.addGift = function () {
            $scope.gifts.push({value: "", isValid: false});
        };
        $scope.addPromo = function () {
            // Permet de lancer un modal lorsque l'utilisateur ajoute un nouveau code promo
            $modal.open({
                templateUrl : "app/promo/views/modals/add-code-promo.html",
                controller  : "PromoDetailAddCodePromoCtrl"
            }).result.then(function (codePromo) {
                // Si null alors nombre illimité de code
                if (!codePromo.limit_total || codePromo.limit_total.trim() === "*") {
                    codePromo.limit_total = null;
                }
                if (!codePromo.limit_client || codePromo.limit_client.trim() === "*") {
                    codePromo.limit_client = null;
                }
                $scope.promo.codes.push(codePromo);
                $scope.form.$dirty = true;
            });
        };

        $scope.removePromo = function (codeId) {
            let code = $scope.promo.codes.findIndex(x => x._id === codeId);
            $scope.promo.codes.splice(code,1);
            $scope.form.$dirty = true; 
            return;
        };


        /**
         * Supprime l'objet gift dont l'index est passé en parametre
         * @param {*} i
         */
        $scope.removeGift = function (i) {
            $scope.gifts.splice(i, 1);
        };
        /**
         * On verifie si l'order id ajouté dans l'input existe en base de données
         * @param {*} elem element html
         */
        $scope.PromoCheckOrderById = function (elem) {
            if (!elem.gift.value) {
                return;
            }
            PromoCheckOrderById.query({_id: elem.gift.value}, {}, function (order) {
                $scope.gifts[elem.$index].isValid = true;
            }, function (reject) {
                $scope.gifts[elem.$index].isValid = false;
            });
        };

        // === action === //
        $scope.addAction = function () {
            $scope.actions.push({owner_id: $routeParams.promoId, conditions: [], effects: [], other_rules: []});
        };

        $scope.removeAction = function (index) {
            $modal.open({
                template : "<div style='text-align: center; padding: 20px;'>"
                    + "    <h2>Supprimer l'action</h2>"
                    + "    <p>Etes vous sur de vouloir supprimer cette condition ?</p>"
                    + "    <div class='row'>"
                    + "        <button type='button' class='btn btn-danger' ng-click='cancel()'>Non</button>"
                    + "        <button type='button' class='btn btn-info' ng-click='yes()'>Oui</button"
                    + "    </div>"
                    + "</div>", // loads the template
                scope       : $scope,
                backdrop    : true, // setting backdrop allows us to close the modal window on clicking outside the modal window
                windowClass : "modal", // windowClass - additional CSS class(es) to be added to a modal window template
                controller: function ($scope, $modalInstance)
                {
                    $scope.yes = function ()
                    {
                        $modalInstance.close($scope.actions.splice(index, 1)[0]);
                    };
                    $scope.cancel = function ()
                    {
                        $modalInstance.dismiss("cancel");
                    };
                }
            }).result.then(function (removedAction) {
                if (removedAction._id) {
                    RulesV2.delete({id: removedAction._id}, function () {
                        let removedActionIndex = $scope.promo.actions.findIndex(function (action) {
                            return action === removedAction._id;
                        });
                        if (removedActionIndex !== -1) {
                            $scope.promo.actions.splice(removedActionIndex, 1);
                        }
                    });
                }
            });
        };

        function saveActions(deferred) {
            if ($scope.actions.length > 0) {
                let actionPromises = [];

                for (let i = 0, leni = $scope.actions.length; i < leni; i++) {
                    actionPromises.push(RulesV2.save($scope.actions[i]).$promise);
                }

                Promise.all(actionPromises).then(function (response) {
                    toastService.toast("success", $translate.instant("promo.detail.actionSaved"));
                    $scope.actions = response;
                    // On enregistre les ids des actions dans la promo
                    $scope.promo.actions = response.map(function (action) {
                        return action._id;
                    });
                }, function (err) {
                    toastService.toast("danger", $translate.instant("promo.detail.errorSavedRules"));
                });
            }
        }

        // Ajout ou update d'une promo
        $scope.save = function (isQuit) {
            let formKeys = Object.keys($scope.form);
            let actionFormChecked = 0;
            let i = 0;

            $scope.form.nsSubmitted = true;
            if ($scope.form.ruleForm.$invalid) {
                return toastService.toast("danger", $translate.instant("promo.detail.formRulesIncomplete"));
            }
            while (actionFormChecked === 0 && i < formKeys.length) {
                if ($scope.form[`actionForm_${  i}`]) {
                    if ($scope.form[`actionForm_${  i}`].$invalid) {
                        actionFormChecked = -1;
                    }
                } else {
                    actionFormChecked = 1;
                }
                i++;
            }
            $scope.checkDiscount();
            if (actionFormChecked === -1) {
                return toastService.toast("danger", `Le formulaire de l'action ${  i  } est incomplet.`);
            }
            if ($scope.form.$invalid || $scope.dateIsValid === false) {
                return toastService.toast("danger", $translate.instant("promo.detail.enterInvalid"));
            }
            // On ajoute les gifts dans promo.gifts en ne gardant que la value des gifts dont la valeur est valide
            processGifts();
            let deferred = $q.defer();

            if ($scope.isEditMode) {
                // Si nous avons une régle a enregistrer
                if ($scope.rule.operand !== undefined && $scope.promo.discountType !== 'QtyB') {
                    // On sauvegarde la régle
                    RulesV2.save($scope.rule, function (response) {
                        toastService.toast("success", $translate.instant("promo.detail.ruleSaved"));
                        $scope.rule = response;
                        // On enregistre l'id de la régle dans rules_id et de la promo
                        $scope.promo.rules_id = response._id;
                    }, function (err) {
                        toastService.toast("danger", $translate.instant("promo.detail.failSavedRules"));
                    });
                } else {
                    // Si nous n'avons pas de règle nous enregistrons directement les actions et la promo
                    saveActions(deferred);
                }
            }
            PromosV2.save($scope.promo, function (response) {
                if (isQuit) {
                    $location.path("/promos");
                } else {
                    toastService.toast("success", $translate.instant("promo.detail.promoSaved"));
                    $location.path(`/promos/${  response._id}`);
                }
            }, function (error) {
                if(error.data){
                    if(error.data.message && error.data.message != ""){
                        toastService.toast("danger",  error.data.message);
                    } else if (error.data.translations) {
                        return toastService.toast('danger', err.data.translations.fr);
                    }
                }else if(error && error.code != ""){
                    toastService.toast("danger", error.code);
                }else{
                    console.log(error);
                    toastService.toast("danger", $translate.instant("global.standardError"));
                }
                console.log(error); //to see it
            });
        };

        // Suppression d'une promo
        $scope.remove = function (_id) {
            if (confirm("Êtes-vous sûr de vouloir supprimer cette promotion ?")) {
                let actionPromises = [];

                Promise.all(actionPromises).then(function () {
                    PromosV2.delete({id: _id, type: 'promo'}, function () {
                        toastService.toast("success", $translate.instant("promo.detail.promoDeleted"));
                        $location.path("/promos");
                    });
                });
            }
        };

        const cloneDiscount = async function () {
            await $scope.save(false);
            PromoClone.clone({_id: $scope.promo._id}, function (response) {
                if (response) {
                    toastService.toast("success", $translate.instant("promo.detail.promoCloned"));
                    $location.path(`/promos/${  response.clone_id}`);
                }
            });
        };

        $scope.additionnalButtons = [
            {
                text: 'product.button.dup',
                onClick: function () {
                    cloneDiscount();
                },
                icon: '<i class="fa fa-clone" aria-hidden="true"></i>',
            }
        ];
    }
]);

PromoControllers.controller("PromoDetailTypeCtrl", [
    "$scope", "$modalInstance", function ($scope, $modalInstance) {
        $scope.type;
        $scope.saveType = function (saveType) {
            $scope.type = saveType;
            $modalInstance.close($scope.type);
        };
        $scope.cancel = function (saveType) {
            $modalInstance.dismiss("cancel");
        };
    }
]);

PromoControllers.controller("PromoDetailAddCodePromoCtrl",
    [
        "$scope", "$modalInstance", "PromosV2","toastService", "$translate",
        function ($scope, $modalInstance, PromosV2, toastService, $translate) {
            // Si le codePromo.code existe déjà dans le tableau promo.codes alors on indique a l'utilisateur que le code promo existe déjà
            $scope.checkCodeExists = function () {
                PromosV2.query({PostBody: {filter: {"codes.code": $scope.codePromo.code}, structure: '*'}}, function (promo) {
                    $scope.codeExists = !!promo.name;
                });
            };
            // Permet d'indiquer si le code est bien unique
            $scope.codePromo = {
                code         : "",
                limit_total  : null,
                limit_client : null,
                used         : 0,
                client_used  : 0
            };
            $scope.codeExists = false;
            $scope.local = {};
            $scope.save = function () {
                function checkNumber(number) {
                    if (!number || number === '*') {
                        return true;
                    } else if (!isNaN(parseInt(number))){
                        return true;
                    } else {
                        return false;
                    }
                }
                $scope.local.form.nsSubmitted = true;
                // Si le code existe déjà on averti l'utilisateur
                if (!$scope.codePromo.code || $scope.codeExists) {
                    return;
                }
                if (!checkNumber($scope.codePromo.limit_total) || !checkNumber($scope.codePromo.limit_client)){
                    toastService.toast("danger", $translate.instant("promo.detail.errorQteMaxEnter"));
                    return;
                }
                $modalInstance.close($scope.codePromo);
            };

            $scope.cancel = function () {
                $modalInstance.dismiss("cancel");
            };
        }
    ]);
