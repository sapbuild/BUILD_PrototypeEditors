'use strict';

var _ = require('norman-client-tp').lodash;

/**
 * @ngdoc factory
 * @name npPageMetadataControlBinding
 * @namespace uiComposer:services:npPageMetadata:controlBinding
 */

/**
 * @typedef BindingDefinition
 * @type {object}
 * @memberof uiComposer:services:controlBinding
 * @property {string} controlId
 * @property {string} groupId
 * @property {Object} binding
 * @property {Object[]} children
 */
/**
 * @typedef ChangedBinding
 * @type {object}
 * @memberof uiComposer:services:controlBinding
 * @property {Object} controlMd
 * @property {Object[]} invalidGroups
 * @property {Object[]} invalidProperties
 */

/**
 * @typedef ChangedControls
 * @type {object}
 * @memberof uiComposer:services:controlBinding
 * @property {ControlMd[]} controlsAdded
 * @property {ControlMd[]} controlsRemoved
 * @property {ChangedBinding[]} controlsChanged
 */

var npPageMetadataControlBinding = ['$log', 'npPageMetadataAddControl', 'npPageMetadataDeleteControl', 'npPageMetadataHelper', 'npPageMetadataEvents', 'npBindingHelper', 'npUiCatalog',
    function ($log, addControlService, deleteControlService, pageMdHelper, pageMdEvents, npBindingHelper, npUiCatalog) {

        /**
         * @private
         * @description binds a group. Must pass binding and template!
         *
         * @param {BindingDefinition} bindingDef
         * @param {Object} pageMd
         */
        var performBindGroup = function (bindingDef, pageMd) {
            // both need to be defined
            if (!pageMdHelper.isBound(bindingDef)) {
                throw new Error('must pass binding', bindingDef);
            }
            var controlMd = pageMdHelper.getControlMd(bindingDef.controlId, pageMd),
                groupMd = pageMdHelper.getGroupMd(bindingDef.groupId, controlMd);

            groupMd.binding = bindingDef.binding;

            return {
                controlMd: controlMd,
                groupMd: groupMd
            };
        };

        var unbindControls = function (controlsMd) {
            _.forEach(controlsMd, function (controlMd) {
                _.forEach(controlMd.properties, function (propertyMd) {
                    propertyMd.binding = {};
                });
                _.forEach(controlMd.groups, function (groupMd) {
                    groupMd.binding = {};
                    var childrenMd = controlMd.getChildrenMd(groupMd.groupId);
                    unbindControls(childrenMd);
                });
            });
        };

        /**
         * @private
         * @description removes the binding, sets the new children if they're passed
         *
         * @param {BindingDefinition} bindingDef
         * @param {Object} pageMd
         */
        var performUnbindGroup = function (bindingDef, pageMd) {
            var controlMd = pageMdHelper.getControlMd(bindingDef.controlId, pageMd),
                groupMd = pageMdHelper.getGroupMd(bindingDef.groupId, controlMd);

            if (!pageMdHelper.isBound(groupMd)) {
                throw new Error('group is already unbound!', bindingDef);
            }
            groupMd.binding = {};

            return {
                controlMd: controlMd,
                groupMd: groupMd
            };
        };

        /**
         * @private
         * @description updates the binding of the group with new template and/or path. Must pass either new template or path.
         *
         * @param {BindingDefinition} bindingDef
         * @param {PageMd} pageMd
         */
        var performChangeGroupBinding = function (bindingDef, pageMd) {
            bindingDef = bindingDef || {};
            bindingDef.children = bindingDef.children || [];

            var isNewBinding = pageMdHelper.isBound(bindingDef),
                isNewTemplate = !_.isEmpty(bindingDef.children);

            if (!isNewBinding && !isNewTemplate) {
                throw new Error('must pass new template or binding', bindingDef);
            }

            var controlMd = pageMdHelper.getControlMd(bindingDef.controlId, pageMd),
                groupMd = pageMdHelper.getGroupMd(bindingDef.groupId, controlMd);

            if (isNewBinding) {
                groupMd.binding = bindingDef.binding;
            }

            if (isNewTemplate) {
                var oldGroupChildrenMd = pageMdHelper.getControlsAndChildMd(groupMd.children, pageMd);
                var newChildrenMd = bindingDef.children;
                deleteControlService.performDelete(oldGroupChildrenMd, pageMd);
                addControlService.performAdd(newChildrenMd, pageMd);
            }

            return {
                controlMd: controlMd,
                groupMd: groupMd
            };
        };

        /**
         * @name performChangeBindings
         * @memberof uiComposer:services:npPageMetadata:addControl
         * @description Iterates over bindingDefs and updates each control binding. The npPageMetadata service uses this function to update controls bindings.
         * This function is only public to the npPageMetadata service.
         * @param {BindingDefinition[][]} bindingDefs
         * @param {PageMd} pageMd
         * @returns {Promise} Promise that is resolved once all controls have been bound and updated in the metadata.
         */
        var performChangeBindings = function (bindingDefs, pageMd, options) {
            var returnObjs = _.map(bindingDefs, function (bindingDef) {
                return performChangeGroupBinding(bindingDef, pageMd);
            });

            pageMdEvents.broadcast(pageMdEvents.events.controlsBindingChanged, pageMd, returnObjs, options);
        };

        /**
         * @name performBindings
         * @memberof uiComposer:services:npPageMetadata:addControl
         * @description Iterates over bindingDefs and updates each control binding. The npPageMetadata service uses this function to update controls bindings.
         * This function is only public to the npPageMetadata service.
         * @param {BindingDefinition[][]} bindingDefs
         * @param {Object} pageMd
         * @returns {Promise} Promise that is resolved once all controls have been bound and updated in the metadata.
         */
        var performBindings = function (bindingDefs, pageMd, options) {
            var returnObjs = _.map(bindingDefs, function (bindingDef) {
                return performBindGroup(bindingDef, pageMd);
            });

            pageMdEvents.broadcast(pageMdEvents.events.controlsBindingChanged, pageMd, returnObjs, options);
        };
        /**
         * @name performUnbindings
         * @memberof uiComposer:services:npPageMetadata:addControl
         * @description Iterates over bindingDefs and updates each control binding. The npPageMetadata service uses this function to update controls bindings.
         * This function is only public to the npPageMetadata service.
         * @param {BindingDefinition[][]} bindingDefs
         * @param {Object} pageMd
         * @returns {Promise} Promise that is resolved once all controls have been bound and updated in the metadata.
         */
        var performUnbindings = function (bindingDefs, pageMd, options) {
            var returnObjs = _.map(bindingDefs, function (bindingDef) {
                return performUnbindGroup(bindingDef, pageMd);
            });

            pageMdEvents.broadcast(pageMdEvents.events.controlsBindingChanged, pageMd, returnObjs, options);
        };

        var _fillChildrenToAutobind = function (controlMd, children) {
            _.forEach(controlMd.groups, function (groupMd) {
                if (!npUiCatalog.isDataDrivenAggregation(groupMd.groupId, controlMd.catalogControlName, controlMd.catalogId)) {
                    // Explore the children (not multiple aggregation or aggregation that cannot be bound
                    var childrenMd = controlMd.getChildrenMd(groupMd.groupId);
                    _.forEach(childrenMd, function (childMd) {
                        children.push(childMd);
                        _fillChildrenToAutobind(childMd, children);
                    });
                }
            });
            return children;
        };

        var getPropertyDefsToAutobind = function (bindingDef, pageMd) {
            var controlMd = pageMdHelper.getControlMd(bindingDef.controlId, pageMd),
                groupMd = pageMdHelper.getGroupMd(bindingDef.groupId, controlMd),
                templateMd;
            if (pageMdHelper.isBound(bindingDef) && _.size(bindingDef.children)) {
                var childToUseAsTemplateIndex = bindingDef.childToUseAsTemplateIndex || 0;
                templateMd = bindingDef.children[childToUseAsTemplateIndex];
            }
            else {
                templateMd = pageMdHelper.getControlMd(groupMd.children[0], pageMd);
            }
            // Need to set binding to the group to auto bind the good properties
            var oldBinding = groupMd.binding;
            groupMd.binding = bindingDef.binding || {};

            var controlMds = [templateMd];
            _fillChildrenToAutobind(templateMd, controlMds);
            var propertyDefs = getAutobindPropertyDefs(controlMds, pageMd);

            groupMd.binding = oldBinding;

            return propertyDefs;
        };

        var getAutobindPropertyDefs = function (controlMds, pageMd) {
            var usedPaths = {};
            var propertyDefs = [];
            _.forEach(controlMds, function (controlMd) {
                var properties = [];
                _.forEach(controlMd.properties, function (propertyMd) {
                    if (pageMdHelper.canEditProperty(controlMd, propertyMd.name)) {
                        var candidates = npBindingHelper.getPropertyPathsFromMd(propertyMd, controlMd, pageMd.mainEntity);
                        var candidate = _.find(candidates, function (c) {
                            return !usedPaths[c.path];
                        });
                        if (candidate) {
                            usedPaths[candidate.path] = true;
                            properties.push({
                                name: propertyMd.name,
                                binding: candidate.binding,
                                value: propertyMd.value
                            });
                        }
                    }
                });
                if (!_.isEmpty(properties)) {
                    propertyDefs.push({
                        controlId: controlMd.controlId,
                        properties: properties
                    });
                }
            });
            return propertyDefs;
        };

        var getChangedControls = function (controlMd, pageMd) {
            var changes = [];
            _.forEach(controlMd.groups, function (groupMd) {
                var childrenMd = controlMd.getChildrenMd(groupMd.groupId);
                _.forEach(childrenMd, function (childMd) {
                    var propsAndGroups = getPropertiesAndGroupsToUpdate(childMd, pageMd);
                    if (!_.isEmpty(propsAndGroups)) {
                        changes.push(propsAndGroups);
                    }
                    var changedControls = getChangedControls(childMd, pageMd);
                    changes = changes.concat(changedControls);
                });
            });
            return changes;
        };

        var getPropertiesAndGroupsToUpdate = function (controlMd, pageMd) {
            var isInvalid = function (md) {
                    return pageMdHelper.isBound(md) && npBindingHelper.isInvalidBinding(md.binding, pageMd.mainEntity);
                },
                properties = _.filter(controlMd.properties, isInvalid),
                groups = _.filter(controlMd.groups, isInvalid);

            if (_.size(properties) || _.size(groups)) {
                return {
                    controlMd: controlMd,
                    invalidProperties: properties,
                    invalidGroups: groups
                };
            }
        };

        return {
            performChangeBindings: performChangeBindings,
            performBindings: performBindings,
            performUnbindings: performUnbindings,
            getPropertyDefsToAutobind: getPropertyDefsToAutobind
        };
    }
];

module.exports = npPageMetadataControlBinding;
