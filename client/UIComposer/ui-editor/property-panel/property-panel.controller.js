'use strict';

var _ = require('norman-client-tp').lodash;

module.exports = ['$filter', '$scope', '$rootScope', '$q', '$log', '$timeout', 'npGrid', 'npUiCanvasAPI', 'npPrototype', 'npUiCatalog', 'npBindingHelper', 'npImageHelper',
    'npConstants', 'npPageMetadata', 'npMessaging', 'npPropertyChangeHelper', 'npPageMetadataHelper', 'npPropertyChangeObserver', 'npPageMetadataEvents',
    'npCanvasEvents', 'Auth',
    function ($filter, $scope, $rootScope, $q, $log, $timeout, npGrid, npUiCanvasAPI, npPrototype, npUiCatalog, npBindingHelper, npImageHelper, npConstants, npPageMetadata,
        npMessaging, npPropertyChangeHelper, npPageMetadataHelper, npPropertyChangeObserver, pageMdEvents, npCanvasEvents, Auth) {

        var that = this;
        var selectedElement, aspectRatio;
        // done here otherwise breaks setupGroupChildren when a control is deleted
        that.smartApp = false;

        var isSmartApp = function () {
            return npPrototype.getPrototype().then(function (prototype) {
                that.smartApp = prototype.isSmartApp;
                return that.smartApp;
            });
        };

        var setUp = function () {
            that.hasDataModel = npBindingHelper.hasEntities();
            var selectedElements = npGrid.getSelectedElements();
            selectedElement = selectedElements[0];

            // TODO: SHOULD handle multiple selectedElements in the future
            if (!_.isEmpty(selectedElement)) {
                var controlMd = selectedElement.controlMd;

                // set display name of control
                that.ctrlName = npUiCatalog.getControlDisplayName(controlMd.catalogControlName, controlMd.catalogId);
                that.isPage = selectedElement.isPageElement();
                that.canDelete = selectedElement.canDeleteElement();
                if (that.isPage) {
                    // We check if page is not a ListReport
                    npPrototype.getPages().then(function (pages) {
                        var pageNode = _.find(pages, function (p) {
                            return (p.name === selectedElement.name);
                        });
                        if (!_.isEmpty(pageNode) && pageNode.floorplan === 'ListReport') {
                            that.canDelete = false;
                        }
                    });
                }
                else {
                    // We check that node is not undeletable
                    var undeletable;
                    if ((controlMd.designProperties) && (undeletable = _.find(controlMd.designProperties, 'name', 'isUndeletable'))) {
                        that.canDelete = !_.result(undeletable, 'value');
                    }
                    else {
                        that.canDelete = !npUiCatalog.isUndeletable(controlMd.catalogControlName, controlMd.catalogId);
                    }
                }

                setupMainEntity();
                npPrototype.getPages()
                    .then(function (pages) {
                        var routes = setupRoutes(controlMd, pages);
                        setupEvents(controlMd, routes);
                    });
                setPropertyDisplayLevel();

                isSmartApp().then(function () {

                    setupAvailableMainEntities();
                    // initialize data for properties panel
                    setupProperties(controlMd);
                    // setup groups for control
                    setupGroups(controlMd);
                });
            }
        };

        var setupMainEntity = function () {
            npPageMetadata.getMainEntity()
                .then(function (mainEntityId) {
                    that.mainEntityId = mainEntityId;
                    that.mainEntity = _.find(that.modelEntities, {
                        _id: mainEntityId
                    });
                })
                .catch(function () {
                    that.mainEntity = undefined;
                    that.mainEntityId = undefined;
                });
        };

        var setupAvailableMainEntities = function () {
            var currentPageName = npPageMetadata.getCurrentPageName();
            return $q.when()
                .then(function () {
                    if (that.smartApp) {
                        return npPageMetadata.getAvailableMainEntityIds(currentPageName)
                            .then(npBindingHelper.getEntitiesFromIds);
                    }
                    return npBindingHelper.getAllEntities();
                })
                .then(function (entities) {
                    that.modelEntities = entities ? $filter('orderBy')(entities, 'name') : [];
                    if (!that.smartApp) {
                        // when we are not in a smart app, we need to be able to unselect the main entity, so add an empty choice as the first choice
                        that.modelEntities.splice(0, 0, undefined);
                    }
                    that.mainEntity = _.find(that.modelEntities, {
                        _id: that.mainEntityId
                    });
                })
                .catch(function () {
                    that.modelEntities = [];
                    that.mainEntity = undefined;
                });
        };

        that.onMainEntityChange = function () {
            var entityId = that.mainEntity ? that.mainEntity._id : undefined;
            that.mainEntityId = entityId;
            return npPageMetadata.changeMainEntity(entityId);
        };

        var setupProperties = function (controlMd) {
            // get id of control
            var catalogId = controlMd.catalogId,
                controlName = controlMd.catalogControlName;
            that.properties = _.chain(npPageMetadataHelper.getDisplayableProperties(controlMd))
                .map(function (propertyMd) {
                    var property = {
                        name: propertyMd.name,
                        value: propertyMd.value,
                        type: propertyMd.type,
                        isAdvanced: npUiCatalog.isAdvanced(propertyMd.name, controlName, catalogId),
                        displayName: npUiCatalog.getPropertyDisplayName(propertyMd.name, controlName, catalogId),
                        possibleValues: npUiCatalog.getPropertyPossibleValues(propertyMd.name, controlName, catalogId),
                        possiblePaths: npBindingHelper.getPropertyPathsFromMd(propertyMd, controlMd, that.mainEntity ? that.mainEntity._id : undefined,
                            that.smartApp) || [],
                        isDoingBinding: npPageMetadataHelper.isBound(propertyMd),
                        isSmartApp: that.smartApp
                    };
                    if (property.isDoingBinding) {
                        var path = npBindingHelper.getPath(propertyMd.binding);
                        property.selectedPath = _.find(property.possiblePaths, {
                            path: path
                        });
                    }
                    else {
                        property.selectedPath = undefined;
                    }
                    var entityNameToolTip = (property.selectedPath && property.selectedPath.entityName) ? ' (' + property.selectedPath.entityName + ')' : '';
                    property.displayedValue = property.selectedPath ? (property.selectedPath.name + entityNameToolTip) : property.value;
                    if (property.possibleValues) {
                        property.displayedValue = that.getDisplayValue(property);
                    }
                    return property;
                })
                .value();

            that.advancedPropertiesCount = _.filter(that.properties, function (property) {
                return !!property.isAdvanced;
            }).length;

            // to check if the control has properties height and width
            var iWidth = _.findIndex(that.properties, {
                name: npConstants.sizeProperties.WIDTH
            });
            var iHeight = _.findIndex(that.properties, {
                name: npConstants.sizeProperties.HEIGHT
            });
            that.fitFillEnabled = false;
            if (iHeight >= 0 && iWidth >= 0) {
                that.widthProperty = that.properties[iWidth];
                that.heightProperty = that.properties[iHeight];
                that.widthProperty.hasSpecialHandler = true;
                that.heightProperty.hasSpecialHandler = true;

                if (controlMd.catalogControlName === npUiCatalog.getImageName()) {
                    that.fitFillEnabled = true;
                }

                // Get locked aspect ratio design property if any
                var lockDesignProperty = npPageMetadataHelper.getControlDesignProperty(npConstants.designProperties.LOCKASPECT, controlMd) || {};
                that.isLockedAspectRatio = lockDesignProperty.value;
                if (that.isLockedAspectRatio) {
                    aspectRatio = npImageHelper.calcAspectRatio(_.parseInt(that.widthProperty.value), _.parseInt(that.heightProperty.value));
                }
            }
            else {
                that.isLockedAspectRation = false;
                that.widthProperty = that.heightProperty = null;
            }

            if (that.smartApp) {
                // order properties according floorplan
                npUiCatalog.getControlPropertiesFromFloorplan(catalogId, controlName)
                    .then(function (orderedProperties) {
                        if (orderedProperties && orderedProperties.length > 0) {
                            var props = [];
                            _.each(orderedProperties, function (p) {
                                var originalProp = _.find(that.properties, {name: p.name });
                                if (originalProp) {
                                    props.push(originalProp);
                                }
                            });
                            that.properties = props;
                        }
                    })
                    .catch(function () {
                        $log.warn('no floorplan for ' + controlName);
                    });
            }
        };

        /* ---------------------------------------------------------------------------------------------------- */
        /* Editing properties for a given control
         /* ---------------------------------------------------------------------------------------------------- */
        that.getDisplayValue = function (property) {
            return _.result(_.find(property.possibleValues, 'value', property.value), 'displayValue', property.value);
        };

        that.onPropertyChange = function (property, keyDownEvent, endChange, isBindable) {
            if (isBindable) {
                property.value = property.displayedValue;
            }
            var controlMd = selectedElement.controlMd;

            var keyPressed, inputField, oldSelectionStart;
            if (keyDownEvent) {
                inputField = keyDownEvent.target;
                oldSelectionStart = inputField.selectionStart;
                keyPressed = keyDownEvent.key;
            }
            property.value = npPropertyChangeHelper.typeAheadPropertyValue(property, keyPressed);

            if (!npPropertyChangeHelper.isPropertyValueValid(property)) {
                return;
            }

            if (inputField && npPropertyChangeHelper.updateCSSSelection(property, keyPressed)) {
                $timeout(function () {
                    inputField.setSelectionRange(oldSelectionStart, inputField.value.length);
                });
            }

            if (that.isLockedAspectRatio && (property === that.widthProperty || property === that.heightProperty)) {
                var width, height;
                if (property === that.heightProperty) {
                    height = parseFloat(property.value);
                    width = npImageHelper.getWidthForFixedHeight(aspectRatio, height);

                }
                else if (property === that.widthProperty) {
                    width = parseFloat(property.value);
                    height = npImageHelper.getHeightForFixedWidth(aspectRatio, width);
                }
                updateDimensions(width, height, false);
            }
            else {
                var newProp = {
                    name: property.name,
                    value: npPropertyChangeHelper.serializePropertyValue(property)
                };

                if (endChange) {
                    npPageMetadata.changeProperty({
                        controlId: controlMd.controlId,
                        properties: [newProp]
                    });
                    npPropertyChangeObserver.endPropertyChange(controlMd, newProp);
                }
                else {
                    npUiCanvasAPI.setControlPropertiesByMd(controlMd, [newProp]);
                    npPropertyChangeObserver.doPropertyChange(controlMd, newProp, keyDownEvent);
                    npUiCanvasAPI.controlReady(controlMd)
                        .then(function () {
                            npCanvasEvents.broadcast(npCanvasEvents.events.controlsRendered, [controlMd]);
                        });
                }
            }
        };

        var findProperty = function (propertyName) {
            var property = _.find(that.properties, {
                name: propertyName
            });
            if (!property) {
                property = propertyName === 'width' ? that.widthProperty : propertyName === 'height' ? that.heightProperty : property;
            }
            return property;
        };

        /**
         * @name updateDimensions
         * @private
         * @description updates selectedElement controlMd with the new width/height. can pass only width or height, but needs at least one
         * @param {number} width
         * @param {number} height
         * @param {boolean} [bMoveTopLeft]
         */
        var updateDimensions = function (width, height, bMoveTopLeft) {
            var properties = [];
            if (typeof width === 'number') {
                properties.push({
                    name: 'width',
                    value: width + 'px'
                });
            }
            if (typeof height === 'number') {
                properties.push({
                    name: 'height',
                    value: height + 'px'
                });
            }
            if (_.isEmpty(properties)) {
                return;
            }
            var controlMd = selectedElement.controlMd;
            if (bMoveTopLeft) {
                npPageMetadata.moveControl({
                    controlId: controlMd.controlId,
                    newCtrlCatalogName: controlMd.catalogControlName,
                    parentId: controlMd.parentControlId,
                    groupId: controlMd.parentGroupId,
                    index: controlMd.parentGroupIndex,
                    x: 0,
                    y: 0
                });
            }
            // this will trigger controlPropertiesChanged and, panel properties will be updated by then
            npPageMetadata.changeProperty({
                controlId: controlMd.controlId,
                properties: properties
            }, {
                combineWithPreviousOperation: bMoveTopLeft
            });
        };


        // to Handle fit and fill for Image
        that.onFitOrFill = function (isFit) {
            var scaledDimensions;
            var width = _.parseInt(selectedElement.style.width),
                height = _.parseInt(selectedElement.style.height);
            if (isFit) {
                scaledDimensions = npImageHelper.getFitDimensions(width, height);
            }
            else {
                scaledDimensions = npImageHelper.getFillDimensions(width, height);
            }
            updateDimensions(scaledDimensions.imageWidth, scaledDimensions.imageHeight, true);
        };

        // handle lock and unlock of aspect ratio
        that.toggleLockAspectRatio = function () {
            that.isLockedAspectRatio = !that.isLockedAspectRatio;
            var property = {
                name: npConstants.designProperties.LOCKASPECT,
                value: that.isLockedAspectRatio
            };
            npPageMetadata.changeProperty({
                controlId: selectedElement.controlMd.controlId,
                properties: [{
                    name: property.name,
                    value: property.value
                }],
                propertyType: 'designProperties'
            });

            if (that.isLockedAspectRatio) {
                aspectRatio = npImageHelper.calcAspectRatio(_.parseInt(that.widthProperty.value), _.parseInt(that.heightProperty.value));
            }

        };

        /* ---------------------------------------------------------------------------------------------------- */
        /* Saving and reading actions for a given control
        /* ---------------------------------------------------------------------------------------------------- */

        var noneAction = {
            name: 'None',
            actionId: 'NONE',
            displayName: 'None',
            actionParam: undefined
        };

        var setupEvents = function (controlMd, availableNavigationRoutes) {
            that.boundEvent = {};
            that.supportedEvents = getDefaultEvents(controlMd.catalogControlName, controlMd.catalogId);
            if (_.isEmpty(that.supportedEvents)) {
                return;
            }
            addNoneAction(that.supportedEvents);
            var eventId = _.first(that.supportedEvents).name,
                actionId = noneAction.actionId,
                param = {};
            if (!_.isEmpty(controlMd.events)) {
                // @TODO this just assumes single event per control, the requirement of multiple events needs to be addressed
                var eventMd = _.last(controlMd.events);
                eventId = eventMd.eventId;
                actionId = eventMd.actionId;
                param = eventMd.params[0] || {};
            }
            initBoundEvent({
                eventId: eventId,
                actionId: actionId,
                param: param
            }, availableNavigationRoutes);
        };

        /**
         * @private
         * @returns {PropertyMd[]} Array of default property metadata objects for a certain control.
         */
        var getDefaultEvents = function (catalogControlName, catalogId) {
            var catalogEvents = npUiCatalog.getControlEvents(catalogControlName, catalogId, true);
            return _.map(catalogEvents, function (event) {
                // get all available actions for the event
                var actions = npUiCatalog.getActions(event);
                return {
                    name: event.name,
                    displayName: event.displayName,
                    actions: actions
                };
            });
        };

        var addNoneAction = function (supportedEvents) {
            _.map(supportedEvents, function (event) {
                var noneActionItem = _.find(event.actions, function (action) {
                    return action.actionId === noneAction.actionId;
                });
                if (!noneActionItem) {
                    event.actions.unshift(noneAction);
                }
            });
        };

        var initBoundEvent = function (eventInfo, availableNavigationRoutes) {
            var savedEvent = _.find(that.supportedEvents, {
                    name: eventInfo.eventId
                }),
                savedAction = savedEvent ? _.find(savedEvent.actions, {
                    actionId: eventInfo.actionId
                }) : undefined,
                savedValue = (eventInfo.param.key === 'routeName') ? _.find(availableNavigationRoutes, {
                    name: eventInfo.param.value
                }) : eventInfo.param.value;

            that.boundEvent = {
                savedEvent: savedEvent,
                savedAction: savedAction,
                savedValue: savedValue
            };
        };

        that.changeInteraction = function () {
            that.boundEvent.savedAction = noneAction;
            that.boundEvent.savedValue = {};
            that.validateAndSave();
        };

        that.changeAction = function () {
            if (that.boundEvent.savedAction.actionParam && that.boundEvent.savedAction.actionParam[0].paramType === 'PAGE' && that.routes.length === 0) {
                that.boundEvent.savedAction = noneAction;
                npMessaging.showError('Please create a second page before trying to set up a navigation.');
            }
            else {
                var actionParams = that.boundEvent.savedAction.actionParam;
                that.boundEvent.savedValue = (actionParams && actionParams[0].paramType === 'PAGE') ? that.routes[0] : '';
            }
            that.validateAndSave();
        };

        that.validateAndSave = function () {
            var actionId = that.boundEvent.savedAction.actionId;
            var actionParams = getActionParams(that.boundEvent.savedAction);
            npPageMetadata.changeEvents({
                controlId: selectedElement.controlMd.controlId,
                eventId: that.boundEvent.savedEvent.name,
                actionId: actionId,
                params: actionParams
            });
        };

        var getActionParams = function (action) {
            if (_.isEmpty(action.actionParam)) {
                return [];
            }
            return [{
                key: action.actionParam[0].paramName,
                value: action.actionParam[0].paramType === 'PAGE' && that.boundEvent.savedValue ? that.boundEvent.savedValue.name : that.boundEvent.savedValue
            }];
        };


        /* ---------------------------------------------------------------------------------------------------- */
        /* adding and deleting of child controls for different aggregations of a control
         /* ---------------------------------------------------------------------------------------------------- */

        var setupGroups = function (ctrlMd) {
            var zCount = 1000;
            var groups = _.map(npPageMetadataHelper.getDisplayableGroups(ctrlMd), function (groupMd, index) {
                var validControls = npUiCatalog.getValidControlsForAggregation(groupMd.groupId, ctrlMd.catalogControlName, ctrlMd.catalogId);
                validControls = _.sortBy(validControls, 'displayName');

                var isMultiple = npUiCatalog.isMultipleAggregation(groupMd.groupId, ctrlMd.catalogControlName, ctrlMd.catalogId),
                    entityId = that.mainEntity ? that.mainEntity._id : undefined,
                    possiblePaths = !that.smartApp && isMultiple ? npBindingHelper.getGroupPathsFromMd(groupMd, ctrlMd, entityId) : undefined;
                return {
                    expanded: false,
                    groupId: groupMd.groupId,
                    style: {
                        'z-index': zCount - index
                    },
                    displayName: npUiCatalog.getAggregationDisplayName(groupMd.groupId, ctrlMd.catalogControlName, ctrlMd.catalogId),
                    validControls: validControls,
                    selectedControl: validControls[0],
                    multiple: isMultiple,
                    possiblePaths: possiblePaths || [],
                    isDoingBinding: npPageMetadataHelper.isBound(groupMd)
                };
            });
            _.forEach(groups, setupGroupChildren);
            that.groups = groups;
        };

        var setupGroupChildren = function (panelGroup) {
            var controlMd = selectedElement.controlMd,
                groupMd = npPageMetadataHelper.getGroupMd(panelGroup.groupId, controlMd),
                groupChildrenMd = controlMd.getChildrenMd(panelGroup.groupId);
            panelGroup.children = _.map(groupChildrenMd, function (childMd) {
                return {
                    canDelete: npGrid.getElementForControlId(childMd.controlId).canDeleteElement(),
                    displayName: npUiCatalog.getControlDisplayName(childMd.catalogControlName, childMd.catalogId),
                    childMd: childMd
                };
            });
            var selectedTemplate = panelGroup.validControls[0],
                selectedPath = panelGroup.possiblePaths[0];
            if (!_.isEmpty(panelGroup.children[0])) {
                var templateName = panelGroup.children[0].childMd.catalogControlName;
                selectedTemplate = _.find(panelGroup.validControls, {
                    name: templateName
                });
            }
            if (panelGroup.isDoingBinding) {
                var templatePath = npBindingHelper.getPath(groupMd.binding);
                selectedPath = _.find(panelGroup.possiblePaths, {
                    path: templatePath
                });
            }
            panelGroup.selectedTemplate = selectedTemplate;
            panelGroup.selectedPath = selectedPath;
        };


        // TODO: This addChild logic is code repeated elsewhere.
        // TODO: Pass the selected item directly
        that.addChild = function (group, ctrlData) {
            npPageMetadata.addControl({
                newCtrlCatalogName: ctrlData.name,
                catalogId: ctrlData.catalogId,
                parentId: selectedElement.controlMd.controlId,
                groupId: group.groupId
            }, {
                selectAddedControls: false
            });
        };


        var bindGroup = function (group) {
            npPageMetadata.bindControl({
                controlId: selectedElement.controlMd.controlId,
                groupId: group.groupId,
                binding: group.selectedPath.binding,
                autoBind: true
            });
        };

        var unbindGroup = function (group) {
            npPageMetadata.unbindControl({
                controlId: selectedElement.controlMd.controlId,
                groupId: group.groupId
            });
        };

        that.changeBindingPath = function (group) {
            npPageMetadata.changeControlBinding({
                controlId: selectedElement.controlMd.controlId,
                groupId: group.groupId,
                binding: group.selectedPath.binding
            });
        };

        that.changeBindingTemplate = function (group) {
            npPageMetadata.changeControlBinding({
                controlId: selectedElement.controlMd.controlId,
                groupId: group.groupId,
                templateDef: {
                    newCtrlCatalogName: group.selectedTemplate.name,
                    catalogId: group.selectedTemplate.catalogId
                }
            });
        };

        that.bindProperty = function (property) {
            if (!property.selectedPath) {
                return;
            }
            var propertyDef = {
                name: property.name,
                binding: property.selectedPath.binding
            };
            npPageMetadata.changeProperty({
                controlId: selectedElement.controlMd.controlId,
                properties: [propertyDef]
            });
        };

        that.togglePropertyIsDoingBinding = function (property) {
            property.isDoingBinding = !property.isDoingBinding;
            if (property.isDoingBinding) {
                that.bindProperty(property);
            }
            else {
                that.onPropertyChange(property, null, true);
            }
        };

        that.toggleGroupIsDoingBinding = function (group, event) {
            event.preventDefault();
            event.stopImmediatePropagation();
            group.isDoingBinding = !group.isDoingBinding;
            if (group.isDoingBinding) {
                bindGroup(group);
            }
            else {
                unbindGroup(group);
            }
        };

        that.selectControl = function (controlMd) {
            var element = npGrid.getElementForControlId(controlMd.controlId);
            npGrid.setSelectedElements([element]);
        };


        var setupRoutes = function (controlMd, prototypePages) {
            var curPageName = npPageMetadata.getCurrentPageName();
            that.routes = _.chain(prototypePages)
                .filter(function (page) {
                    return page.name !== curPageName;
                })
                .cloneDeep()
                .value();
            return that.routes;
        };

        that.deleteControl = function (controlMd) {
            var isPage = false;
            if (!controlMd && selectedElement) {
                controlMd = selectedElement.controlMd;
                isPage = selectedElement.isPageElement();
            }
            if (isPage) {
                npPrototype.deletePage(selectedElement.name);
            }
            else if (controlMd) {
                npPageMetadata.deleteControl(controlMd.controlId);
            }
        };

        var updateProperties = function (changedProperties) {
            _.forEach(changedProperties, function (changedProperty) {
                var panelProperty = findProperty(changedProperty.name);
                if (panelProperty) {
                    panelProperty.value = changedProperty.value;
                    panelProperty.isDoingBinding = changedProperty.binding && changedProperty.binding.paths && changedProperty.binding.paths.length;
                    if (panelProperty.isDoingBinding) {
                        var path = npBindingHelper.getPath(changedProperty.binding);
                        panelProperty.selectedPath = _.find(panelProperty.possiblePaths, {
                            path: path
                        });
                    }
                    else {
                        panelProperty.selectedPath = undefined;
                    }
                    var entityNameToolTip = (panelProperty.selectedPath && panelProperty.selectedPath.entityName) ? ' (' + panelProperty.selectedPath.entityName +
                        ')' : '';
                    panelProperty.displayedValue = panelProperty.selectedPath ? (panelProperty.selectedPath.name + entityNameToolTip) : panelProperty.value;
                    if (panelProperty.possibleValues) {
                        panelProperty.displayedValue = that.getDisplayValue(panelProperty);
                    }
                }
                else {
                    $log.warn('property-panel: did not find property to update', changedProperty);
                }
            });
        };

        var listenForPropertyChange = function (controlMd, changedProperties) {
            if (selectedElement && controlMd === selectedElement.controlMd) {
                updateProperties(changedProperties);
            }
        };

        var handlePropertiesChange = function (event, pageMd, propertyChanges) {
            var changedControls = _.pluck(propertyChanges, 'controlMd');
            if (selectedElement && _.contains(changedControls, selectedElement.controlMd)) {
                updateProperties(selectedElement.controlMd.properties);
            }
        };

        var handleBindingChange = function (event, pageMd, bindingDefs) {
            if (!selectedElement) {
                return;
            }
            var bindingDef = _.find(bindingDefs, {
                    controlId: selectedElement.controlMd.controlId
                }) || {},
                panelGroup = _.find(that.groups, {
                    groupId: bindingDef.groupId
                });
            if (panelGroup) {
                var groupMd = _.find(selectedElement.controlMd.groups, {
                    groupId: panelGroup.groupId
                });
                panelGroup.isDoingBinding = npPageMetadataHelper.isBound(groupMd);
                setupGroupChildren(panelGroup);
            }

        };

        var handleControlsChange = function (event, pageMd, returnObjs) {
            if (!selectedElement) {
                return;
            }
            var childrenMd = _.filter(returnObjs, function (controlMd) {
                return controlMd.parentControlId === selectedElement.controlMd.controlId && npGrid.getElementForControlId(controlMd.controlId);
            });
            _.forEach(childrenMd, function (childMd) {
                var panelGroup = _.find(that.groups, {
                    groupId: childMd.parentGroupId
                });
                if (panelGroup) {
                    setupGroupChildren(panelGroup);
                }
            });
        };

        var handleEventsChange = function (event, controlMds) {
            var controlMd = controlMds[0];
            if (selectedElement && selectedElement.controlMd.controlId === controlMd.controlId && !_.isEmpty(controlMd.events)) {
                var eventMd = _.last(controlMd.events),
                    eventId = eventMd.eventId,
                    actionId = eventMd.actionId,
                    param = eventMd.params[0] || {};

                initBoundEvent({
                    eventId: eventId,
                    actionId: actionId,
                    param: param
                }, that.routes);
            }
        };

        var setPropertyDisplayLevel = function () {
            if (_.isUndefined(that.showAdvancedProperties)) {
                Auth.getPreferences()
                    .then(function (data) {
                        that.showAdvancedProperties = (data.preferences.showAdvancedProperties) ? data.preferences.showAdvancedProperties.enable : undefined;
                    });
            }
        };

        that.togglePropertyDisplayLevel = function () {
            that.showAdvancedProperties = !that.showAdvancedProperties;
            var preferences = {};
            preferences.showAdvancedProperties = {};
            preferences.showAdvancedProperties.enable = that.showAdvancedProperties;
            Auth.updatePreferences(preferences);
        };

        setUp();

        npPropertyChangeObserver.listenForChange(listenForPropertyChange);
        pageMdEvents.listen(pageMdEvents.events.controlPropertiesChanged, handlePropertiesChange);
        pageMdEvents.listen(pageMdEvents.events.controlsBindingChanged, handleBindingChange);
        // Listen for main entity changes
        pageMdEvents.listen(pageMdEvents.events.mainEntityChanged, setupMainEntity);

        pageMdEvents.listen(pageMdEvents.events.controlsAdded, handleControlsChange);
        pageMdEvents.listen(pageMdEvents.events.controlsRemoved, handleControlsChange);
        pageMdEvents.listen(pageMdEvents.events.controlsMoved, handleControlsChange);

        pageMdEvents.listen(pageMdEvents.events.controlEventsChanged, handleEventsChange);

        $scope.$on('bindinghelper-model-loaded', setUp);
        $scope.$on('selectionChanged', setUp);
    }
];
