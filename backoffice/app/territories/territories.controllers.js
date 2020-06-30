var TerritoriesControllers = angular.module("aq.territories.controllers", []);

TerritoriesControllers.controller("TerritoriesCtrl", ["$scope", "TerritoriesApi", "toastService", "$rootScope", '$location',
	function ($scope, TerritoriesApi, toastService, $rootScope, $location) {

		function getLanguages() {
			$scope.firstLang = $rootScope.languages[0].code;
		}
		
		getLanguages();

		$scope.detail = function (territory) {
			$location.url("/territories/" + territory._id);
		};
	$scope.territoriesList = [];
	$scope.loadDatas = function() {
		TerritoriesApi.list({terr: 'territories'}, {
			PostBody: {
				limit: 1024,
				sort: {
					name: 1  
				}
			},
			
		},
		function (response) {
			$scope.territoriesList = response.datas;
		});
	};
		
	$scope.loadDatas();

	$scope.remove = function (id) {
		if(confirm("Etes-vous sûr de vouloir supprimer ce territoire ?"))
		{
			TerritoriesApi.remove({terr: 'territory', action: id}, function (response) {
				toastService.toast("success", "Territoire supprimé");
				$scope.loadDatas();
			});
		}
	};

}]);


TerritoriesControllers.controller("TerritoriesDetailCtrl", ["$scope","$routeParams", "$location", "TerritoriesApi", "toastService",
	function ($scope, $routeParams, $location, TerritoriesApi, toastService) {
		if ($routeParams.territoryId) {
			$scope.isEditMode = true;
		}
		else {
			//Mode création
			$scope.isEditMode = false;
		}

		$scope.getTerritory = function () {
			// TerritoriesApi.query({ _id: $routeParams.territoryId }, function (territory) {
			TerritoriesApi.list({ terr: 'territory', action: $routeParams.territoryId },{}, function (territory) {
				$scope.territory = territory;
			});
		};
		//On récupére le document uniquement si nous sommes en mode edit
		if ($scope.isEditMode) {
			$scope.getTerritory();
		}else{
			$scope.territory = {
				translation: {},
				name: "",
				code: "",
				taxeFree: false,
			};
		}

		$scope.remove = function (id) {
			if (confirm("Etes-vous sûr de vouloir supprimer ce territoire ?")) {
				TerritoriesApi.remove({ terr: 'territory', action: id }, function (response) {
					toastService.toast("success", "Territoire supprimé");
					$location.path("/territories");
				});
			}
		};

        $scope.save = async function () {
			TerritoriesApi.update({terr: 'territory'}, $scope.territory);
			$location.path("/territories");
        };
}]);

