
const TranslateModule = { name: 'translate' };

angular.module(`aq.${TranslateModule.name}`, [
    `aq.${TranslateModule.name}.routes`,
    `aq.${TranslateModule.name}.services`,
    `aq.${TranslateModule.name}.controllers`
]);
