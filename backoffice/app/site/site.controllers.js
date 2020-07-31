var SiteControllers = angular.module("aq.site.controllers", []);

// Liste des articles
SiteControllers.controller("ArticlesSiteCtrl", [
    "$scope", "$location", "$route", "ArticlesV2", "toastService", "$rootScope", function ($scope, $location, $route, ArticlesV2, toastService, $rootScope)
    {
        $scope.listArticles = [];
        $scope.page = 1;
        $scope.nbItemsPerPage = 10;
        $scope.maxSize = 5;
        $scope.totalArticles = 0;

        $scope.defaultLang = $rootScope.languages.find(function (lang) {
            return lang.defaultLanguage;
        }).code;

        ArticlesV2.list({PostBody: {filter: {}, structure: '*', limit: $scope.nbItemsPerPage, page: 1}}, function ({datas, count}) {
            $scope.listArticles = datas;
            $scope.totalArticles = count;
        });

        $scope.onPageChange = function (page) {
            ArticlesV2.list({PostBody: {filter: {}, structure: '*', limit: $scope.nbItemsPerPage, page}}, function ({datas, count}) {
                $scope.listArticles = datas;
                $scope.totalArticles = count;
            });
        }

        $scope.momentDate = function (date) {
            return moment(date).format("L, LTS");
        };

        $scope.remove = function (articles) {
            if(confirm("Etes-vous sûr de vouloir supprimer cet article ?")) {
                ArticlesV2.delete({id: articles._id, type: 'new'}, function () {
                    toastService.toast("success", "Article supprimé");
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
    "$scope", "$location", "ArticlesV2", "toastService",
    function ($scope, $location, ArticlesV2, toastService)
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
                toastService.toast("danger", "Les informations saisies ne sont pas valides.");
                return;
            }

            ArticlesV2.save($scope.articles, function (response)
            {
                if(response.msg)
                {
                    toastService.toast("danger", "Ce slug est déjà utilisée, merci d'en choisir une autre");
                }
                else
                {
                    toastService.toast("success", "Article sauvegardé !");
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
                toastService.toast("danger", "Une erreur est survenue lors de la sauvegarde.");
            });
        };
    }
]);

// Edition d'article
SiteControllers.controller("ArticlesDetailSiteCtrl", [
    "$scope", "$routeParams", "$location", "ArticlesV2", "SiteDeleteImage", "toastService", "$timeout",
    function ($scope, $routeParams, $location, ArticlesV2, SiteDeleteImage, toastService, $timeout)
    {
        var selectedLang = "";

        $scope.isEditMode = false;

        $scope.langChange = function (lang)
        {
            if(selectedLang === "")
            {
                ArticlesV2.query({PostBody: {filter: {_id: $routeParams._id}, structure: '*'}}, function (response)
                {
                    if(response._id === undefined)
                    {
                        toastService.toast("danger", "Cet article n'existe pas");
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
                    toastService.toast("success", "Image supprimée");
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
            //Utilisé pour afficher les messages d'erreur au moment de la soumission d'un formulaire
            $scope.form.nsSubmitted = true;

            $scope.articles.translation[selectedLang].content.resume = $scope.articles.translation[selectedLang].content.text ?
                String($scope.articles.translation[selectedLang].content.text).replace(/<[^>]+>/gm, "").substring(0, 200) : "";

            if($scope.articles.translation[selectedLang].slug === "" || $scope.articles.translation[selectedLang].slug === undefined)
            {
                toastService.toast("danger", "Le slug ne doit pas être vide");
                return;
            }

            if($scope.form.$invalid)
            {
                toastService.toast("danger", "Les informations saisies ne sont pas valides.");
                return;
            }

            $scope.disableSave = !$scope.isEditMode;
            ArticlesV2.save($scope.articles, function (response)
            {
                if(response.msg)
                {
                    toastService.toast("danger", "Ce slug est déjà utilisée, merci d'en choisir une autre");
                }
                else
                {
                    toastService.toast("success", "Informations sauvegardées !");
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
                toastService.toast("danger", "Une erreur est survenue lors de la sauvegarde.");
                $scope.disableSave = false;
            });
        };

        $scope.remove = function ()
        {
            if(confirm("Etes-vous sûr de vouloir supprimer cet article ?"))
            {
                ArticlesV2.delete({id: $scope.articles._id, type: 'new'}, function ()
                {
                    toastService.toast("success", "Article supprimé");
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
