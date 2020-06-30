
const UpdateModule = { name: 'update' };

angular.module(`aq.${UpdateModule.name}`, [
    `aq.${UpdateModule.name}.routes`,
    `aq.${UpdateModule.name}.services`,
    `aq.${UpdateModule.name}.controllers`
]);
