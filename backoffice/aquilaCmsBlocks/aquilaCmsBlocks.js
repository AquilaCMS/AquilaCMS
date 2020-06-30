var aquilaCmsBlocks = angular.module('aquilaCmsBlocks', []);

aquilaCmsBlocks.service('CmsBlocksApi', ['$resource', function ($resource)
{
    return $resource('cmsBlocks/:id', {}, {});
}]);

aquilaCmsBlocks.directive('aqCmsBlock', ['CmsBlocksApi', '$compile', function(CmsBlocksApi, $compile){
    return {
        restrict: 'E',
        link: function(scope, element, attrs){
            
            CmsBlocksApi.get({id: attrs.id}, function(cmsBlock){
                element.html(cmsBlock.content);
                $compile(element.contents())(scope);     
            });
        }
    }
}]);