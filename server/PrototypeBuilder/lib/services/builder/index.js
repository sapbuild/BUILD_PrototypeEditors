'use strict';

// For Promise
require('norman-server-tp');

var commonServer = require('norman-common-server');
var objectId = commonServer.db.mongoose.Types.ObjectId;
var registry = require('norman-common-server').registry;
var NormanError = commonServer.NormanError;
var _ = require('norman-server-tp').lodash;

var viewBuilder = require('./viewBuilder.js');
var controllerBuilder = require('./controllerBuilder.js');
var annotationBuilder = require('./annotationBuilder.js');
var modelBuilder = require('./modelBuilder.js');
var builderUtils = require('./builderUtils.js');
var ui5Helper = require('./technology/ui5Helper.js');
var odataHelper = require('./technology/odataHelper.js');

var serviceLogger = commonServer.logging.createLogger('prototypeBuilder-service');

function PrototypeBuilderService(_SharedWorkspaceService, _UICatalogService, _ArtifactService, _AssetService) {
    this.initialized = false;
    if (_SharedWorkspaceService !== undefined && _UICatalogService !== undefined && _ArtifactService !== undefined && _AssetService !== undefined) {
        serviceLogger.info('PrototypeBuilderService has been initialized with pre-existing service');
        this.initialized = true;
        this.PrototypeService = _SharedWorkspaceService;
        this.UICatalogService = _UICatalogService;
        this.ArtifactService = _ArtifactService;
        this.AssetService = _AssetService;
    }
}

PrototypeBuilderService.prototype.initialize = function (done) {
    ui5Helper.initialize(function () {
        odataHelper.initialize(done);
    });
};

PrototypeBuilderService.prototype.onInitialized = function () {
    if (!this.initialized) {
        this.initialized = true;
        this.PrototypeService = registry.getModule('PrototypeService');
        this.UICatalogService = registry.getModule('UICatalog');
        this.ArtifactService = registry.getModule('ArtifactService');
        this.AssetService = registry.getModule('AssetService');
    }
};

    PrototypeBuilderService.prototype.upgradeSchema = function (version, done) {
    serviceLogger.debug('upgradeSchema for PrototypeBuilder');
    serviceLogger.debug('upgradeSchema version is:', version);
    var self = this;
    var mongoose = commonServer.db.mongoose;
    var prototypeModel = mongoose.model('prototype');


    return new Promise(
        function (resolve, reject) {
            prototypeModel.find({}, function (error, data) {
                if (error) {
                    reject(error);
                }
                else {
                    resolve(data);
                }
            });
        })
        .then(function (prototypes) {
            var index = 0;

            function next() {
                if (prototypes[index]) {
                    self.generatePrototypeArtifacts(prototypes[index].projectId.toString())
                        .then(next)
                        .catch(function (error) {
                            serviceLogger.error(error);
                            next();
                        });

                    index++;
                }
                else {
                    done();
                }
            }

            next();
        })
        .catch(function (error) {
            serviceLogger.error(error);
            done(error);
        });
};

/** Global Helper Functions **/

/**
 * Retrieve all prototype metadata for a given project
 * @param projectId
 * @returns {Promise}
 * @private
 */
PrototypeBuilderService.prototype._getPrototypeMetadata = function (projectId) {
    serviceLogger.info({
        projectId: projectId
    }, 'Retrieve prototype metadata');
    return this.PrototypeService.getMetadata(objectId(projectId), ['appMetadata', 'pageMetadata', 'dataModelMetadata', 'sampleMetadata']).then(function (versions) {
        var metadata = {};
        metadata.appMetadata = versions.appMetadata.toObject();
        metadata.pageMetadata = versions.pageMetadata.toObject();
        metadata.dataModelMetadata = versions.dataModelMetadata[versions.dataModelMetadata.length - 1].toObject();
        metadata.sampleDataMetadata = versions.sampleMetadata[versions.sampleMetadata.length - 1].toObject();
        return metadata;
    });
};

/**
 * Retrieve all assets for a project
 * @param projectId
 * @returns {Promise}
 * @private
 */
PrototypeBuilderService.prototype._getAssets = function (projectId) {
    serviceLogger.info({
        projectId: projectId
    }, 'Retrieve project assets');
    return this.AssetService.getAssets(projectId, undefined, false);
};

/**
 * Retrieve and load in memory all catalog associated with a given one.
 * @param appMetadata
 * @returns {Promise}
 * @private
 */
PrototypeBuilderService.prototype._getUICatalogs = function (appMetadata) {
    serviceLogger.info({
        catalogId: appMetadata.catalogId
    }, 'Retrieve ui catalogs');
    return this.UICatalogService.getCompatibleCatalogs(appMetadata.catalogId);
};

/**
 * Save artifacts (defined by a filepath and a filecontent) to the sharedworkspace
 * @param artifactsToSave list of artifacts to save
 * @param projectId current projectId
 * @param snapshotVersion version of the snapshot
 * @returns {Promise}
 * @private
 */
PrototypeBuilderService.prototype._saveToSharedWorkspace = function (artifactsToSave, projectId, snapshotVersion) {
    serviceLogger.info({
        artifactsToSaveCount: artifactsToSave.length,
        projectId: projectId
    }, 'Saving to Shared Workspace');

    _.each(artifactsToSave, function (artifact) {
        artifact.metadata = {
            projectId: projectId,
            path: artifact.path,
            fromPrototypeBuilder: true
        };
        if (snapshotVersion !== undefined) {
            artifact.metadata.snapshotVersion = snapshotVersion;
        }
    });

    return this.ArtifactService.uploadArtifacts(projectId, artifactsToSave, true);
};

/**
 * Delete a set of artifacts from the shared workspace
 * @param artifactsToRemove
 * @param projectId
 * @returns {Promise}
 * @private
 */
PrototypeBuilderService.prototype._removeFromSharedWorkspace = function (artifactsToRemove, projectId) {
    serviceLogger.info({
        artifactsToRemove: artifactsToRemove,
        projectId: projectId
    }, 'Removing files from Shared Workspace');
    var self = this;
    var removePromises = _.map(artifactsToRemove, function (artifactPath) {
        return self.ArtifactService.removeArtifactByMetadata({
            'metadata.projectId': projectId,
            'metadata.path': artifactPath
        });
    });
    return Promise.all(removePromises);
};

/**
 * Retrieve the list of assets from the AssetService to copy them over to the SharedWorkspace
 * @param assetsToCopy
 * @param projectId
 * @returns {Promise|*|{src}}
 * @private
 */
PrototypeBuilderService.prototype._getAssetsToCopy = function (assetsToCopy, projectId) {
    serviceLogger.info({
        assetsToCopy: assetsToCopy,
        projectId: projectId
    }, 'Copy assets to Shared Workspace');
    var self = this;
    var copyPromises = _.map(assetsToCopy, function (asset) {
        var version = (asset.version) ? asset.version : '';
        return self.AssetService.getAssetWithContent(asset.id, version, false).then(function (assetData) {
            if (assetData === null) {
                throw new Error('Asset with id ' + asset.id + ' and version ' + asset.version + ' cannot be found in the project');
            }
            else {
                return {
                    path: asset.workspacePath,
                    filecontent: assetData.fileContent
                };
            }
        });
    });
    return Promise.all(copyPromises);
};

/** Service API **/

var _processPrototype = function (prototypeData) {
    var pageMetadataArray = prototypeData[0];
    var assetsToCopy = prototypeData[1];
    var artifactsToSave = [];
    _.each(pageMetadataArray, function (pageMetadata) {
        var pageExpandParameters = {};
        artifactsToSave.push({
            path: 'view/' + pageMetadata.name + '.view.xml',
            filecontent: viewBuilder.generatePageFromMetadata(pageMetadata, assetsToCopy, pageExpandParameters),
            includeInBundle: true
        });
        artifactsToSave.push({
            path: 'view/' + pageMetadata.name + '.controller.js',
            filecontent: controllerBuilder.generateControllerFromMetadata(pageMetadata, builderUtils.appMetadata, pageExpandParameters),
            includeInBundle: true
        });
    });
    return artifactsToSave;
};

var _processSmartPrototype = function (prototypeData) {
    var pageMetadataArray = prototypeData[0];
    var assetsToCopy = prototypeData[1];
    var artifactsToSave = [];
    var pageMainEntity = {};
    _.each(pageMetadataArray, function (pageMetadata) {
        var mainEntityName = builderUtils.retrieveEntityName(pageMetadata.mainEntity);
        var isCreated = false;
        if (mainEntityName === null) {
            var navigationToPage = _.find(builderUtils.appMetadata.navigations, function (navigation) {
                return navigation.pageTo === pageMetadata.name;
            });
            var newEntity;
            if (navigationToPage && pageMainEntity[navigationToPage.pageFrom]) {
                var pageEntityDetail = pageMainEntity[navigationToPage.pageFrom];
                newEntity = pageEntityDetail.entityDetail;
            }
            else {
                newEntity = odataHelper.createEntity();
                isCreated = true;
            }
            mainEntityName = newEntity.name;
            pageMetadata.mainEntity = newEntity.id;
            pageMetadata.mainEntityDetail = newEntity;
        }
        else {
            pageMetadata.mainEntityDetail = {id: pageMetadata.mainEntity, name: mainEntityName};
        }
        pageMainEntity[pageMetadata.name] = {
            createdEntity: isCreated,
            nameSet: mainEntityName,
            entityId: pageMetadata.mainEntity,
            entityDetail: pageMetadata.mainEntityDetail
        };
        pageMetadata.mainEntityName = mainEntityName;
    });
    _.each(pageMetadataArray, function (pageMetadata) {
        annotationBuilder.extractAnnotationFromPageMetadata(pageMetadata, assetsToCopy);
    });
    artifactsToSave.push({
        path: 'models/annotations.xml',
        filecontent: annotationBuilder.getAnnotationFile()
    });
    return artifactsToSave;
};

PrototypeBuilderService.prototype.generatePrototypeArtifacts = function (projectId, snapshotVersion) {
    var isSnapshot = false;
    if (snapshotVersion !== undefined) {
        isSnapshot = true;
    }
    serviceLogger.info({
        projectId: projectId,
        snapshotVersion: snapshotVersion
    }, 'createPrototype');

    var self = this;
    var assetsToCopy = (isSnapshot) ? [] : null;
    var sharedWorkspaceOperations = [];
    var appMetadata, pageMetadataArray, prototypeDataModel, sampleDataMetadata, assets, pageConfiguration;
    var isSmart = false;
    return Promise.all([this._getPrototypeMetadata(projectId), this._getAssets(projectId)])
        .then(function (results) {
            appMetadata = results[0].appMetadata;
            pageMetadataArray = results[0].pageMetadata;
            appMetadata.pages = pageMetadataArray;
            prototypeDataModel = results[0].dataModelMetadata;
            sampleDataMetadata = results[0].sampleDataMetadata;
            assets = results[1];
            isSmart = appMetadata.isSmartApp;
            return self._getUICatalogs(appMetadata);
        })
        .then(function (uiCatalogs) {
            builderUtils.setContext(uiCatalogs, prototypeDataModel, appMetadata);
            odataHelper.reset();

            return [pageMetadataArray, assetsToCopy];
        })
        .then(function (prototypeData) {
            var artifactsToSave;
            if (isSmart) {
                artifactsToSave = _processSmartPrototype(prototypeData);
            }
            else {
                artifactsToSave = _processPrototype(prototypeData);
            }
            return artifactsToSave;
        })
        .then(function (artifactsToSave) {
            artifactsToSave.push({
                path: 'index.html',
                filecontent: builderUtils.generateIndex(pageMetadataArray, isSnapshot)
            });
            artifactsToSave.push({
                path: 'Component.js',
                filecontent: builderUtils.generateRouter(),
                includeInBundle: true
            });
            return artifactsToSave;
        })
        .then(function (artifactsToSave) {
            // Generate EDMX Files and Sample Data
            artifactsToSave.push({
                path: 'models/metadata.xml',
                filecontent: modelBuilder.generateEDMX(prototypeDataModel)
            });
            // FIXME Can't really include formulaCalculation in the bundle somehow
            artifactsToSave.push({
                path: 'models/formulaCalculation.js',
                filecontent: builderUtils.generateFormulaHelper(projectId)
            });
            var sampleData = {};
            _.each(prototypeDataModel.entities, function (entity) {
                var entityData = modelBuilder.getEntityData(projectId, entity, sampleDataMetadata, assets, assetsToCopy);
                if (entityData !== null) {
                    sampleData[entity.nameSet] = entityData;
                }
            });
            artifactsToSave.push({
                path: 'models/sampleData.json',
                filecontent: JSON.stringify(sampleData)
            });
            var fakeLREP = {
                changes: [],
                settings: {
                    isKeyUser: true,
                    isAtoAvailable: false,
                    isProductiveSystem: false
                }
            };
            artifactsToSave.push({
                path: 'fakeLRep.json',
                filecontent: JSON.stringify(fakeLREP)
            });

            if (isSmart) {
                pageConfiguration = annotationBuilder.getPageConfiguration(pageMetadataArray);
                if (pageConfiguration.pages.length > 0) {
                    pageConfiguration.pages[0].defaultContext = 'root';
                    _.each(pageConfiguration.pages[0].pages, function (page) {
                        page.defaultContext = modelBuilder.getEntityDefaultContext(page.entitySet);
                    });
                }
                artifactsToSave.push({
                    path: 'manifest.json',
                    filecontent: builderUtils.createSmartConfig(JSON.stringify(pageConfiguration))
                });
            }
            else {
                pageConfiguration = [];
                var pagesWithMainEntity = _.filter(pageMetadataArray, function (pageMetadata) {
                    return pageMetadata.mainEntity !== undefined && pageMetadata.mainEntity !== '';
                });
                _.each(pagesWithMainEntity, function (page) {
                    var entitySet = builderUtils.retrieveEntityName(page.mainEntity, true);
                    pageConfiguration.push({ pageName: page.name, entitySet: entitySet, defaultContext: modelBuilder.getEntityDefaultContext(entitySet)});
                });
            }
            return artifactsToSave;
        })
        .then(function (artifactsToSave) {
            var artifactsForBundle = _.filter(artifactsToSave, {includeInBundle: true});
            var bundleContent = builderUtils.generateBundle(artifactsForBundle);
            if (bundleContent) {
                artifactsToSave.push({
                    path: 'Component-preload.js',
                    filecontent: bundleContent
                });
            }
            return artifactsToSave;
        })
        .then(function (artifactsToSave) {
            sharedWorkspaceOperations.push(artifactsToSave);
            if (isSnapshot) {
                // If we are working in a snapshot, retrieve the assets
                sharedWorkspaceOperations.push(self._getAssetsToCopy(assetsToCopy, projectId));
            }
            return Promise.all(sharedWorkspaceOperations);
        })
        .then(function (artifactsToSave) {
            return self._saveToSharedWorkspace(_.flatten(artifactsToSave), projectId, snapshotVersion);
        })
        .then(function (saveToSharedWorkspaceResult) {
            var finalOutput = saveToSharedWorkspaceResult;
            if (isSnapshot) {
                finalOutput = pageConfiguration;
            }
            return finalOutput;
        })
        .catch(function (err) {
            var error = new NormanError('Failed to generate Prototype Artifacts ', err);
            serviceLogger.error({projectId: projectId}, err);
            serviceLogger.error(err.stack);
            throw error;
        });
};

PrototypeBuilderService.prototype.generateSnapshot = function (projectId, snapshotId) {
    return this.generatePrototypeArtifacts(projectId, snapshotId);
};

module.exports = PrototypeBuilderService;
