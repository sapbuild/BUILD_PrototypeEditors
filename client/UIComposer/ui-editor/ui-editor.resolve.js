'use strict';

module.exports = {
    resPrototype: ['npPrototype', function (npPrototype) {
        return npPrototype.getPrototype();
    }],
    resCatalogs: ['npPrototype', 'npUiCatalog', function (npPrototype, npUiCatalog) {
        return npPrototype.getPrototype().then(function (prototype) {
            return npUiCatalog.getCompatibleCatalogs(prototype.catalogId);
        });
    }],
    resAssets: ['$stateParams', 'npAsset', function ($stateParams, npAsset) {
        return npAsset.getAssetsLibrary({
            projectId: $stateParams.currentProject
        });
    }]
};
