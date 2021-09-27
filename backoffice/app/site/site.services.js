var SiteServices = angular.module('aq.site.services', ['ngResource']);


SiteServices.factory('SiteApi', ['$resource', function ($resource) {
    return $resource('site/:module/:action', {}, {
        listArticles: { method: 'GET', params: { module: "news" }, isArray: true },
        getArticles: { method: 'GET', params: { module: "news", action: "" } },
        saveArticles: { method: 'POST', params: { module: "news" } },
        updateArticles: { method: 'PUT', params: { module: "news" } },
        removeArticles: { method: 'DELETE', params: { module: 'news', action: "" } }

    });
}]);

SiteServices.factory('ArticlesV2', ['$resource', function ($resource) {
    return $resource('v2/site/:type/:id', {}, {
        list: { method: 'POST', params: { type: "news" }},
        query: { method: 'POST', params: { type: "new" } },
        save: { method: 'PUT', params: { type: "new" } },
        delete: { method: 'DELETE', params: { type: "new" } },
        preview : {method: 'POST', params: {type: 'preview'}},
        getNewsTags : {method: 'POST', params: {type: 'news', id: 'tags'}}
    });
}]);

SiteServices.factory('SiteDeleteImage', ['$resource', function ($resource) {
    return $resource('site/news/image/:_id', {}, {
        deleteImage: { method: 'DELETE', params: {} }
    });
}]);
