
const DesignModule = { name: 'design' };

angular.module(`aq.${DesignModule.name}`, [
    `aq.${DesignModule.name}.routes`,
    `aq.${DesignModule.name}.services`,
    `aq.${DesignModule.name}.controllers`
]);
