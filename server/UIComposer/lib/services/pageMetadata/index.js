'use strict';
var commonServer = require('norman-common-server');
var registry = commonServer.registry;
var constants = require('./../../../constants');
var localConfig = require('./../../../localconfig');
require('norman-server-tp');
var serviceLogger = commonServer.logging.createLogger('norman-ui-composer-server:pagemetadata.service');
var pageMetadataModel = require('./model');
var appMetadataModel = require('./../appMetadata/model');
var AppMetadataModel;
var PageMetadataModel;
var NormanError = commonServer.NormanError;
var tp = commonServer.tp,
    _ = tp.lodash;

function pageMetadataService() {

}
module.exports = pageMetadataService;

pageMetadataService.prototype.initialize = function (done) {
    var model = pageMetadataModel.create();
    PageMetadataModel = model.pageMetadata;
    var modelofAppMetadata = appMetadataModel.create();
    AppMetadataModel = modelofAppMetadata.appMetadata;
    if (PageMetadataModel && AppMetadataModel) {
        serviceLogger.info({}, '>> pageMetadataService.initialize()');
    }
    done();
};

pageMetadataService.prototype.checkSchema = function (done) {
    pageMetadataModel.createIndexes(done);
};

pageMetadataService.prototype.onInitialized = function (done) {
    serviceLogger.info('pageMetadataService>>onInitialized>>');
//    var swRegistry = registry.getModule('SwRegistryService');
//    swRegistry.registerModule('pageMetadataService');
    done();
    // pageMetadataModel.destroy(done);
};

/**
 * Shutdown service
 * @param done
 */
pageMetadataService.prototype.shutdown = function (done) {
    pageMetadataModel.destroy(done);
    appMetadataModel.destroy(done);
};

pageMetadataService.prototype.upgradeSchema = function (version, done) {
    serviceLogger.debug('upgradeSchema for UIComposer appMetadata and pageMetadata');
    var job = Promise.resolve(true);
    var self = this;
    serviceLogger.debug('upgradeSchema version is:', version);
    switch (version.major) {
        case 0:
            job = job.then(self.upgrade_to_0_1_0);
    }
    return job.callback(done);
};

pageMetadataService.prototype.upgrade_to_0_1_0 = function () {
    serviceLogger.debug('Running upgrade_0_1_0 for UIComposer appMetadata and pageMetadata');
    var done = function () {
        },
        deferred = Promise.defer();
    pageMetadataService.prototype.initialize(done);
    var fetchPromise = [],
        pageMetadataArray = [],
        appMetadataArray = [],
        appMetadataChanged = false;

    fetchPromise.push(AppMetadataModel.find({}, 'catalogId pages.catalogId pages.id pages.floorplan').exec());
    fetchPromise.push(PageMetadataModel.find({}, '_id catalogId, floorplan').exec());
    Promise.waitAll(fetchPromise).then(function (dataArray) {
        var appMetadatas = dataArray[0],
            pageMetadatas = dataArray[1];

        appMetadatas.forEach(function (appMetadata) {
            appMetadata.pages.forEach(function (page) {
                var pageMetadata = _.find(pageMetadatas, {_id: page.id}) || {};
                if (pageMetadata && !pageMetadata.catalogId) {
                    pageMetadataArray.push(PageMetadataModel.findByIdAndUpdate(
                            pageMetadata._id,
                            {catalogId: appMetadata.catalogId},
                            function (err /*, model */) {
                                if (err) {
                                    serviceLogger.error('error in updating pgMD');
                                }
                            }
                        )
                    );
                }
                if (!page.catalogId) {
                    page.catalogId = appMetadata.catalogId;
                    page.floorplan = pageMetadata.floorplan;
                    appMetadataChanged = true;
                }
            });
            if (appMetadataChanged) {
                appMetadataArray.push(appMetadata.save());
                appMetadataChanged = false;
            }
        });
        Promise.all(appMetadataArray.concat(pageMetadataArray)).then(function () {
            deferred.resolve('done');
        }).catch(function (error) {
            serviceLogger.error({params: error}, '>> Migration -> appMetadata and pageMetadata Save failed');
            deferred.reject(error);
        });
    }).catch(function (error) {
        serviceLogger.error({params: error}, '>> Migration -> appMetadata and pageMetadata Migration failed');
        deferred.reject(error);
    });
    return deferred.promise;
};

/**
 * creates Page(s) for a prototype and updates AppMetaData with new Pages
 * @param projectId
 * @param numPages
 * @param createdBy
 * @param applicationType
 * @returns promise:response
 */

pageMetadataService.prototype.createPage = function (projectId, req, createdBy) {

    /***************************************************************************
     * 1.getAppMetadata to find out existing pages count for the give projectId
     * 2.create PageMetadata(s) depending on number of pages2
     * 3.update AppMetadata with the new page(s)
     * 4.call sharedworkspace to save!
     ***************************************************************************/

    var deferred = Promise.defer();
    var swProcessing = registry.getModule('SwProcessing');
    swProcessing.processMetadata(projectId, 'createPage', req, createdBy)
        .then(function (result) {
            var metadataArray = result.metadataArray;
            var appMetadata = _.filter(metadataArray, {type: 'appMetadata'})[0].model;
            deferred.resolve(appMetadata);
        }).catch(function (error) {
            serviceLogger.error({params: error}, '>> createPage -> processMetadata failed');
            deferred.reject(error);
        });


    return deferred.promise;
};

/**
 * creates the App and Page(s) for a prototype
 * @param projectId
 * @param numPages
 * @param applicationType
 * @returns promise:response
 */
// TODO move to appMetadata
pageMetadataService.prototype.createApp = function (projectId, applicationType) {
    var deferred = Promise.defer();
    pageMetadataService.prototype.createPages(projectId, true, applicationType)
        .then(deferred.resolve)
        .catch(function (error) {
            serviceLogger.error({params: error}, '>> pageMetadataService.createPageWithoutAppMetadataUpdate()');
            deferred.reject(error);
        });
    return deferred.promise;
};


/**
 *
 * @param projectId
 * @param numPages
 * @param trueToCreate
 * @returns array of PageMetadataModelObjects suitable for sharedworkspace
 */

pageMetadataService.prototype.createPages = function (projectId, trueToCreate, applicationType, pageArray) {
    /***************************************************************************
     * 1.getAppMetadata to find out existing pages for the give projectId
     * 2.figure out the name of the name (eg: S0, S1...)
     * 3.create PageMetadata(s) depending on number of pages
     ***************************************************************************/

    return getAppMetadata(projectId)
        .then(function (appMetadata) {
            // add pages as normal
            return processNewPages(appMetadata, pageArray);
        })
        .then(function (response) {
            var operations = [];

            pushAppMetadataToArray(response.appMetadata, (trueToCreate) ? constants.operationCreate : constants.operationUpdate, operations);

            var thumbnails = response.thumbnails || getDefaultThumbnails(response.appMetadata.pages);

            _.forEach(response.pagesMetadata, function (pageMetadata) {
                // save operation to add the page
                operations.push({
                    model: pageMetadata,
                    type: constants.pageMetadata,
                    OP: constants.operationCreate
                });
            });

            return {
                operations: operations,
                thumbnails: thumbnails,
                appMetadata: response.appMetadata,
                pagesMetadata: response.pagesMetadata
            };
        })
        .catch(function (err) {
            serviceLogger.error('createPages -> getAppMetadata failed', err);
        });
};

function getDefaultThumbnails(appMdPages) {
    var thumbnails = {};
    _.forEach(appMdPages, function (appMdPage) {
        thumbnails[appMdPage.thumbnailUrl] = {
            buffer: getDefaultThumbnailBuffer()
        };
    });
    return thumbnails;
}


function getDefaultThumbnailBuffer(floorplan) {
    floorplan = floorplan || {};
    var thumbnailData = floorplan.thumbnail || localConfig.defaultEmptyThumbnail;
    return decodeBase64Image(thumbnailData).data;
}

function getAppMetadata(projectId) {
    var deferred = Promise.defer();
    var prototypeService = registry.getModule('PrototypeService');
    prototypeService.getMetadata(projectId, [constants.appMetadata]).then(function (response) {
        serviceLogger.info('>> resolving getMetadata in getAppMetadata');
        return deferred.resolve(response.appMetadata);
    }, function (error) {
        if (error.code === 'SWE001') {
            // no prototype exists for this project - unable to find any metadata
            serviceLogger.info('no prototype exists for this project, unable to find any metadata');
            deferred.resolve();
        }
        else {
            serviceLogger.error({params: error}, '>> pageMetadataService.getAppMetadata()');
            deferred.reject(error);
        }
    }).catch(function (err) {
        serviceLogger.error('error getting metadata', err);
        deferred.reject(err);
    });
    return deferred.promise;
}

/**
 *  gets the default catalogInformation using catalogService
 *
 * */
function getDefaultCatalogInfo(catalogArray) {
    var catalogService = registry.getModule('UICatalog');
    var catalogObject = {};
    var deferred = Promise.defer();
    catalogService.getCatalogsByIds(catalogArray).then(function (catalogInfo) {
        if (!_.isEmpty(catalogArray)) {
            //var filteredCatalog = _.findByValues(catalogInfo, "catalogName", catalogArray);
            catalogObject = _.indexBy(catalogInfo, '_id');
            deferred.resolve(catalogObject);
        }
        else {
            catalogObject[catalogInfo[0]._id] = catalogInfo[0];
            deferred.resolve(catalogObject);
        }
    }, function (error) {
        serviceLogger.error({
            params: error
        }, '>> fetch of pageMetadata.getDefaultCatalogInfo() failed. ');
        deferred.reject(error);
    });
    return deferred.promise;
}

/**
 *  adds the pages to the appMetadata and creates the pageMetadata
 *
 * */
function processNewPages(appMetadata, floorplans) {
    appMetadata = appMetadata || {};
    appMetadata.pages = appMetadata.pages || [];

    var startId = getNextPageId(appMetadata);

    // get catalogs for floorplans
    return getDefaultCatalogInfo(_.pluck(floorplans, 'catalogId'))
        .then(function (catalogs) {

            // verify if we have all fps
            var wrongFloorplan = _.find(floorplans, function (fpName) {
                var floopPlanCatalog = catalogs[fpName.catalogId];
                return !(fpName.floorplan in floopPlanCatalog.floorPlans);
            });
            if (wrongFloorplan) {
                throw new NormanError('Unable to fetch FloorPlan ' + wrongFloorplan + ' from UI Catalog');
            }

            // verify we have the right catalog info
            if (_.isEmpty(appMetadata.pages)) {
                var firstPageCatalog = (!_.isEmpty(floorplans)) ? (_.get(catalogs, _.first(floorplans).catalogId)) : (_.get(catalogs, _.first(_.keysIn(catalogs))));
                var firstPageFloorPlan = (!_.isEmpty(floorplans)) ? (_.get(firstPageCatalog.floorPlans, _.first(floorplans).floorplan)) : (_.get(firstPageCatalog.floorPlans, _.first(_.keysIn(firstPageCatalog.floorPlans))));
                appMetadata.catalogId = firstPageCatalog._id.toString();
                appMetadata.isSmartApp = (firstPageFloorPlan.isSmart === true);
            }

            // calculate pagesMd, appPagesMd, thumbnails
            var thumbnails = {};
            var pagesMetadata = [];

            _.forEach(floorplans, function (floorplanInfo, i) {
                var pageId = i + startId,
                    pageName = floorplanInfo.pageId || (localConfig.pageName + pageId),
                    mongoId = commonServer.utils.shardkey();

                var pageMetadata = new PageMetadataModel();
                pageMetadata._id = mongoId;
                pageMetadata.name = pageName;
                pageMetadata.catalogId = floorplanInfo.catalogId;
                pageMetadata.floorplan = floorplanInfo.floorplan;
                setFloorplanForPage(pageMetadata, catalogs[floorplanInfo.catalogId], floorplanInfo.floorplan);

                var routePattern = localConfig.pageRoutePattern + pageName,
                    pageDisplayName = floorplanInfo.displayName || (localConfig.displayPageName + ' ' + (pageId + 1)),
                    pageUrl = localConfig.indexPageName + '#' + routePattern,
                    thumbnailUrl = localConfig.thumbnailBaseUrl + pageMetadata.name + '.png';

                var appPage = {
                    name: pageName,
                    displayName: pageDisplayName,
                    routePattern: routePattern,
                    pageUrl: pageUrl,
                    floorplan: floorplanInfo.floorplan,
                    catalogId: floorplanInfo.catalogId,
                    thumbnailUrl: thumbnailUrl,
                    id: mongoId
                };

                pagesMetadata.push(pageMetadata);
                var pageIndex = floorplanInfo.pageIndex >= 0 ? floorplanInfo.pageIndex : appMetadata.pages.length;
                appMetadata.pages.splice(pageIndex, 0, appPage);
                var floorplan = catalogs[floorplanInfo.catalogId].floorPlans[floorplanInfo.floorplan];
                if (!floorplanInfo.pageId) {
                    thumbnails[appPage.thumbnailUrl] = {
                        buffer: getDefaultThumbnailBuffer(floorplan)
                    };
                }
            });

            return {
                appMetadata: appMetadata,
                pagesMetadata: pagesMetadata,
                thumbnails: thumbnails
            };
        })
        .catch(function (error) {
            serviceLogger.error({params: error}, '>> pageMetadata.processNewPages()');
        });
}

function setFloorplanForPage(pageMetadata, catalog, floorplanName) {
    var floorplan = catalog.floorPlans[floorplanName];
    var fpControl = catalog.controls[floorplan.rootControl];

    pageMetadata.floorplan = floorplanName;
    if (fpControl) {
        pageMetadata.controls = [];
        var rootControl = createControlFromCatalogMetadata(fpControl, null, catalog, pageMetadata, 0);
        pageMetadata.rootControlId = rootControl.controlId;
    }
    else {
        pageMetadata.isCollection = floorplan.isCollection;
        pageMetadata.controls = floorplan.controls.controls;
        _.each(pageMetadata.controls, function (control) {
            control.catalogId = catalog._id.toString();
        });
        pageMetadata.rootControlId = floorplan.controls.rootControlId;
    }
}

function createControlFromCatalogMetadata(controlMd, parentId, catalog, pageMetadata) {
    var controlId = controlMd.name + '_' + pageMetadata.controls.length;
    var control = {
        controlId: controlId,
        parentControlId: parentId,
        catalogControlName: controlMd.name,
        catalogId: catalog._id.toString()
    };
    // push it immediately, so children will be added after
    pageMetadata.controls.push(control);
    control = pageMetadata.controls[pageMetadata.controls.length - 1];

    var additionalMd = controlMd.additionalMetadata;

    // properties
    control.properties = _.map(additionalMd.properties, function (property) {
        // TODO handle binding
        return {
            name: property.name,
            value: property.defaultValue,
            type: property.type
        };
    });
    // children
    control.groups = _.map(additionalMd.aggregations, function (aggregation, aggrName) {
        var childrenIds = _.map(aggregation.defaultValue, function (aggregationChild) {
            var childMd = catalog.controls[aggregationChild.name];
            var propertiesToOverride = aggregationChild.properties;
            if (!_.isEmpty(propertiesToOverride)) {
                // need to clone otherwise we override its keys
                childMd = _.cloneDeep(childMd);
                // override the default values in additionalMetadata for properties
                var properties = childMd.additionalMetadata.properties || {};
                _.forEach(propertiesToOverride, function (overrideValue, name) {
                    var property = properties[name] || {name: name};
                    property.defaultValue = overrideValue;
                    properties[name] = property;
                });
                childMd.additionalMetadata.properties = properties;
            }
            var child = createControlFromCatalogMetadata(childMd, controlId, catalog, pageMetadata);
            return child.controlId;
        });
        // TODO handle binding
        return {
            groupId: aggrName,
            children: childrenIds
        };
    });
    // TODO events/actions?
    return control;
}

/**
 *
 * update a page: with bunch of updates
 *
 * @param projectId
 * @param updates
 * @param createdBy
 * @returns promise:response
 */
pageMetadataService.prototype.updatePage = function (projectId, req, createdBy) {
    var deferred = Promise.defer();
    var swProcessing = registry.getModule('SwProcessing');
    swProcessing.processMetadata(projectId, constants.operationUpdatePage, req, createdBy).
        then(function (result) {
            var appMetadata = _.filter(result.metadataArray, {type: 'appMetadata'})[0].model;
            deferred.resolve(appMetadata);
        })
        .catch(function (error) {
            serviceLogger.error({params: error}, '>> prototypeBuilderService.generatePrototypePage() failed.');
            deferred.reject(error);
        });

    return deferred.promise;

};

pageMetadataService.prototype.processUpdatePage = function (projectId, pages, createdBy, files) {
    var metadataObjs = [],
        pageObjs = {},
        appMetadata, dataModel;

    serviceLogger.info({params: projectId}, '>> pageMetadataService.processUpdatePage()');

    // TODO separate update of pages from update of files
    return getAppMetadata(projectId)
        .then(function (appMeta) {

            appMetadata = appMeta;
            return appMetadata.isSmartApp ? getDataModel(projectId) : null;
        })
        .then(function (model) {

            dataModel = model;
            var pageIds = [];
            _.forEach(appMetadata.pages, function (page) {
                pageIds.push(page.id);
            });
            return getPages(pageIds);
        })
        .then(function (allPagesObjs) {

            var pageNames = Object.keys(pages);
            _.forEach(pageNames, function (name) {
                pageObjs[name] = allPagesObjs[name];
            });

            if (Object.keys(pageObjs).length !== Object.keys(pages).length) {
                serviceLogger.error({}, '>> trying to update page that doesn\'t exist');
                throw new Error('trying to update page that doesn\'t exist');
            }
            // prepare dataStructure for calling sharedWorkspace for PageMetadata
            for (var pageName in pageObjs) {
                var page = pageObjs[pageName];
                // store only the new controls
                page.controls = pages[pageName].controls;
                page.mainEntity = pages[pageName].mainEntity;
                pushPageMetadataToArray(page._id, page, constants.operationUpdate, appMetadata, metadataObjs);
                if (!appMetadata.isSmartApp) {
                    updateNavigationInAppMetatdata(page, appMetadata, page._id);
                }
                else {
                    module.exports.updateNavigationInSmartAppMetadata(page, allPagesObjs, appMetadata, dataModel);
                }
            }
            // prepare dataStructure for calling sharedWorkspace for appMetadata
            pushAppMetadataToArray(appMetadata, constants.operationUpdate, metadataObjs);
            return {
                operations: metadataObjs,
                thumbnails: files,
                appMetadata: appMetadata // TODO: remove unused
            };
        });
};


/**
 *
 * find PageMetadata ByIds
 *
 * @param ids
 * @returns array of pageMetadataObjects as a promise
 */
function getPages(ids) {
    var deferred = Promise.defer();
    PageMetadataModel.find({_id: {$in: ids}}
        , function (err, docs) {
            if (err) {
                deferred.reject(docs);
            }
            else {
                var res = {};
                docs.forEach(function (doc) {
                    res[doc.name] = doc;
                });
                deferred.resolve(res);

            }
        });
    return deferred.promise;
}


function getPageIds(pageNames, appMetadata) {
    var result = _.map(pageNames, function (pageName) {
        var page = findPageByName(pageName, appMetadata);
        return page.id.toString();
    });
    return result;
}


pageMetadataService.prototype.deletePage = function (projectId, req, createdBy) {
    var deferred = Promise.defer();
    var swProcessing = registry.getModule('SwProcessing');

    swProcessing.processMetadata(projectId, constants.operationDeletePage, req, createdBy).then(function (result) {
        var metadataArray = result.metadataArray;
        var appMetadata = _.filter(metadataArray, {type: 'appMetadata'})[0].model;
        deferred.resolve(appMetadata);
    }).catch(function (error) {
        serviceLogger.error({params: error}, '>> pageMetadataService.deletePage() failed.');
        deferred.reject(error);
    });
    return deferred.promise;
};

pageMetadataService.prototype.processDeletePage = function (projectId, pageName) {
    var deferred = Promise.defer();

    var metadataObjs = [];

    getAppMetadata(projectId).then(function (appMetadata) {

        var page = _.find(appMetadata.pages, function (pageMd) {
            return pageMd.name === pageName;
        });

        if (_.isEmpty(page)) {
            deferred.reject(new NormanError('Unable to perform deletePage() as Page does not exists'));
            return;
        }

        pushPageMetadataToArray(page.id, page, constants.operationDelete, appMetadata, metadataObjs);

        updateOtherPages(pageName, appMetadata, metadataObjs)
            .then(function (updatedPages) {
                updateAppMetadata(pageName, appMetadata, updatedPages);
                deferred.resolve({
                    operations: updatedPages,
                    appMetadata: appMetadata // TODO: remove unused
                });
            });
    });

    return deferred.promise;
};


/**
 *
 * @param projectId
 */
pageMetadataService.prototype.deleteAllPages = function (projectId) {
    var deferred = Promise.defer();
    var metadataObjs = [];

    getAppMetadata(projectId).then(function (appMetadata) {

        appMetadata.pages.forEach(function (page) {
            pushPageMetadataToArray(page.id, page, constants.operationDelete, appMetadata, metadataObjs);
        });

        appMetadata.pages = [];
        appMetadata.navigations = [];

        // populate the datastructure for SharedWorkspace API -- pass the OldIDs for update..
        pushAppMetadataToArray(appMetadata, constants.operationUpdate, metadataObjs);
        deferred.resolve(metadataObjs);

    }).catch(function (err) {
        serviceLogger.error('error deleteallpages', err);
        deferred.reject(err);
    });

    return deferred.promise;
};

pageMetadataService.prototype.updateCoordinates = function (projectId, req, createdBy) {
    var deferred = Promise.defer();
    var swProcessing = registry.getModule('SwProcessing');

    swProcessing.processMetadata(projectId, constants.operationUpdateCoordinates, req, createdBy).then(function (result) {
        var metadataArray = result.metadataArray;
        deferred.resolve(metadataArray);
    }).catch(function (error) {
        serviceLogger.error({params: error}, '>> pageMetadataService.updateCoordinates() failed.');
        deferred.reject(error);
    });
    return deferred.promise;
};

pageMetadataService.prototype.processUpdateCoordinates = function (projectId, coordinatesArray) {
    var deferred = Promise.defer();

    var metadataObjs = [];
    getAppMetadata(projectId).then(function (appMetadata) {
        if (!_.isEmpty(appMetadata) && !_.isEmpty(coordinatesArray)) {
            _.each(coordinatesArray, function (coordinates) {
                _.each(appMetadata.pages, function (pages) {
                    if (pages.name === coordinates.name) {
                        pages.coordinates.x = coordinates.x;
                        pages.coordinates.y = coordinates.y;
                    }
                });
            });
        }


        pushAppMetadataToArray(appMetadata, constants.operationUpdate, metadataObjs);
        deferred.resolve({operations: metadataObjs});

    });
    return deferred.promise;
};

/**
 * processUpdateDisplayNames - update the Prototype data of a given Project with new Display Name for the page
 *
 * @param {String}  projectId - projectId of the prototype
 * @param {jsonObject}   displayNames - Array of pages with displayNames to be updated
 * @returns {Object} operations - Operation of metadata Object which has to be updated
 */

pageMetadataService.prototype.updateDisplayNames = function (projectId, displayNames) {
    var deferred = Promise.defer();

    var metadataObjs = [];
    getAppMetadata(projectId).then(function (appMetadata) {
        if (!_.isEmpty(appMetadata) && !_.isEmpty(displayNames)) {
            _.each(displayNames, function (displayName) {
                _.each(appMetadata.pages, function (page) {
                    if (page.name === displayName.pageName) {
                        page.displayName = displayName.displayName;
                    }
                });
            });
        }
        pushAppMetadataToArray(appMetadata, constants.operationUpdate, metadataObjs);
        deferred.resolve({operations: metadataObjs});

    });
    return deferred.promise;
};


pageMetadataService.prototype.getPage = function (projectId, pageName) {
    var deferred = Promise.defer();

    serviceLogger.info({
        params: projectId
    }, '>> pageMetadataService.getPage()');

    getAppMetadata(projectId).then(function (appMetadata) {
        var page = findPageByName(pageName, appMetadata);
        if (_.isEmpty(page)) {
            deferred.reject(new NormanError('Unable to perform getPage() as Page does not exists'));
        }
        else {
            getPages([page.id.toString()]).then(function (pageObjs) {
                var fullPage = pageObjs[pageName];
                deferred.resolve(fullPage);
            }, deferred.reject);
        }
    }, deferred.reject);

    return deferred.promise;

};

function decodeBase64Image(dataString) {
    var matches = dataString.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/),
        response = {};

    if (matches.length !== 3) {
        return new Error('Invalid input string');
    }

    response.type = matches[1];
    response.data = new Buffer(matches[2], 'base64');

    return response;
}

function findPageByName(name, appMd) {
    return _.find(appMd.pages, function (page) {
        return page.name === name;
    });
}
function findPageById(id, appMd) {
    return _.find(appMd.pages, function (page) {
        return page.id.equals(id);
    });
}

function updateNavigationInAppMetatdata(pageMetadata, appMetadata, oldPageId) {
    // replace old navigation pageid with new pageid
    _.each(appMetadata.navigations, function (navigation) {
        if (navigation.sourcePageId === oldPageId.toString()) {
            navigation.sourcePageId = pageMetadata._id.toString();
        }
        if (navigation.targetPageId === oldPageId.toString()) {
            navigation.targetPageId = pageMetadata._id.toString();
        }
    });

    // Removes all elements from array that predicate returns truthy for and returns an array of the removed elements.
    _.remove(appMetadata.navigations, function (navigation) {
        return navigation.pageFrom === pageMetadata.name;
    });

    pageMetadata.controls.forEach(function (control) {
        control.events.forEach(function (event) {
            if (event.actionId === 'NAVTO' || event.actionId === 'NAVTOWITHCONTEXT') {
                appMetadata.navigations.push({pageFrom: pageMetadata.name, pageTo: event.params[0].value});
            }
        });
    });
}

function getEntitiesFromBinding(pageMetadata, dataModel) {
    var entities = [], entityIds = {};

    _.forEach(pageMetadata.controls, function (control) {
        _.forEach(control.properties, function (property) {
            _.forEach(property.binding.paths, function (path) {
                if (!entityIds[path.entityId]) {
                    var entity = _.find(dataModel.entities, {_id: path.entityId});
                    entityIds[path.entityId] = true;
                    entities.push(entity);
                }
            });
        });
    });

    return entities;
}

// Rules to create navigations:
// - from a ListReport to any other Page
//      * if they have same main entity
// - from a Page P1 to a Page P2
//      * if P2 is not a ListReport
//      * and P1 has a binding involving a navigation property to the main entity of P2
module.exports.updateNavigationInSmartAppMetadata = function (pageMetadata, allPageMetadata, appMetadata, dataModel) {

    // Removes from appMetadata all navigations where current page is involved
    _.remove(appMetadata.navigations, function (navigation) {
        return navigation.pageFrom === pageMetadata.name || navigation.pageTo === pageMetadata.name;
    });

    if (pageMetadata.mainEntity) {
        // retrieve all entities that are the source of a navigation property to current-page main entity
        var sourceEntities = _.where(dataModel.entities, {
            navigationProperties: [
                {toEntityId: pageMetadata.mainEntity}
            ]
        });
        // retrieve all entities that are involved in a binding on this page
        var boundEntities = getEntitiesFromBinding(pageMetadata, dataModel);
        // retrieve all possible navigation property paths
        var boundEntityNavigationsById = {};
        var possibleNavPaths = _.transform(boundEntities, function (result, entity) {
            _.each(entity.navigationProperties, function (navProp) {
                boundEntityNavigationsById[navProp._id] = navProp;
                result.push({entityId: entity._id, propertyId: navProp._id});
            });
        });
        // retrieve all effective navigation target entity ids
        var navigationTargetIds = [];
        if (possibleNavPaths.length > 0) {
            navigationTargetIds = _.transform(possibleNavPaths, function (result, path) {
                var controls = _.where(pageMetadata.controls, {properties: [{binding: {paths: [path]}}]});
                if (controls.length > 0) {
                    var navigationProperty = boundEntityNavigationsById[path.propertyId];
                    result.push(navigationProperty.toEntityId);
                }
            });
        }
        var currentPageIsListReport = pageMetadata.floorplan === 'ListReport';
        _.each(allPageMetadata, function (otherPageMetadata) {
            if (otherPageMetadata.name !== pageMetadata.name) {
                var otherPageIsListReport = otherPageMetadata.floorplan === 'ListReport',
                    sameMainEntity = otherPageMetadata.mainEntity === pageMetadata.mainEntity;

                if (otherPageIsListReport && sameMainEntity) {
                    appMetadata.navigations.push({
                        pageFrom: otherPageMetadata.name,
                        pageTo: pageMetadata.name,
                        target: 'pages'
                    });
                }
                else if (currentPageIsListReport && sameMainEntity) {
                    appMetadata.navigations.push({
                        pageFrom: pageMetadata.name,
                        pageTo: otherPageMetadata.name,
                        target: 'pages'
                    });
                }
                else {
                    // 1 - Navigation from other to current page
                    if (!currentPageIsListReport) {
                        var navigationAdded = false,
                            otherPageBoundEntities = getEntitiesFromBinding(otherPageMetadata, dataModel);
                        _.each(otherPageBoundEntities, function (otherPageBoundEntity) {
                            // if a binding in other page involves an entity that is the source of a navigation property to current-page main entity
                            if (_.findIndex(sourceEntities, {_id: otherPageBoundEntity._id}) !== -1) {
                                // retrieve all possible navigation property paths
                                var possibleNavPaths = _.transform(otherPageBoundEntity.navigationProperties, function (result, nav) {
                                    if (pageMetadata.mainEntity === nav.toEntityId) {
                                        result.push({entityId: otherPageBoundEntity._id, propertyId: nav._id});
                                    }
                                });
                                _.each(possibleNavPaths, function (path) {
                                    var controls = _.where(otherPageMetadata.controls, {
                                        properties: [
                                            {binding: {paths: [path]}}
                                        ]
                                    });
                                    // if a control is bound with this nav path
                                    if (controls.length > 0) {
                                        appMetadata.navigations.push({
                                            pageFrom: otherPageMetadata.name,
                                            pageTo: pageMetadata.name,
                                            target: 'pages'
                                        });
                                        navigationAdded = true;
                                    }
                                    return !navigationAdded; //add navigation only once
                                });
                            }
                            return !navigationAdded; //add navigation only once
                        });
                    }
                    // 2 - Navigation from current to other page
                    if (!otherPageIsListReport && otherPageMetadata.mainEntity) {
                        if (_.indexOf(navigationTargetIds, otherPageMetadata.mainEntity) !== -1) {
                            appMetadata.navigations.push({
                                pageFrom: pageMetadata.name,
                                pageTo: otherPageMetadata.name,
                                target: 'pages'
                            });
                        }
                    }
                }
            }
        });
    }
};

function getDataModel(projectId) {
    var prototypeService = registry.getModule('PrototypeService');
    return prototypeService.getMetadata(projectId, ['dataModelMetadata'])
        .then(function (versions) {
            if (!versions || !versions.dataModelMetadata || versions.dataModelMetadata.length <= 0) {
                throw new NormanError('Impossible to retrieve DataModel Metadata');
            }
            var lastIndex = versions.dataModelMetadata.length - 1;
            return versions.dataModelMetadata[lastIndex].toObject();
        });
}

function updateOtherPages(pageName, appMetadata, metadataObjs) {

    var deferred = Promise.defer();
    var pageNames = [];

    appMetadata.navigations.forEach(function (navigation) {
        if (navigation.pageTo === pageName) {
            pageNames.push(navigation.pageFrom);
        }
    });

    var ids = getPageIds(pageNames, appMetadata);

    getPages(ids).then(function (pageObjs) {

        _.forEach(pageObjs, function (page) {
            // store only the new controls
            page.controls.forEach(function (control) {
                _.remove(control.events, function (event) {
                    return ((event.actionId === 'NAVTO' || event.actionId === 'NAVTOWITHCONTEXT') && event.params[0].value === pageName);
                });
            });

            pushPageMetadataToArray(page._id, page, constants.operationUpdate, appMetadata, metadataObjs);
        });
        deferred.resolve(metadataObjs);
    });
    return deferred.promise;
}

function updateAppMetadata(pageName, appMetadata, metadataObjs) {

    _.remove(appMetadata.navigations, function (navigation) {
        return (navigation.pageTo === pageName || navigation.pageFrom === pageName);
    });


    _.remove(appMetadata.pages, function (page) {
        return page.name === pageName;
    });

    pushAppMetadataToArray(appMetadata, constants.operationUpdate, metadataObjs);

}

function pushAppMetadataToArray(appMetadata, operation, metadataObjs) {
    var metadata = {};
    metadata.oldId = appMetadata._id;
    appMetadata._id = commonServer.utils.shardkey();
    metadata.model = new AppMetadataModel(appMetadata);
    metadata.type = constants.appMetadata;
    metadata.OP = operation;
    metadataObjs.push(metadata);
}

function pushPageMetadataToArray(oldid, pageMetadata, operation, appMetadata, metadataObjs) {
    var metadata = {};
    metadata.oldId = oldid;
    pageMetadata._id = commonServer.utils.shardkey();
    metadata.model = new PageMetadataModel(pageMetadata);
    metadata.type = constants.pageMetadata;
    metadata.OP = operation;
    metadataObjs.push(metadata);

    if (operation === constants.operationUpdate) {

        var appMdPage = findPageById(metadata.oldId, appMetadata);
        if (appMdPage) {
            appMdPage.id = pageMetadata._id;
        }
    }
}

function getNextPageId(appMetadata) {
    if (_.isEmpty(appMetadata.pages)) {
        return 0;
    }
    var count = 0;
    _.forEach(appMetadata.pages, function (page) {
        var i = _.parseInt(page.name.replace(localConfig.pageName, ''));
        if (!isNaN(i)) {
            count = Math.max(count, i);
        }
    });
    return count + 1;
}

// TODO reinitializePrototype
// 1. deleteAllPages - returns metada array
// 2. createPages - return metadat array
// 3. merge the arrays - pagemetadata directly, 2nd appmetadata array: delete pages which 1st pagemetadat array returned
// return the joined array

pageMetadataService.prototype.reinitializePrototype = function (projectId, applicationType) {
    var that = this,
        deferred = Promise.defer(),
        deletePageMetadataArray, createPageMetadataArray;

    that.deleteAllPages(projectId)
        .then(function (deletedPages) {
            deletePageMetadataArray = deletedPages;

            that.createPages(projectId, false, applicationType)
                .then(function (model) {
                    createPageMetadataArray = model.operations;

                    // merge metadata arrays
                    var createPageAppMetadata = _.filter(createPageMetadataArray, {type: 'appMetadata'})[0];
                    var createPagePagesMetadata = _.filter(createPageMetadataArray, {type: 'pageMetadata'});

                    // var deletePageAppMetadata = _.filter(deletePageMetadataArray, {'type': 'appMetadata'})[0].model;
                    var deletePagePagesMetadata = _.filter(deletePageMetadataArray, {type: 'pageMetadata'});

                    var finalPageMetadata = createPagePagesMetadata.concat(deletePagePagesMetadata);
                    deletePagePagesMetadata.forEach(function (pageMetadata) {
                        createPageAppMetadata.model.pages.forEach(function (page) {
                            if (page.id.toString() === pageMetadata.oldId.toString()) {
                                var index = createPageAppMetadata.model.pages.indexOf(page);
                                createPageAppMetadata.model.pages.splice(index, 1);
                            }
                        });
                        createPageAppMetadata.model.navigations.forEach(function (nav) {
                            if (nav.sourcePageId === pageMetadata.model._id.toString()) {
                                var index = createPageAppMetadata.model.navigations.indexOf(nav);
                                createPageAppMetadata.model.navigations.splice(index, 1);
                            }
                        });

                    });

                    var finalMetadata = finalPageMetadata.concat(createPageAppMetadata);
                    deferred.resolve({
                        operations: finalMetadata
                    });
                });

        })
        .catch(function (error) {
            serviceLogger.error({
                params: error
            }, '>> pageMetadataService.reinitializePrototype() failed.');
            deferred.reject(error);
        });


    return deferred.promise;
};

function bindingContainsEntity(entityId, bindingMd) {
    return !_.isEmpty(bindingMd) && _.some(bindingMd.paths, {entityId: entityId});
}

function bindingContainsProperty(entityId, propertyId, bindingMd) {
    return !_.isEmpty(bindingMd) && _.some(bindingMd.paths, {entityId: entityId, propertyId: propertyId});
}

function bindingContainsEntitiesOrProperties(entityIds, properties, binding) {
    var contains = false;
    _.forEach(entityIds, function (entityId) {
        if (bindingContainsEntity(entityId, binding)) {
            contains = true;
        }
        return !contains;
    });
    if (!contains) {
        _.forEach(properties, function (property) {
            if (bindingContainsProperty(property.entityId, property.propertyId, binding)) {
                contains = true;
            }
            return !contains;
        });
    }
    return contains;
}

function deleteEntitiesAndPropertiesFromPage(entityIds, properties, pageMd) {
    var didUpdate = false;
    if (_.contains(entityIds, pageMd.mainEntity)) {
        pageMd.mainEntity = undefined;
        didUpdate = true;
    }
    _.forEach(pageMd.controls, function (controlMd) {
        var toBeCleaned = [].concat(controlMd.groups).concat(controlMd.properties);
        _.forEach(toBeCleaned, function (obj) {
            if (bindingContainsEntitiesOrProperties(entityIds, properties, obj.binding)) {
                obj.binding = {};
                obj.binding.paths = [];
                didUpdate = true;
            }
        });
    });
    return didUpdate;
}

/**
 * deleteEntity - entityIds the entityId from the PageMetadata of the prototype
 *
 * @param {String} projectId - projectId of the prototype
 * @param {String[]} entityIds
 * @param {String[]} properties (propertyId and entityId) the properties that are deleted (and their entity)
 * @returns {Object} operations - Operation of metadata Object which has to be updated
 */
pageMetadataService.prototype.deleteEntitiesAndProperties = function (projectId, entityIds, properties) {
    serviceLogger.info('pageMetadataService>>deleteEntitiesAndProperties>>' + projectId);
    var deferred = Promise.defer();
    if (_.isEmpty(projectId)) {
        deferred.reject('must pass projectId!');
    }
    else {
        getAppMetadata(projectId)
            .then(function (appMetadata) {
                var pageNames = _.map(appMetadata.pages, 'name');
                var pageIds = getPageIds(pageNames, appMetadata);
                return getPages(pageIds);
            })
            .then(function (pagesMd) {
                var operations = _.chain(pagesMd)
                    // keep only updated ones
                    .filter(function (pageMd) {
                        return deleteEntitiesAndPropertiesFromPage(entityIds, properties, pageMd);
                    })
                    .map(function (pageMd) {
                        return {
                            model: pageMd,
                            oldId: pageMd.id,
                            type: constants.pageMetadata,
                            OP: constants.operationUpdate
                        };
                    })
                    .value();
                deferred.resolve({
                    files: [],
                    operations: operations
                });
            })
            .catch(deferred.reject);
    }
    return deferred.promise;
};


/**
 * Retrieve the possible main entity for this page.
 * Note: In smart app, ObjectPage cannot have the same main entity as another ObjectPage
 * @param projectId
 * @param pageName
 * @returns {*} mainEntities - An array of possible main entities
 */
pageMetadataService.prototype.getPossibleMainEntities = function (projectId, pageName) {

    serviceLogger.info({params: projectId}, '>> pageMetadataService.getPossibleMainEntities()');
    var entities = [];

    return getDataModel(projectId)
        .then(function (dataModel) {
            if (dataModel && !_.isEmpty(dataModel.entities)) {
                _.forEach(dataModel.entities, function (entity) {
                    entities.push(entity._id);
                });
            }
            return _.isEmpty(entities) ? null : getAppMetadata(projectId);
        })
        .then(function (appMetadata) {
            if (!appMetadata || !appMetadata.isSmartApp) {
                return null;
            }
            var pageIds = [];
            _.forEach(appMetadata.pages, function (page) {
                pageIds.push(page.id.toString());
            });
            return getPages(pageIds);
        })
        .then(function (pageObjs) {
            if (pageObjs) {
                var currentPage = pageObjs[pageName];
                // In smart app, ObjectPage cannot have the same main entity as another ObjectPage
                if (currentPage.floorplan === 'ObjectPage') {
                    _.forEach(pageObjs, function (page) {
                        if (page.id !== currentPage.id && page.floorplan === 'ObjectPage' && page.mainEntity) {
                            _.remove(entities, function (e) {
                                return e === page.mainEntity;
                            });
                        }
                    });
                }
            }
            return entities;
        });
};
