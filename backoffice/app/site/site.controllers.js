var SiteControllers = angular.module("aq.site.controllers", []);

// Liste des articles
SiteControllers.controller("ArticlesSiteCtrl", [
    "$scope", "$location", "$route", "ArticlesV2", "toastService", "$rootScope", "$translate", function ($scope, $location, $route, ArticlesV2, toastService, $rootScope, $translate)
    {
        $scope.listArticles = [];
        $scope.page = 1;
        $scope.nbItemsPerPage = 10;
        $scope.maxSize = 5;
        $scope.totalArticles = 0;
        $scope.filter = {};

        $scope.defaultLang = $rootScope.languages.find(function (lang) {
            return lang.defaultLanguage;
        }).code;

        $scope.getArticles = function(page){
            let filter = {};
            const filterKeys = Object.keys($scope.filter);
            for (let i = 0, leni = filterKeys.length; i < leni; i++) {
                if($scope.filter[filterKeys[i]] === null){
                    break;
                }
                if (filterKeys[i].includes("min_") || filterKeys[i].includes("max_")) {
                    const key = filterKeys[i].split("_");
                    const value = $scope.filter[filterKeys[i]];

                    if (filter[key[1]] === undefined) {
                        filter[key[1]] = {};
                    }
                    filter[key[1]][key[0] === "min" ? "$gte" : "$lte"] = key[1].toLowerCase().includes("date") ? value.toISOString() : value;
                } else if(filterKeys[i].includes("title")) {
                    if($scope.filter.title != ""){
                        filter["translation."+$scope.defaultLang+".title"] = { $regex: $scope.filter.title, $options: "i" };
                    }
                } else if(filterKeys[i].includes("slug")) {
                    if($scope.filter.slug != ""){
                        filter["translation."+$scope.defaultLang+".slug"] = { $regex: $scope.filter.slug, $options: "i" };
                    }
                } else if(filterKeys[i].includes("isVisible")) {
                    if($scope.filter.isVisible == "true"){
                        filter["isVisible"] = true;
                    }else if($scope.filter.isVisible == "false"){
                        filter["isVisible"] = false;
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
            ArticlesV2.list({PostBody: {filter, structure: '*', limit: $scope.nbItemsPerPage, page: page}}, function ({datas, count}) {
                $scope.listArticles = datas;
                $scope.totalArticles = count;
            });
        }

        $scope.getArticles($scope.page);

        $scope.momentDate = function (date) {
            return moment(date).format("L, LTS");
        };

        $scope.remove = function (articles) {
            if(confirm("Etes-vous sûr de vouloir supprimer cet article ?")) {
                ArticlesV2.delete({id: articles._id, type: 'new'}, function () {
                    toastService.toast("success", $translate.instant("global.itemDelete"));
                    $route.reload();
                });
            }
        };

        $scope.goToArticleDetails = function (_id) {
            $location.path("/site/articles/detail/" + _id);
        };

    }
]);

// Création d'article
SiteControllers.controller("ArticlesNewSiteCtrl", [
    "$scope", "$location", "ArticlesV2", "toastService", "$translate",
    function ($scope, $location, ArticlesV2, toastService, $translate)
    {
        var selectedLang = "";

        $scope.articles = {};
        $scope.file = null;
        $scope.isEditMode = false;

        $scope.langChange = function (lang)
        {
            selectedLang = lang;
        };

        $scope.save = function (isQuit)
        {
            // Utilisé pour afficher les messages d'erreur au moment de la soumission d'un formulaire
            $scope.form.nsSubmitted = true;

            if($scope.articles.translation && $scope.articles.translation[selectedLang] && $scope.articles.translation[selectedLang].content)
            {
                $scope.articles.translation[selectedLang].content.resume = $scope.articles.translation[selectedLang].content.text ?
                    String($scope.articles.translation[selectedLang].content.text).replace(/<[^>]+>/gm, "").substring(0, 200) : "";
            }
            else {
                $scope.articles.translation[selectedLang].content = {resume:"", text:""};
            }

            if($scope.form.$invalid)
            {
                toastService.toast("danger", $translate.instant("global.invalidEntry"));
                return;
            }

            ArticlesV2.save($scope.articles, function (response)
            {
                if(response.msg)
                {
                    toastService.toast("danger", $translate.instant("global.slugEverUsed"));
                }
                else
                {
                    toastService.toast("success", $translate.instant("global.itemSaved"));
                    if(isQuit)
                    {
                        $location.path("/site/articles");
                    }
                    else
                    {
                        $location.path("/site/articles/detail/" + response._id);
                    }
                }
            }, function (err)
            {
                if(err){
                    toastService.toast("danger", err.data.message);
                }else{
                    toastService.toast("danger", $translate.instant("global.errorSaved"));
                }
            });
        };
    }
]);

// Edition d'article
SiteControllers.controller("ArticlesDetailSiteCtrl", [
    "$scope", "$routeParams", "$location", "ArticlesV2", "SiteDeleteImage", "toastService", "$timeout", "$rootScope", "$translate",
    function ($scope, $routeParams, $location, ArticlesV2, SiteDeleteImage, toastService, $timeout, $rootScope, $translate)
    {
        var selectedLang = "";
        $scope.isEditMode = false;
        $scope.nsUploadFiles = {
            isSelected: false
        };
        
        $scope.additionnalButtons = [
            {
                text: 'product.general.preview',
                onClick: function () {
                    $scope.articles.lang = selectedLang;
                    ArticlesV2.preview($scope.articles, function (response) {
                        if (response && response.url) {
                            window.open(response.url);
                        }
                    });
                },
                icon: '<i class="fa fa-eye" aria-hidden="true"></i>'
            }
        ]

        $scope.langChange = function (lang)
        {
            if(selectedLang === "")
            {
                ArticlesV2.query({PostBody: {filter: {_id: $routeParams._id}, structure: '*'}}, function (response)
                {
                    if(response._id === undefined)
                    {
                        toastService.toast("danger", $translate.instant("global.articleNotExist"));
                        $location.path("/site/articles");
                    }

                    $scope.articles = response;
                    $scope.articles.oldSlug = $scope.articles.translation[lang].slug;
                    $scope.isEditMode = true;
                }).$promise.then(function ()
                {
                    $timeout(function ()
                    {
                        $scope.copy = angular.copy($scope.articles);
                    }, 1000);
                });
            }

            selectedLang = lang;
        };

        /**
         * Fonction supprimant une image d'un article
         * @param {*} _id : id de l'image a supprimer
         */
        $scope.removeImage = function (articles)
        {
            if(confirm("Êtes-vous sûr de vouloir supprimer cette image ?"))
            {
                $scope.articles.img = "";
                SiteDeleteImage.deleteImage({_id: articles._id}, function (response)
                {
                    toastService.toast("success", $translate.instant("global.imgDelete"));
                });
            }
        };

        $scope.return = function ()
        {
            if(!angular.equals($scope.copy, $scope.articles))
            {
                var confirmReturn = confirm("Les modifications non sauvegardées seront perdues.\nEtes-vous sûr de vouloir revenir à la liste des articles ?");
                if(confirmReturn == true)
                {
                    $location.path("/site/articles");
                }
            }
            else
            {
                $location.path("/site/articles");
            }
        };

        $scope.save = function (isQuit)
        {
            if ($scope.nsUploadFiles.isSelected) {
                let response = confirm("La pièce jointe n'est pas sauvegardée, êtes vous sûr de vouloir continuer ?");
                if (!response) { return }
            }
            //Utilisé pour afficher les messages d'erreur au moment de la soumission d'un formulaire
            $scope.form.nsSubmitted = true;

            $scope.articles.translation[selectedLang].content.resume = $scope.articles.translation[selectedLang].content.text ?
                String($scope.articles.translation[selectedLang].content.text).replace(/<[^>]+>/gm, "").substring(0, 200) : "";

            if($scope.articles.translation[selectedLang].slug === "" || $scope.articles.translation[selectedLang].slug === undefined)
            {
                toastService.toast("danger", $translate.instant("global.slugEmpty"));
                return;
            }

            if($scope.form.$invalid)
            {
                toastService.toast("danger", $translate.instant("global.invalidEntry"));
                return;
            }

            $scope.disableSave = !$scope.isEditMode;
            ArticlesV2.save($scope.articles, function (response)
            {
                if(response.msg)
                {
                    toastService.toast("danger", $translate.instant("global.slugEverUsed"));
                }
                else
                {
                    toastService.toast("success", $translate.instant("global.infoSaved"));
                    if(isQuit)
                    {
                        $location.path("/site/articles");
                    }
                    else
                    {
                        $location.path("/site/articles/detail/" + response._id);
                    }
                }
            }, function(error){
                if(error.data){
                    if(error.data.message && error.data.message != ""){
                        toastService.toast("danger",  error.data.message);
                    }
                }else if(error && error.code != ""){
                    toastService.toast("danger", error.code);
                }else{
                    toastService.toast("danger", $translate.instant("global.errorSaved"));
                }
                $scope.disableSave = false;
            });
        };

        $scope.remove = function ()
        {
            if(confirm("Etes-vous sûr de vouloir supprimer cet article ?"))
            {
                ArticlesV2.delete({id: $scope.articles._id, type: 'new'}, function ()
                {
                    toastService.toast("success", $translate.instant("global.imgDelete"));
                    $location.path("/site/articles");
                });
            }
        };

        $scope.getImage = function (img) {
            const filename = img.split('/')[img.split('/').length -1]
            return `/images/blog/100x100/${$scope.articles._id}/${filename}`;
        }
    }
]);
