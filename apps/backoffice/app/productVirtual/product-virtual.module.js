const productVirtualModule = { name: 'aq.productVirtual' };

angular.module(`${productVirtualModule.name}`, [
    `${productVirtualModule.name}.controllers`,
    `${productVirtualModule.name}.routes`,
    `${productVirtualModule.name}.services`,
]);
