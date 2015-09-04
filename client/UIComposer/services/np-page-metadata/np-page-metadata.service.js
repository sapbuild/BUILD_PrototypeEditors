'use strict';


var _ = require('norman-client-tp').lodash;

/**
 * @ngdoc factory
 * @name npPageMetadata
 * @namespace uiComposer:services:npPageMetadata
 */

/**
 * @typedef ControlDefinition
 * @type {object}
 * @memberof uiComposer:services:npPageMetadata
 * @property {string} newCtrlCatalogName - catalog name of ctrl to add
 * @property {string} controlId - id of control in case it already exists (e.g. for move).
 * @property {string} parentId - id of parent element
 * @property {string} groupId
 * @property {number} index
 * @property {number} x
 * @property {number} y
 */

/**
 * @typedef PropertyDefinition
 * @type {object}
 * @memberof uiComposer:services:npPageMetadata
 * @property {string} controlId - id of control who's properties should be changed
 * @property {object[]} properties - array of property objects to change (structure defined by ui catalog)
 */

/**
 * @typedef GroupBindingDefinition
 * @type {object}
 * @memberof uiComposer:services:npPageMetadata
 * @property {string} controlId - id of control who's group should be changed
 * @property {string} groupId - id of group that should be changed
 * @property {object} binding - binding information coming from binding helper
 * @property {ControlDefinition} templateDef - binding information coming from binding helper
 */
/**
 * @typedef EventDefinition
 * @type {object}
 * @memberof uiComposer:services:npPageMetadata
 * @property {string} controlId - id of control who's group should be changed
 * @property {string} eventId - id of event that should be changed
 * @property {string} actionId - id of the action to be associated to the event
 * @property {object} params - parameters specific to the action
 */

/**
 * @typedef CloneControlDefinition
 * @type {object}
 * @memberof uiComposer:services:npPageMetadata
 * @property {ControlDefinition} controlMd - controlMd to be cloned
 * @property {string} parentId - new parent of the clone
 * @property {string} groupId - new group of the clone
 * @property {number} index
 */

var npPageMetadata = ['$rootScope', '$window', '$location', '$q', '$log', '$state', 'uiCommandManager', 'npPageMetadataAddControl', 'npPageMetadataDeleteControl',
    'npPageMetadataMoveControl', 'npPageMetadataChangeProperty', 'npPageMetadataControlBinding', 'npPageMetadataMainEntity', 'npPageMetadataHelper',
    'npPageMetadataEvents', 'npLayoutHelper', 'npPageMetadataChangeEvent', 'npPageMetadataCloneControl', 'npPageMetadataAPI', 'npPageMetadataPersist', 'npUiCatalog',
    function ($rootScope, $window, $location, $q, $log, $state, commandManager, addControlService, deleteControlService, moveControlService, changePropertyService,
              bindControlService, mainEntityService, pageMdHelper, pageMdEvents, npLayoutHelper, changeEventService, npPageMetadataCloneControl, pageAPI, pageMdPersist, npUiCatalog) {

        var _currentPageName, // currently selected page in canvas,
            _availableMainEntityIds = {}; // pageName - available main entities mapping

        var getPageMetadata = pageAPI.getPageMetadata;

        var getAvailableMainEntityIds = function (pageName) {
            if (!_.isUndefined(_availableMainEntityIds[pageName])) {
                return _availableMainEntityIds[pageName];
            }

            var pageMdPromise = pageAPI.$resource.getAvailableMainEntities({
                pageName: pageName
            }).$promise
                .catch(function (err) {
                    $log.error('npPageMetadata service: failed to retrieve available main entities for page: ', pageName, ' with error: ', err);
                    _availableMainEntityIds[pageName] = undefined;
                    return $q.reject(err);
                });

            _availableMainEntityIds[pageName] = pageMdPromise;
            return pageMdPromise;
        };

        function executePageMdAction(controlIdentifiers, options, commandFn) {
            controlIdentifiers = _.makeArray(controlIdentifiers);
            return getTargetPageMd(options)
                .then(function (pageMd) {
                    var command = commandFn.call(this, controlIdentifiers, pageMd, options);
                    extendWithPreAndPostAction(command, pageMd);
                    return commandManager.execute(command, _.get(options, 'combineWithPreviousOperation'));
                })
                .catch(logErrorAndReject);
        }

        function getTargetPageMd(options) {
            var targetPageName = _.get(options, 'targetPage') || getCurrentPageName();
            return getPageMetadata(targetPageName);
        }

        function extendWithPreAndPostAction(command, pageMd) {
            _.extend(command, {
                preaction: setCurrentPageName.bind(this, pageMd.name),
                postaction: pageMdPersist.updatePage.bind(pageMdPersist, pageMd)
            });
        }

        function logErrorAndReject(err) {
            $log.error('npPageMetadata service: action failed with error: ', err);
            return $q.reject(err);
        }


        /**
         * @name addControl
         * @memberof uiComposer:services:npPageMetadata
         * @description Add new controls to current page.
         *
         * @param {ControlDefinition|ControlDefinition[]} newCtrlDefs Control definition object or array of control definition objects.
         *
         * @param {object} [options] Hash with following options:
         * - targetPage {string} If a page name is provided will add controls to specified page. Defaults to currently selected page.
         * - combineWithPreviousOperation {boolean} If true will combine operation with previous one. Undo would undo both this one and
         *   previous one at once. Default false.
         * - selectAddedControls {boolean} If true will select all added controls after adding them to the canvas. Default true.
         *
         * @returns {Promise} Promise that is resolved once all controls have been added.
         */
        var addControl = function (newCtrlDefs, options) {
            return executePageMdAction(newCtrlDefs, options, getAddCommand);
        };

        var getAddCommand = function (newCtrlDefs, pageMd, options) {
            var controlAdditions = _.map(newCtrlDefs, function (controlDef) {
                    return addControlService.getControlMdObjects(controlDef, pageMd);
                }),
                command = {
                    execute: addControlService.performAdditions.bind(this, controlAdditions, pageMd, _.pick(options, ['selectAddedControls'])),
                    unexecute: deleteControlService.performDeletions.bind(this, controlAdditions, pageMd)
                };
            return command;
        };

        /**
         * @name deleteControl
         * @memberof uiComposer:services:npPageMetadata
         * @description Remove controls from current page.
         *
         * @param {string|string[]} controlIds Id or array of Ids of controls that should be deleted.
         * @returns {Promise} Promise that is resolved once all controls have been deleted.
         */
        var deleteControl = function (controlIds, options) {
            return executePageMdAction(controlIds, options, getRemoveCommand);
        };

        var getRemoveCommand = function (controlIds, pageMd) {
            var controlDeletions = _.map(controlIds, function (controlId) {
                    return pageMdHelper.getControlAndChildMd(controlId, pageMd);
                }),
                command = {
                    execute: deleteControlService.performDeletions.bind(this, controlDeletions, pageMd),
                    unexecute: addControlService.performAdditions.bind(this, controlDeletions, pageMd)
                };
            return command;
        };

        /**
         * @name moveControl
         * @memberof uiComposer:services:npPageMetadata
         * @description Move controls to new positions/parents.
         *
         * @param {ControlDefinition|ControlDefinition[]} ctrlDefs Control definition object or array of control definition objects.
         * @param {object} [options] Hash with following options:
         * - targetPage {string} If a page name is provided will move controls to specified page. Defaults to currently selected page.
         * - combineWithPreviousOperation {boolean} If true will combine operation with previous one. Undo would undo both this one and previous one at once. Default false.
         * @returns {Promise} Promise that is resolved once all controls have been moved.
         */
        var moveControl = function (ctrlDefs, options) {
            return executePageMdAction(ctrlDefs, options, getMoveCommand);
        };

        function getMoveCommand(ctrlDefs, pageMd) {
            var moveBackControlDefs = _.map(ctrlDefs, function (ctrlDef) {
                    var controlMd = pageMdHelper.getControlMd(ctrlDef.controlId, pageMd);
                    return moveControlService.createMoveDefinition(controlMd);
                }),
                command = {
                    execute: moveControlService.performMoves.bind(this, ctrlDefs, pageMd),
                    unexecute: moveControlService.performMoves.bind(this, moveBackControlDefs, pageMd)
                };
            return command;
        }

        /**
         * @name addControlByCloning
         * @memberof uiComposer:services:npPageMetadata
         * @description Add new controls to current page by cloning.
         *
         * @param {CloneControlDefinition|CloneControlDefinition[]} Array of control definitions.
         * @param {object} [options] Hash with following options:
         * - targetPage {string} If a page name is provided will move controls to specified page. Defaults to currently selected page.
         * - combineWithPreviousOperation {boolean} If true will combine operation with previous one. Undo would undo both this one and previous one at once. Default false.
         * @returns {Promise} Promise that is resolved once all controls have been added.
         */
        function addControlByCloning(controlDefs, options) {
            return executePageMdAction(controlDefs, options, getCloneCommand);
        }

        function getCloneCommand(controlDefs, pageMd) {
            var controlAdditions = npPageMetadataCloneControl.cloneControls(controlDefs, pageMd),
                command = {
                    execute: addControlService.performAdditions.bind(this, controlAdditions, pageMd, false),
                    unexecute: deleteControlService.performDeletions.bind(this, controlAdditions, pageMd, false)
                };
            return command;
        }

        function _getPropertyToUnbindDefsFromContextProperty(propertyName, controlMd) {
            var propertyToUnbindDefs = [];
            var subGroupIdsToEmpty = npUiCatalog.getAggregationsOfContextProperty(propertyName, controlMd.catalogControlName, controlMd.catalogId);
            _.forEach(subGroupIdsToEmpty, function (groupId) {
                _.forEach(controlMd.getChildrenMd(groupId), function (childMd) {
                    var childDefs = getPropertiesDefsToUnbind(childMd);
                    propertyToUnbindDefs = propertyToUnbindDefs.concat(childDefs);
                });
            });
            return propertyToUnbindDefs;
        }

        /**
         * @param {PropertyDefinition|PropertyDefinition[]} propertyDefs
         * @param {object} [options] Hash with following options:
         * - combineWithPreviousOperation {boolean} If true will combine operation with previous one. Undo would undo both this one and previous one at once. Default false.
         * - selectChangedElements {boolean} Used to force selection of the elements
         */
        function changeProperty(propertyDefs, options) {
            var currentPage = getCurrentPageName();
            return getPageMetadata(currentPage)
                .then(function (pageMd) {
                    var propertyToUnbindDefs = [];
                    propertyDefs = _.makeArray(propertyDefs);
                    _.forEach(propertyDefs, function (propertyDef) {
                        // If a property is a context property, unbind all the properties of the descendants in the groups that have this property as contextProperty
                        var controlMd = pageMdHelper.getControlMd(propertyDef.controlId, pageMd);
                        _.forEach(propertyDef.properties, function (property) {
                            propertyToUnbindDefs = propertyToUnbindDefs.concat(_getPropertyToUnbindDefsFromContextProperty(property.name, controlMd));
                        });
                    });
                    propertyDefs = propertyToUnbindDefs.concat(propertyDefs);
                    return executePageMdAction(propertyDefs, options, getChangePropertyCommand);
                });
        }

        function getChangePropertyCommand(propertyDefs, pageMd, options) {
            var propertyChanges = [],
                reversedPropertyChanges = [];

            _.forEach(propertyDefs, function (propertyDef) {
                var controlMd = pageMdHelper.getControlMd(propertyDef.controlId, pageMd),
                    oldPropertyValues = _.map(propertyDef.properties, function (property) {
                        var controlMdProperty = pageMdHelper.getControlProperty(property.name, controlMd) || {};
                        return _.extend({}, property, {
                            value: controlMdProperty.value,
                            binding: controlMdProperty.binding
                        });
                    });
                propertyChanges.push({
                    properties: propertyDef.properties,
                    propertyType: propertyDef.propertyType || 'properties',
                    controlMd: controlMd
                });
                reversedPropertyChanges.push({
                    properties: oldPropertyValues,
                    propertyType: propertyDef.propertyType || 'properties',
                    controlMd: controlMd
                });
            });

            var command = {
                execute: changePropertyService.performPropertyChanges.bind(this, propertyChanges, pageMd, _.pick(options, ['selectChangedElements'])),
                unexecute: changePropertyService.performPropertyChanges.bind(this, reversedPropertyChanges, pageMd, _.pick(options, ['selectChangedElements']))
            };
            return command;
        }

        /**
         * @name changeMainEntity
         * @memberof uiComposer:services:npPageMetadata
         * @description change the main entity of a page.
         *
         * @param {string} mainEntityId new main entity id.
         * @param {object} [options] Hash with following options:
         * - combineWithPreviousOperation {boolean} If true will combine operation with previous one. Undo would undo both this one and previous one at once. Default false.
         * @returns {Promise} Promise that is resolved once the main entity has been changed and the page has been rendered.
         */
        var changeMainEntity = function (mainEntityId, options) {
            options = options || {};
            var currentPage = getCurrentPageName();
            return getPageMetadata(currentPage)
                .then(function (pageMd) {
                    var previousMainEntity = pageMd.mainEntity,
                        rootMd = pageMdHelper.getControlMd(pageMd.rootControlId, pageMd),
                        unbindGroupsDefs = getGroupsDefsToUnbind(rootMd, true),
                        unbindPropsDefs = getPropertiesDefsToUnbind(rootMd),
                        combineWithPrevious = options.combineWithPreviousOperation,
                        setCombineWithPrev = function () {
                            combineWithPrevious = true;
                        };

                    var unbindRootPromise = $q.when();
                    if (_.size(unbindGroupsDefs)) {
                        unbindRootPromise = unbindRootPromise.then(function () {
                            return unbindControl(unbindGroupsDefs, {combineWithPreviousOperation: combineWithPrevious});
                        }).then(setCombineWithPrev);
                    }
                    if (_.size(unbindPropsDefs)) {
                        unbindRootPromise = unbindRootPromise.then(function () {
                            return changeProperty(unbindPropsDefs, {
                                combineWithPreviousOperation: combineWithPrevious,
                                selectChangedElements: false
                            });
                        }).then(setCombineWithPrev);
                    }

                    return unbindRootPromise.then(function () {
                        return commandManager.execute({
                            preaction: setCurrentPageName.bind(this, currentPage),
                            execute: mainEntityService.performChangeMainEntity.bind(this, mainEntityId, pageMd),
                            unexecute: mainEntityService.performChangeMainEntity.bind(this, previousMainEntity, pageMd),
                            postaction: pageMdPersist.updatePage.bind(pageMdPersist, pageMd, true)
                        }, combineWithPrevious);
                    });
                })
                .catch(function (err) {
                    $log.error('npPageMetadata service: changeMainEntity failed with error: ', err);
                    return $q.reject(err);
                });
        };

        var getMainEntity = function () {
            var currentPage = getCurrentPageName();
            if (!currentPage) {
                return $q.when();
            }
            return getPageMetadata(currentPage)
                .then(function (pageMd) {
                    return pageMd.mainEntity;
                })
                .catch(function (err) {
                    $log.error('npPageMetadata service: getMainEntity failed with error: ', err);
                });
        };

        var getGroupsDefsToUnbind = function (controlMd, traverseDeep) {
            var defs = [];
            _.forEach(controlMd.groups, function (groupMd) {
                if (pageMdHelper.isBound(groupMd)) {
                    // Do not explore the children
                    defs.push({controlId: controlMd.controlId, groupId: groupMd.groupId});
                }
                else if (traverseDeep === true) {
                    // Group not bound, search for first bound descendants
                    var childrenMd = controlMd.getChildrenMd(groupMd.groupId);
                    _.forEach(childrenMd, function (childMd) {
                        var childDefs = getGroupsDefsToUnbind(childMd, traverseDeep);
                        defs = defs.concat(childDefs);
                    });
                }
            });
            return defs;
        };

        var getPropertiesDefsToUnbind = function (controlMd) {
            var defs = [];
            defs.push(getPropertiesDefToUnbind(controlMd));
            _.forEach(controlMd.groups, function (groupMd) {
                // skip the bound ones as they will be unbound as well
                if (!pageMdHelper.isBound(groupMd)) {
                    _.forEach(controlMd.getChildrenMd(groupMd.groupId), function (childMd) {
                        var childDefs = getPropertiesDefsToUnbind(childMd);
                        defs = defs.concat(childDefs);
                    });
                }
            });
            _.remove(defs, _.isUndefined);
            return defs;
        };

        var getPropertiesDefToUnbind = function (controlMd) {
            var properties = _.chain(controlMd.properties)
                .filter(pageMdHelper.isBound)
                .map(function (propertyMd) {
                    var cloneMd = _.clone(propertyMd);
                    cloneMd.binding = {};
                    return cloneMd;
                })
                .value();
            if (_.size(properties)) {
                return {controlId: controlMd.controlId, properties: properties};
            }
        };

        /**
         * @name changeControlBinding
         * @memberof uiComposer:services:npPageMetadata
         * @description Changes the binding of a control group. Must pass either a new templateDef or new binding
         *
         * @param {GroupBindingDefinition|GroupBindingDefinition[]} binding definitions or array of binding definitions that should be bound.
         * @param {object} [options] Hash with following options:
         * - combineWithPreviousOperation {boolean} If true will combine operation with previous one. Undo would undo both this one and previous one at once. Default false.
         * - selectChangedElements {boolean} Used to force selection of the elements
         * @returns {Promise} Promise that is resolved once all control groups have been bound.
         */
        var changeControlBinding = function (bindingDefs, options) {
            options = options || {};
            bindingDefs = _.makeArray(bindingDefs);
            var currentPage = getCurrentPageName();

            return getPageMetadata(currentPage)
                .then(function (pageMd) {
                    var undoBindDefs = [],
                        childrenUnbindings = [],
                        propertiesToSet = [],
                        propertiesToUnbind = [];

                    _.forEach(bindingDefs, function (bindingDef) {
                        var controlMd = pageMdHelper.getControlMd(bindingDef.controlId, pageMd),
                            groupMd = pageMdHelper.getGroupMd(bindingDef.groupId, controlMd),
                            undoBindDef = _.cloneDeep(bindingDef);

                        if (bindingDef.binding) {
                            undoBindDef.binding = groupMd.binding;

                        }
                        if (bindingDef.templateDef) {
                            _.assign(bindingDef.templateDef, {
                                parentId: bindingDef.controlId,
                                groupId: bindingDef.groupId
                            });
                            bindingDef.children = addControlService.getControlMdObjects(bindingDef.templateDef, pageMd);
                            delete bindingDef.templateDef;

                            undoBindDef.children = pageMdHelper.getControlsAndChildMd(groupMd.children, pageMd);
                        }
                        else {
                            var templateMd = pageMdHelper.getControlMd(groupMd.children[0], pageMd);
                            // first unbind all props...
                            var childrenProps = getPropertiesDefsToUnbind(templateMd);
                            propertiesToUnbind = propertiesToUnbind.concat(childrenProps);

                            // then bind template props!
                            propertiesToSet = bindControlService.getPropertyDefsToAutobind(bindingDef, pageMd);

                            childrenUnbindings = childrenUnbindings.concat(getGroupsDefsToUnbind(templateMd));
                        }

                        undoBindDefs.push(undoBindDef);
                    });
                    var updateTemplatePromise = $q.when(),
                        changeBindingResult,
                        combineWithPrevious = options.combineWithPreviousOperation,
                        setCombineWithPrev = function () {
                            combineWithPrevious = true;
                        };

                    if (_.size(propertiesToUnbind)) {
                        updateTemplatePromise = updateTemplatePromise.then(function () {
                            return changeProperty(propertiesToUnbind, {
                                combineWithPreviousOperation: combineWithPrevious,
                                selectChangedElements: false
                            }).then(setCombineWithPrev);
                        });
                    }

                    if (_.size(childrenUnbindings)) {
                        updateTemplatePromise = updateTemplatePromise.then(function () {
                            return unbindControl(childrenUnbindings, {combineWithPreviousOperation: combineWithPrevious}).then(setCombineWithPrev);
                        });
                    }

                    updateTemplatePromise = updateTemplatePromise.then(function () {
                        return commandManager.execute({
                            preaction: setCurrentPageName.bind(this, currentPage),
                            execute: bindControlService.performChangeBindings.bind(this, bindingDefs, pageMd, _.pick(options, ['selectChangedElements'])),
                            unexecute: bindControlService.performChangeBindings.bind(this, undoBindDefs, pageMd, _.pick(options, ['selectChangedElements'])),
                            postaction: pageMdPersist.updatePage.bind(pageMdPersist, pageMd)
                        }, combineWithPrevious).then(function (r) {
                            setCombineWithPrev();
                            changeBindingResult = r;
                        });
                    });

                    if (_.size(propertiesToSet)) {
                        updateTemplatePromise = updateTemplatePromise.then(function () {
                            return changeProperty(propertiesToSet, {
                                combineWithPreviousOperation: combineWithPrevious,
                                selectChangedElements: false
                            });
                        });
                    }

                    return updateTemplatePromise.then(function () {
                        return changeBindingResult;
                    });
                })
                .catch(function (err) {
                    $log.error('npPageMetadata service: changeControlBinding failed with error: ', err);
                    return $q.reject(err);
                });
        };
        /**
         * @name bindControl
         * @memberof uiComposer:services:npPageMetadata
         * @description Bind the control's group to a data path using a template. templateDef must be passed!
         *
         * @param {GroupBindingDefinition|GroupBindingDefinition[]} binding definitions or array of binding definitions that should be bound.
         * @param {object} [options] Hash with following options:
         * - combineWithPreviousOperation {boolean} If true will combine operation with previous one. Undo would undo both this one and previous one at once. Default false.
         * - selectChangedElements {boolean} Used to force selection of the elements
         * @returns {Promise} Promise that is resolved once all control groups have been bound.
         */
        var bindControl = function (bindingDefs, options) {
            bindingDefs = _.makeArray(bindingDefs);
            options = options || {};
            var currentPage = getCurrentPageName();

            return getPageMetadata(currentPage)
                .then(function (pageMd) {
                    var childrenToRemove = [], undoDefs = [], propertiesToSet = [];

                    _.forEach(bindingDefs, function (bindingDef) {
                        var controlMd = pageMdHelper.getControlMd(bindingDef.controlId, pageMd),
                            groupMd = pageMdHelper.getGroupMd(bindingDef.groupId, controlMd);
                        var childToUseAsTemplateIndex = bindingDef.childToUseAsTemplateIndex || 0;
                        // remove child to use as template
                        var groupChildrenIds = _.filter(groupMd.children, function (childId, index) {
                            return index !== childToUseAsTemplateIndex;
                        });
                        childrenToRemove = childrenToRemove.concat(groupChildrenIds);
                        if (bindingDef.autoBind) {
                            propertiesToSet = bindControlService.getPropertyDefsToAutobind(bindingDef, pageMd);
                        }

                        undoDefs.push({
                            controlId: bindingDef.controlId,
                            groupId: bindingDef.groupId
                        });
                    });
                    var bindResult;

                    var deletePromise = _.size(childrenToRemove) ? deleteControl(childrenToRemove, options) : $q.when(),
                        combineWithPrevious = options.combineWithPreviousOperation || _.size(childrenToRemove) > 0;
                    return deletePromise.then(function () {
                        return commandManager.execute({
                            preaction: setCurrentPageName.bind(this, currentPage),
                            execute: bindControlService.performBindings.bind(this, bindingDefs, pageMd, _.pick(options, ['selectChangedElements'])),
                            unexecute: bindControlService.performUnbindings.bind(this, undoDefs, pageMd, _.pick(options, ['selectChangedElements'])),
                            postaction: pageMdPersist.updatePage.bind(pageMdPersist, pageMd)
                        }, combineWithPrevious);
                    })
                        .then(function (result) {
                            bindResult = result;
                            if (_.size(propertiesToSet)) {
                                return changeProperty(propertiesToSet, {
                                    combineWithPreviousOperation: true,
                                    selectChangedElements: false
                                });
                            }
                            return $q.when();
                        })
                        .then(function () {
                            return bindResult;
                        });
                })
                .catch(function (err) {
                    $log.error('npPageMetadata service: bindControl failed with error: ', err);
                    return $q.reject(err);
                });
        };
        /**
         * @name unbindControl
         * @memberof uiComposer:services:npPageMetadata
         * @description Bind the control's group to a data path using a template.
         *
         * @param {GroupBindingDefinition|GroupBindingDefinition[]} binding definitions or array of binding definitions that should be bound.
         * @param {object} [options] Hash with following options:
         * - combineWithPreviousOperation {boolean} If true will combine operation with previous one. Undo would undo both this one and previous one at once. Default false.
         * - selectChangedElements {boolean} Used to force selection of the elements
         * @returns {Promise} Promise that is resolved once all control groups have been bound.
         */
        var unbindControl = function (bindingDefs, options) {
            options = options || {};
            bindingDefs = _.makeArray(bindingDefs);
            var currentPage = getCurrentPageName();

            return getPageMetadata(currentPage)
                .then(function (pageMd) {
                    var propertiesToSet = [];
                    var unbindDefs = [];
                    _.forEach(bindingDefs, function (unbindingDef) {
                        var controlMd = pageMdHelper.getControlMd(unbindingDef.controlId, pageMd),
                            groupMd = pageMdHelper.getGroupMd(unbindingDef.groupId, controlMd);

                        var allChildrenMds = pageMdHelper.getControlsAndChildMd(groupMd.children, pageMd);
                        // Get all bound groups in descendants, deepest first to unbind deepest groups first
                        _.forEachRight(allChildrenMds, function (childMd) {
                            var invalidProperties = _.filter(childMd.properties, pageMdHelper.isBound);
                            if (_.size(invalidProperties)) {
                                var properties = _.map(invalidProperties, function (propertyMd) {
                                    return {
                                        name: propertyMd.name,
                                        value: propertyMd.value,
                                        binding: {}
                                    };
                                });
                                propertiesToSet.push({
                                    controlId: childMd.controlId,
                                    properties: properties
                                });
                            }
                            unbindDefs = unbindDefs.concat(getGroupsDefsToUnbind(childMd, false));
                        });
                        unbindDefs.push(unbindingDef);
                    });

                    var bindDefs = [];
                    // we will bind from the topmost
                    _.forEachRight(unbindDefs, function (bindingDef) {
                        var controlMd = pageMdHelper.getControlMd(bindingDef.controlId, pageMd),
                            groupMd = pageMdHelper.getGroupMd(bindingDef.groupId, controlMd),
                            undoBindingDef = _.cloneDeep(bindingDef);
                        undoBindingDef.binding = groupMd.binding;
                        bindDefs.push(undoBindingDef);
                    });

                    var propertiesPromise = $q.when(),
                        combineWithPrevious = options.combineWithPreviousOperation;
                    if (_.size(propertiesToSet)) {
                        propertiesPromise = changeProperty(propertiesToSet, {
                            combineWithPreviousOperation: combineWithPrevious,
                            selectChangedElements: false
                        });
                        combineWithPrevious = true;
                    }
                    return propertiesPromise
                        .then(function () {
                            return commandManager.execute({
                                preaction: setCurrentPageName.bind(this, currentPage),
                                execute: bindControlService.performUnbindings.bind(this, unbindDefs, pageMd, _.pick(options, ['selectChangedElements'])),
                                unexecute: bindControlService.performBindings.bind(this, bindDefs, pageMd, _.pick(options, ['selectChangedElements'])),
                                postaction: pageMdPersist.updatePage.bind(pageMdPersist, pageMd)
                            }, combineWithPrevious);
                        });
                })
                .catch(function (err) {
                    $log.error('npPageMetadata service: unbindControl failed with error: ', err);
                    return $q.reject(err);
                });
        };

        // TODO: event service only operates on single control rather than array of controls which makes it incompatible with all other pageMd functions
        // fix this
        /**
         * @name changeEvents
         * @memberof uiComposer:services:npPageMetadata
         * @description Add action to a control.
         * @param {EventDefinition} eventDef definition object or array of action definition objects.
         * @returns {Promise} Promise that is resolved once all actions have been added.
         */
        var changeEvents = function (eventDef) {
            var currentPage = getCurrentPageName();
            return getPageMetadata(currentPage)
                .then(function (pageMd) {
                    var controlMd = pageMdHelper.getControlMd(eventDef.controlId, pageMd),
                        newActionMd = changeEventService.getEventMdObject(eventDef),
                        oldActionMd = pageMdHelper.getEventMd(eventDef.eventId, controlMd) || {
                                eventId: eventDef.eventId
                            };
                    return commandManager.execute({
                        preaction: setCurrentPageName.bind(this, currentPage),
                        execute: changeEventService.changeEvents.bind(this, newActionMd, controlMd),
                        unexecute: changeEventService.changeEvents.bind(this, oldActionMd, controlMd),
                        postaction: pageMdPersist.updatePage.bind(pageMdPersist, pageMd)
                    });
                });
        };

        var updateUrl = function (pageName) {
            var pathname = $window.location.pathname;
            if (pathname.indexOf('ui-composer') !== -1 && $state.params.currentScreen !== pageName) {
                var basePath = pathname.slice(0, pathname.indexOf('ui-composer') + _.size('ui-composer'));
                $location.skipReload().path(basePath + '/' + pageName).replace();
                updateStateParams(pageName);
            }
        };

        /**
         * @private
         * @description
         * Manually overwrite the state params here to make the sticky states plugin work correrctly
         * if we don't do this it could seem like we are not just reactivating ui-composer state when going back from data model
         * but rather updating the state params which is not wanted since that would cause a canvas reload
         */
        var updateStateParams = function (pageName) {
            $state.params.currentScreen = pageName;
            $state.$current.locals.globals.$stateParams.currentScreen = pageName;
        };

        /**
         * @name setCurrentPageName
         * @memberof uiComposer:services:npPageMetadata
         * @description Sets the current prototype page in canvas and updates the URL.
         *
         * @param {string} pageName
         * @returns {Promise} Promise that is resolved once navigation is done.
         */
        var setCurrentPageName = function (pageName) {
            if (pageName === _currentPageName && pageAPI._pageMdCache[pageName]) {
                return $q.when(pageAPI._pageMdCache[pageName]);
            }
            delete _availableMainEntityIds[pageName];

            _currentPageName = pageName;
            updateUrl(pageName);
            pageMdEvents.broadcast(pageMdEvents.events.pageChanged, pageName);
            return getPageMetadata(pageName)
                .then(function (pageMd) {
                    npLayoutHelper.setCurrentLayout(pageMd.floorplan);
                    return pageMd;
                });
        };

        /**
         * @name getCurrentPageName
         * @memberof uiComposer:services:npPageMetadata
         *
         * @returns {string} Current page's name.
         */
        var getCurrentPageName = function () {
            return _currentPageName;
        };

        $rootScope.$on('$stateChangeSuccess', function () {
            if (!$state.includes('prototype-editor')) {
                _currentPageName = undefined;
            }
        });

        $rootScope.$on('npPrototype/recreatingPrototype', function () {
            _currentPageName = undefined;
        });

        var handleWindowClose = function () {
            flushUpdates(true);
        };

        // TODO consider removing these proxy functions and using pageMdPersist service directly in application
        var saveStatuses = pageMdPersist.saveStatuses,
            getSaveStatus = pageMdPersist.getSaveStatus,
            flushUpdates = pageMdPersist.flushUpdates;

        return {
            saveStatuses: saveStatuses,
            getSaveStatus: getSaveStatus,
            flushUpdates: flushUpdates,
            addControl: addControl,
            addControlByCloning: addControlByCloning,
            deleteControl: deleteControl,
            moveControl: moveControl,
            changeProperty: changeProperty,
            changeControlBinding: changeControlBinding,
            bindControl: bindControl,
            unbindControl: unbindControl,
            getPageMetadata: getPageMetadata,
            setCurrentPageName: setCurrentPageName,
            getCurrentPageName: getCurrentPageName,
            changeEvents: changeEvents,
            changeMainEntity: changeMainEntity,
            getMainEntity: getMainEntity,
            getAvailableMainEntityIds: getAvailableMainEntityIds,
            handleWindowClose: handleWindowClose
        };
    }
];

module.exports = npPageMetadata;
