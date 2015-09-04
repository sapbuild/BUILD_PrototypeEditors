'use strict';

var _ = require('norman-client-tp').lodash;

module.exports = ['$scope', '$state', '$q', 'npUiCatalog', 'npAsset', 'npBindingHelper', 'resCatalogs', 'resAssets', 'npPageMetadata', 'npPageMetadataEvents',
    function ($scope, $state, $q, npUiCatalog, npAsset, npBindingHelper, resCatalogs, resAssets, npPageMetadata, npPageMetadataEvents) {
        var that = this;

        that.selectLibrary = function (technology) {
            that.library.technology = technology;
            var catalogId = that.library.technology.catalogId;
            that.library.catalog = npUiCatalog.getControlsByCatalogId(catalogId, that.library.floorplanFilter);
        };

        // get list of controls to be displayed on palette based on floorplan
        var getControlsForFloorplan = function (event, floorplan) {
            that.library.floorplanFilter = floorplan;
            that.selectLibrary(that.library.technology);
        };

        var initLibrary = function () {
            that.library = {};
            that.library.search = {};
            that.library.technology = {};
            that.library.technology.search = {};
            that.library.catalog = {};
            that.library.floorplanFilter = null;
            that.library.technologies = [];
            that.library.assetsOpen = true;
            // get all available technologies from catalog
            that.library.technologies = resCatalogs;
            that.selectLibrary(that.library.technologies[0]);

            that.library.assets = resAssets;
            that.library.assets.search = {};
            that.library.disableDataModeler = false;
        };
        initLibrary();

        that.resetControlSearch = function () {
            that.library.search = {};
        };

        that.resetAssetSearch = function () {
            that.library.assets.search = {};
        };

        // TODO needed by ui-tabs control, might be able to remove that later
        that.tabOn = null;

        var setupUsedBindings = function () {
            var fillUsedProperties = function (usedPropertyIdsByEntityId) {
                _.each(that.allEntities, function (entity) {
                    var entityInfo = usedPropertyIdsByEntityId[entity._id];
                    entity.isUsedInABinding = !!entityInfo;
                    _.each(entity.properties, function (property) {
                        property.isUsedInABinding = entityInfo ? entityInfo[property._id] : null;
                    });
                });
            };
            if (!_.isEmpty(that.allEntities)) {
                var currentPageName = npPageMetadata.getCurrentPageName();
                if (currentPageName) {
                    npPageMetadata.getPageMetadata(currentPageName).then(function (pageMd) {
                        var usedPropertyIdsByEntityId = npBindingHelper.getUsedPropertyIdsByEntityId(pageMd);
                        fillUsedProperties(usedPropertyIdsByEntityId);
                    });
                }
                else {
                    fillUsedProperties({});
                }
            }
        };

        $scope.$on('bindinghelper-model-loaded', function () {
            that.allEntities = npBindingHelper.getEntitiesAndProperties();
            setupUsedBindings();
        });

        npPageMetadataEvents.listen(npPageMetadataEvents.events.pageChanged, setupUsedBindings);
        npPageMetadataEvents.listen(npPageMetadataEvents.events.mainEntityChanged, setupUsedBindings);
        npPageMetadataEvents.listen(npPageMetadataEvents.events.controlsRemoved, setupUsedBindings);
        npPageMetadataEvents.listen(npPageMetadataEvents.events.controlsBindingChanged, setupUsedBindings);
        npPageMetadataEvents.listen(npPageMetadataEvents.events.controlPropertiesChanged, setupUsedBindings);

        var getAssetsFromProjectLibrary = function () {
            npAsset.getAssetsLibrary({
                projectId: $state.params.currentProject
            }).then(function (response) {
                that.library.assets = response;
            });
        };

        $scope.$on('executeLibraryRefresh', getAssetsFromProjectLibrary);
        $scope.$on('executeCatalogRefresh', getControlsForFloorplan);
        $scope.$on('disableDataModeler', function (event, args) {
            that.library.disableDataModeler = args.value;
        });
    }
];
