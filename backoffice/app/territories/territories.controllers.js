var TerritoriesControllers = angular.module("aq.territories.controllers", []);

TerritoriesControllers.controller("TerritoriesCtrl", [
	"$scope", "TerritoriesApi", "toastService", "$rootScope", '$location', '$translate',
	function ($scope, TerritoriesApi, toastService, $rootScope, $location, $translate) {
		$scope.filter = {};

		function getLanguages() {
			$scope.firstLang = $rootScope.languages[0].code;
		}

		getLanguages();

		$scope.defaultLang = $rootScope.languages.find(function (lang) {
			return lang.defaultLanguage;
		}).code;

		$scope.detail = function (territory) {
			$location.url("/territories/" + territory._id);
		};
		$scope.territoriesList = [];
		$scope.getTerritories = function () {
			let filter = {};
			const filterKeys = Object.keys($scope.filter);
			for (let i = 0, leni = filterKeys.length; i < leni; i++) {
				if ($scope.filter[filterKeys[i]] === null) {
					break;
				}
				if (filterKeys[i].includes("name")) {
					if ($scope.filter.name != "") {
						filter["translation." + $scope.defaultLang + ".name"] = { $regex: $scope.filter.name, $options: "i" }
					}
				} else if (filterKeys[i].includes("children")) {
					if ($scope.filter.children != "") {
						filter["children"] = { $gte: $scope.filter.children, $options: "i" }
					}
				} else if ($scope.filter[filterKeys[i]].toString() != "") {
					filter[filterKeys[i]] = { $regex: $scope.filter[filterKeys[i]].toString(), $options: "i" };
				}
			}
			TerritoriesApi.list({ terr: 'territories' }, {
				PostBody: {
					filter,
					limit: 1024,
					sort: { name: 1 }
				},
			}, function (response) {
				$scope.territoriesList = response.datas;
			});
		};

		$scope.getTerritories();

		$scope.remove = function (id) {
			if (confirm($translate.instant("confirm.deleteTerritory"))) {
				TerritoriesApi.remove({ terr: 'territory', action: id }, function (response) {
					toastService.toast("success", $translate.instant("territories.detail.territoryDelete"));
					$scope.getTerritories();
				});
			}
		};
	}
]);


TerritoriesControllers.controller("TerritoriesDetailCtrl", [
	"$scope", "$routeParams", "$location", "TerritoriesApi", "toastService", "$translate",
	function ($scope, $routeParams, $location, TerritoriesApi, toastService, $translate) {
		if ($routeParams.territoryId) {
			$scope.isEditMode = true;
		}
		else {
			//Mode création
			$scope.isEditMode = false;
		}

		$scope.getTerritory = function () {
			// TerritoriesApi.query({ _id: $routeParams.territoryId }, function (territory) {
			TerritoriesApi.list({ terr: 'territory', action: $routeParams.territoryId }, {}, function (territory) {
				$scope.territory = territory;
			});
		};
		//On récupére le document uniquement si nous sommes en mode edit
		if ($scope.isEditMode) {
			$scope.getTerritory();
		} else {
			$scope.territory = {
				translation: {},
				name: "",
				code: "",
				taxeFree: false,
			};
		}

		$scope.remove = function (id) {
			if (confirm($translate.instant("confirm.deleteTerritory"))) {
				TerritoriesApi.remove({ terr: 'territory', action: id }, function () {
					toastService.toast("success", $translate.instant("territories.detail.territoryDelete"));
					$location.path("/territories");
				});
			}
		};

		$scope.save = async function (isQuit) {
			TerritoriesApi.update({ terr: 'territory' }, $scope.territory, function () {
				toastService.toast("success", $translate.instant("global.saveDone"));
				if (isQuit) {
					$location.path("/territories");
				}
			});
		};
	}
]);

