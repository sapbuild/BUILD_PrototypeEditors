'use strict';

var commonBuilder = require('../builderUtils.js');
var fs = require('fs');
var path = require('path');
var _ = require('norman-server-tp').lodash;
require('norman-server-tp');

/**
 Provides UI5 Specific View Rendering Logic
 This includes :
 - How to render bindings
 - What's the main object in the page
 - How to extract and process namespaces
 **/

var NORMAN_PROTOTYPE_NAMESPACE = 'generated.app';
var NORMAN_PROTOTYPE_PATH = 'generated/app/';
var VIEW_FOLDER_PREFIX = 'view';
var XMLNS_PREFIX = 'xmlns:';
var UI5_MVC = 'sap.ui.core.mvc';
var EVENT_HANDLER_PREFIX = '_on';
var LIBRARIES = 'sap.m, sap.ui.unified, sap.ui.commons';
var SMART_PRELOAD_LIBRARIES = 'sap.ui.core,sap.ui.layout,sap.ui.commons,sap.m,sap.ui.unified,sap.ui.comp,sap.ui.generic.template,sap.suite.ui.generic.template,sap.ushell,sap.uxap,sap.ui.table';
var PRELOAD_LIBRARIES = 'sap.m,sap.ui.unified,sap.ui.core,sap.ui.layout,sap.ui.commons';
var SMART_LIBRARIES = 'sap.ui.generic.app, sap.ui.generic.template, sap.suite.ui.generic.template';
var UI5_URITYPE = 'sap_ui_core_URI';
var ROUTER_MATCHED_METHOD = 'handleRouteMatched';
var EVENT_PARAM = 'oEvent';
var compiledControllerTemplate;

var compiledComponentTemplate;
var compiledComponentPreloadTemplate;
var compiledSmartComponentTemplate;
var compiledIndexTemplate;
var compiledSmartIndexTemplate;
var handleRouteMatchedTemplate;
var formulaCalculationTemplate;
var manifestJSONTemplate;

var namespaceMap = {};
var namespacePrefix = {};
var isInitialized = false;
/** Load the template file once at the start of the server **/
exports.initialize = function (done) {
    if (!isInitialized) {
        _.templateSettings.interpolate = /<%=([\s\S]+?)%>/g;
        var templatePromises = [];
        var readFileAsPromised = function (fileName) {
            return Promise.invoke(fs.readFile, path.join(__dirname, fileName));
        };
        templatePromises.push(readFileAsPromised('ui5/Controller.js.tmpl').then(function (fileData) {
            compiledControllerTemplate = _.template(fileData);
        }));
        templatePromises.push(readFileAsPromised('ui5/handleRouteMatched.js.tmpl').then(function (fileData) {
            handleRouteMatchedTemplate = _.template(fileData);
        }));
        templatePromises.push(readFileAsPromised('ui5/Component.js.tmpl').then(function (fileData) {
            compiledComponentTemplate = _.template(fileData);
        }));
        templatePromises.push(readFileAsPromised('ui5/Component-preload.js.tmpl').then(function (fileData) {
            compiledComponentPreloadTemplate = _.template(fileData);
        }));
        templatePromises.push(readFileAsPromised('ui5/SmartComponent.js.tmpl').then(function (fileData) {
            compiledSmartComponentTemplate = _.template(fileData);
        }));
        templatePromises.push(readFileAsPromised('ui5/index.html.tmpl').then(function (fileData) {
            compiledIndexTemplate = _.template(fileData);
        }));
        templatePromises.push(readFileAsPromised('ui5/smartIndex.html.tmpl').then(function (fileData) {
            compiledSmartIndexTemplate = _.template(fileData);
        }));
        templatePromises.push(readFileAsPromised('ui5/formulaCalculation.js.tmpl').then(function (fileData) {
            formulaCalculationTemplate = fileData;
        }));
        templatePromises.push(readFileAsPromised('ui5/manifest.json.tmpl').then(function (fileData) {
            manifestJSONTemplate = _.template(fileData);
        }));

        Promise.all(templatePromises).then(function () {
            _.templateSettings.interpolate = /{{([\s\S]+?)}}/g;
            isInitialized = true;
        }).callback(done);
    }
    else {
        done();
    }
};

exports.reset = function () {
    namespaceMap = {};
    namespacePrefix = {};
    return this;
};

exports.getControllerName = function (viewName) {
    return NORMAN_PROTOTYPE_NAMESPACE + '.' + VIEW_FOLDER_PREFIX + '.' + viewName;
};

exports.getRootElement = function (viewMetadata) {
    return {
        'mvc:View': {
            '@xmlns:mvc': UI5_MVC,
            '@controllerName': this.getControllerName(viewMetadata.name)
        }
    };
};

exports.getAvailablePrefix = function (prefix) {
    var prefixToUse = prefix;
    var existingPrefix = namespacePrefix[prefix];
    if (existingPrefix !== undefined) {
        prefixToUse = prefix + (existingPrefix++);
    }
    namespacePrefix[prefixToUse] = 1;
    return prefixToUse;
};

exports.extractControlInformation = function (controlType) {
    var lastDotIndex = controlType.lastIndexOf('_');
    var controlName = controlType.substr(lastDotIndex + 1);
    var namespaceValue = controlType.substr(0, lastDotIndex);
    var namespaceObject = namespaceMap[namespaceValue] || null;
    if (namespaceObject === null) {
        namespaceObject = {};
        var lastNamespaceDotIndex = namespaceValue.lastIndexOf('_');
        namespaceObject.namespaceValue = namespaceValue.replace(/_/g, '.');
        var prefix = namespaceObject.namespaceValue.substr(lastNamespaceDotIndex + 1);
        // Check if prefix is available
        namespaceObject.prefix = this.getAvailablePrefix(prefix);
        namespaceObject.qualifiedNamespace = XMLNS_PREFIX + namespaceObject.prefix;
        namespaceMap[namespaceValue] = namespaceObject;
    }
    return {
        namespaceObject: namespaceObject,
        controlName: controlName,
        prefixedControlName: namespaceObject.prefix + ':' + controlName
    };
};

exports.getEventHandlerName = function (eventInfo, controlId) {
    var capitalize = function (nameToCapitalize) {
        return nameToCapitalize.charAt(0).toUpperCase() + nameToCapitalize.substring(1).replace(/\W/g, '_');
    };
    return EVENT_HANDLER_PREFIX + capitalize(eventInfo.eventId) + capitalize(controlId);
};

exports.getExpandPath = function (parentPath, binding) {
    var bindingPaths = [], bindingPath;
    // Take only relative paths (sub paths of the ancestor path)
    if (binding.isRelative) {
        if (binding.paths) {
            _.forEach(binding.paths, function (bindingSubPath) {
                if (commonBuilder.isNavigationProperty(bindingSubPath.entityId, bindingSubPath.propertyId)) {
                    bindingPaths.push(commonBuilder.retrievePropertyName(bindingSubPath.entityId, bindingSubPath.propertyId));
                }
                else {
                    // break;
                    return false;
                }
            });
            bindingPath = bindingPaths.join('/');
        }
    }

    if (parentPath && bindingPath) {
        bindingPath = parentPath + '/' + bindingPath;
    }

    return bindingPath;
};

exports.retrieveBindingPath = function (binding) {
    var bindingPaths = [], bindingPath, entityId, propertyType;
    if (binding.paths && binding.paths.length > 0) {
        binding.paths.forEach(function (bindingSubPath) {
            bindingPaths.push(commonBuilder.retrievePropertyName(bindingSubPath.entityId, bindingSubPath.propertyId));
            entityId = binding.paths[0].entityId;
        });
        bindingPath = bindingPaths.join('/');

        // use the last sub path information to get the property type
        var importantPath = binding.paths[binding.paths.length - 1];
        propertyType = commonBuilder.retrievePropertyType(importantPath.entityId, importantPath.propertyId);
    }

    if (bindingPath && binding.isRelative === false) {
        bindingPath = '/' + commonBuilder.retrieveEntityName(entityId, true) + '/' + bindingPath;
    }

    // add extra information based on the property type
    if (propertyType) {
        bindingPath = this.enrichBindingPath(bindingPath, propertyType);
    }

    return bindingPath;
};


exports.retrieveBindingInfo = function (binding) {
    var bindingPaths = [], bindingPath, entityId, propertyTargetEntity, bindingProperty, propertyType;
    if (binding.paths && binding.paths.length > 0) {
        binding.paths.forEach(function (bindingSubPath) {
            bindingPaths.push(commonBuilder.retrievePropertyName(bindingSubPath.entityId, bindingSubPath.propertyId));
            entityId = binding.paths[0].entityId;
            bindingProperty = binding.paths[0].propertyId;
        });
        bindingPath = bindingPaths.join('/');

        // use the last sub path information to get the property type
        var importantPath = binding.paths[binding.paths.length - 1];
        propertyTargetEntity = commonBuilder.retrievePropertyTarget(importantPath.entityId, importantPath.propertyId);
        var propertyTargetEntityName = commonBuilder.retrieveEntityName(propertyTargetEntity);
        propertyType = commonBuilder.retrievePropertyType(importantPath.entityId, importantPath.propertyId);
    }

    if (bindingPath && binding.isRelative === false) {
        bindingPath = '/' + commonBuilder.retrieveEntityName(entityId, true) + '/' + bindingPath;
    }

    return {
        bindingPath: bindingPath,
        entityId: entityId,
        bindingProperty: bindingProperty,
        targetEntityName: propertyTargetEntityName,
        type: propertyType
    };
};

exports.preparePropertyBindingPath = function (binding) {
    var bindingPath = exports.retrieveBindingPath(binding);
    return (bindingPath) ? '{' + bindingPath + '}' : null;
};

exports.prepareListBindingPath = function (binding, expandPaths) {
    var bindingPath, entityId, propertyId, result;
    if (binding.paths && binding.paths.length > 0) {
        entityId = binding.paths[0].entityId;
        propertyId = binding.paths[0].propertyId;
    }

    if (propertyId === undefined || propertyId === '') {
        if (binding.isRelative === false) {
            bindingPath = '/' + commonBuilder.retrieveEntityName(entityId, true);
        }
    }
    else {
        bindingPath = commonBuilder.retrievePropertyName(entityId, propertyId);
        if (bindingPath && binding.isRelative === false) {
            bindingPath = '/' + commonBuilder.retrieveEntityName(entityId, true) + '/' + bindingPath;
        }
    }
    if (bindingPath) {
        if (expandPaths && expandPaths.length > 0) {
            result = '{path:\'' + bindingPath + '\', parameters:{expand:\'' + expandPaths.join(',') + '\'}}';
        }
        else {
            result = '{' + bindingPath + '}';
        }
    }
    else {
        result = null;
    }
    return result;

};

function generateFunction(functionName, functionParams, functionContent) {
    functionParams = functionParams || '';
    return '\t' + functionName + ': function(' + functionParams + ') {\r\n\t\t' + functionContent + '\r\n\t}';
}

/**
 * Generate an object of possible navigations from any entity of the datamodel to each given target page.
 * {
 *   "entityName" :  {
 *        "TargetPage1Name" : "RelationName"
 *        "TargetPage2Name" : "RelationName2"
 *        }
 *   "entityName2 : ...
 * }
 * The target page should have a main entity which is either:
 * - The same as the current entity. RelationName will be an empty string.
 * - The same entity ((toEntityId) as navigation property from the current entity.
 * If the target page main's entity does not follow one of the two bove rules (incompatible) no line in the entity will be generated.
 * @param targetPages {Page[]} the list of target pages.
 * @returns {*} the Javascript string representing the navigation data
 */
function generateEntityNavigations(targetPages) {

    if (targetPages.length === 0) {
        return '';
    }

    var result = [];
    _.each(commonBuilder.dataModel.entities, function (entity) {
        var entityNavigations = [];

        _.each(targetPages, function (targetPage) {

            var navigationProperty = (entity._id === targetPage.mainEntity) ? {name: ''} : null;

            if (!navigationProperty) {
                navigationProperty = _.find(entity.navigationProperties, function (internalNavigationProperty) {
                    return internalNavigationProperty.toEntityId === targetPage.mainEntity;
                });
            }

            if (navigationProperty != null) {
                entityNavigations.push('\t\t"' + targetPage.name + '": "' + navigationProperty.name + '"');
            }
        });

        if (entityNavigations.length > 0) {
            result.push('\t"' + entity.nameSet + '": {\n' + entityNavigations.join(',\n') + '\n\t}');
        }
    });

    return result.join(',\n');
}

function generateNavigationWithContext() {

    // Get the pages that are navigation targets
    var targetPages = {};

    _.each(commonBuilder.appMetadata.navigations, function (navigation) {
        var targetPage = _.find(commonBuilder.appMetadata.pages, function (page) {
            return navigation.pageTo === page.name;
        });

        // Only consider target pages that have a main entity
        if (targetPage != null && targetPage.mainEntity != null) {
            targetPages[targetPage.name] = targetPage;
        }
    });

    targetPages = _.values(targetPages);

    // Generate entity to page navigation data which will be used a runtime to perform a contextual navigation
    return generateEntityNavigations(targetPages);
}

exports.generateEventHandlerCode = function (eventHandlerName, actionInfo) {
    var actionCode = (actionInfo !== null) ? _.template(actionInfo.actionFn)(actionInfo.params) : '';
    return generateFunction(eventHandlerName, EVENT_PARAM, actionCode);
};

exports.generateRouterCode = function (navigationTargets, expandParameters) {
    _.each(navigationTargets, function (navigationTarget) {
        if (expandParameters == null) {
            navigationTarget.params = '{}';
        }
        else {
            var joinedExpandParams = _.keys(expandParameters).join(',');
            if (joinedExpandParams !== '') {
                navigationTarget.params = '{expand:\'' + joinedExpandParams + '\'}';
            }
            else {
                navigationTarget.params = '{}';
            }

        }
    });
    var initContent = handleRouteMatchedTemplate({navigationTargets: navigationTargets});
    return {
        methodName: ROUTER_MATCHED_METHOD,
        content: generateFunction(ROUTER_MATCHED_METHOD, EVENT_PARAM, initContent)
    };
};

exports.generateController = function (pageName, eventHandlerCollection, sourceNavigations) {
    return compiledControllerTemplate({
        controllerName: this.getControllerName(pageName),
        sourceNavigations: sourceNavigations,
        eventHandlers: _.reduce(eventHandlerCollection, function (resultString, eventHandlerCode) {
            resultString += ',';
            return resultString + '\r\n' + eventHandlerCode;
        })
    });
};

exports.generateIndex = function (pageMetadatas, ui5Url, isSnapshot) {
    var libraryList = [];
    _.each(pageMetadatas, function (pageMetadata) {
        _.each(pageMetadata.controls, function (control) {
            if (libraryList.indexOf(control.controlCatalog) === -1) {
                libraryList.push(control.controlCatalog);
            }
        });
    });
    // Temp fix: remove sap-ui-core.js from ui5Url until Catalog Manager PR has been merged
    var isOldCatalog = false;
    if (_.endsWith(ui5Url, '/sap-ui-core.js')) {
        ui5Url = ui5Url.replace('/sap-ui-core.js', '');
        isOldCatalog = true;
    }
    var ui5CoreScript = 'sap-ui-core.js';
    var ui5MergedCss = '';
    var preloadLibraries = PRELOAD_LIBRARIES;
    if (!isSnapshot && !isOldCatalog) {
        if (commonBuilder.appMetadata.isSmartApp) {
            ui5CoreScript = 'sap-ui-core-st-preloaded.js';
            ui5MergedCss = 'sap-ui-st-merged-libraries.css';
            preloadLibraries = SMART_PRELOAD_LIBRARIES;
        }
        else {
            ui5CoreScript = 'sap-ui-core-preloaded.js';
            ui5MergedCss = 'sap-ui-merged-libraries.css';
        }
    }

    var params = {
        ui5Url: ui5Url,
        ui5Libraries: LIBRARIES,
        ui5CoreScript: ui5CoreScript,
        ui5MergedCss: ui5MergedCss,
        preloadLibraries: preloadLibraries,
        localNormanAngular: '',
        isSnapshot: isSnapshot,
        isOldCatalog: isOldCatalog
    };
    if (commonBuilder.appMetadata.isSmartApp) {
        params.ui5Libraries += ', ' + SMART_LIBRARIES;
    }
    var compiledIndex;
    if (commonBuilder.appMetadata.isSmartApp) {
        compiledIndex = compiledSmartIndexTemplate(params);
    }
    else {
        compiledIndex = compiledIndexTemplate(params);
    }
    return compiledIndex;
};

exports.generateRouter = function () {
    var appMetadata = commonBuilder.appMetadata;
    var pageMetadatas = _.clone(appMetadata.pages) || [];
    var appTypeControl, config;
    var defaultPage = (pageMetadatas.length > 0) ? pageMetadatas[0] : null;

    // create context page routing
    var aNavigation = appMetadata.navigations;
    var routes = _.map(aNavigation, function (navigation) {
        var pattern = navigation.pageTo + '/:context:';
        var targetPage = _.find(appMetadata.pages, {name: navigation.pageTo});

        // Remove page so page routing below is not created when the page is the target of a navigation
        _.remove(pageMetadatas, targetPage);

        var targetPageName = (targetPage) ? targetPage.name : '';
        return '\t\t\t\t{ pattern: "' + pattern + '",name: "' + targetPageName + '", view: "' + targetPageName + '"}';
    });

    // create application control
    if (appMetadata.appType === 'masterDetail') {
        appTypeControl = 'sap.m.SplitApp';
        config = '\t\t\t\ttargetAggregation: "detailPages"';
    }
    else {
        appTypeControl = 'sap.m.App';
        config = '\t\t\t\ttargetAggregation: "pages"';
    }

    // create page routing
    var appType = appMetadata.appType || 'App';

    var pages = _.map(pageMetadatas, function (pageMetadata) {
        var name = pageMetadata.name;

        var target = (appType === 'masterDetail' && pageMetadata.name === 'S0') ? 'targetAggregation: "masterPages", ' : '';
        return '\t\t\t\t{' + target + ' pattern: "' + name + '",name: "' + name + '", view: "' + name + '"}';
    });

    // create default pattern
    if (defaultPage) {
        var sDefaultPage = defaultPage.name;
        var master = (appType === 'masterDetail' && sDefaultPage === 'S0') ? 'targetAggregation: "masterPages", ' : '';
        pages.push('\t\t\t\t{' + master + ' pattern: "",name: "default", view: "' + sDefaultPage + '"}');
    }

    routes = routes.concat(pages);

    var compiledComponent;
    if (appMetadata.isSmartApp) {
        compiledComponent = compiledSmartComponentTemplate({
            config: config,
            routes: routes.join(',\n'),
            navigationWithContext: '',
            appTypeControl: appTypeControl,
            appType: appType,
            appBackgroundColor: '#FFFFFF'
        });
    }
    else {
        compiledComponent = compiledComponentTemplate({
            config: config,
            routes: routes.join(',\n'),
            navigationWithContext: generateNavigationWithContext(),
            appTypeControl: appTypeControl,
            appType: appType,
            appBackgroundColor: '#FFFFFF'
        });
    }
    return compiledComponent;
};

exports.generateBundle = function (bundleArtifacts) {
    var bundleContent = null;
    if (bundleArtifacts) {
        var preloadModules = {};
        _.each(bundleArtifacts, function (artifact) {
            preloadModules[NORMAN_PROTOTYPE_PATH + artifact.path] = artifact.filecontent;
        });
        bundleContent = compiledComponentPreloadTemplate({
            preloadModules: JSON.stringify(preloadModules)
        });
    }
    return bundleContent;
};

exports.generateFormulaHelper = function () {
    return formulaCalculationTemplate;
};

exports.isURIType = function (propertyType) {
    return propertyType === UI5_URITYPE;
};

exports.escapePropertyValue = function (propertyValue) {
    if (propertyValue) {
        propertyValue = propertyValue.replace(/^{([^}]+)}$/, function (nop, foundMatch) {
            return '\\{' + foundMatch + '\\}';
        });
    }
    else {
        propertyValue = '';
    }
    return propertyValue;
};

exports.enrichBindingPath = function (bindingPath, propertyType) {

    if (propertyType === 'Date') {
        bindingPath = 'path: \'' + bindingPath + '\', type: \'sap.ui.model.type.Date\', formatOptions: { UTC: true, style: \'short\' }';
    }
    else if (propertyType === 'DateTime') {
        bindingPath = 'path: \'' + bindingPath + '\', type: \'sap.ui.model.type.DateTime\', formatOptions: { UTC: true, style: \'short\' }';
    }
    else if (propertyType === 'Time') {
        bindingPath = 'path: \'' + bindingPath + '\', type: \'sap.ui.model.type.DateTime\', formatOptions: { UTC: true, pattern: \'HH:mm\' }';
    }
    return bindingPath;
};

exports.createSmartConfig = function (configValue) {
    return manifestJSONTemplate({smartAppConfig: configValue});
};
