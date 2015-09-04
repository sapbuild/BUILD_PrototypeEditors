'use strict';
var _ = require('norman-client-tp').lodash;

/**
 * The npUiCanvasAPI service provides APIs to manipulate the canvas elements.
 * @module npUiCanvasAPI
 */

/**
 * @typedef {Object} UIControl
 * @memberof npUiCanvasAPI
 * @description UIControl is a technology-specific object representing a ui element.
 */

/**
 * @typedef {Promise} ControlPromise
 * @memberof npUiCanvasAPI
 * @description Promise containing a control/multiple controls, usually resolved after an update on the control(s)
 * @param {UIControl | UIControl[]} control(s)
 */

/**
 * @typedef {Object} Property
 * @memberof npUiCanvasAPI
 * @description describes a control property
 * @param {string} name
 * @param {Object} value
 */

/**
 * @typedef {Object} Group
 * @memberof npUiCanvasAPI
 * @description Object describing a group/aggregation of a control. children will be only UIControl
 * @param {string} groupId
 * @param {string} groupType
 * @param {boolean} singleChild
 * @param {UIControl[]} children
 */

/**
 * @typedef {Group} GroupData
 * @memberof npUiCanvasAPI
 * @description Object describing a group/aggregation of a control. children can be either UIControl or ControlData
 * @param {string} groupId
 * @param {string} groupType
 * @param {boolean} singleChild
 * @param {UIControl[] | ControlData[]} children
 */

/**
 * @typedef {Object} ControlData
 * @memberof npUiCanvasAPI
 * @description Object describing a control. Used to make copies of the control
 * @param {string} controlId
 * @param {string} catalogName
 * @param {Property[]} properties
 * @param {GroupData[]} groups
 */

/**
 * @typedef {Object} ControlMetadata
 * @memberof npUiCanvasAPI
 * @description control metadata, same as the one on pageMetadata model (server side)
 * @param {string} controlId
 * @param {string} parentControlId
 * @param {string} parentGroupId
 * @param {number} parentGroupIndex
 * @param {string} catalogControlName
 * @param {ControlPropertyMetadata[]} properties
 * @param {ControlGroupMetadata[]} groups
 * @param {ControlEventMetadata[]} events
 */

/**
 * @typedef {Object} AggregationMetadata
 * @memberof npUiCanvasAPI
 * @description Object describing a control aggregation metadata. Used to create a group
 * @param {string} name
 * @param {string} type
 * @param {boolean} multiple
 */

var npUiCanvasAPI = ['$injector', '$q', '$log', 'npUiCatalog', 'npBindingHelper', 'npPageMetadataHelper', 'npImageHelper', 'npConstants', 'npPropertyChangeHelper', 'npMessaging',
    function ($injector, $q, $log, npUiCatalog, npBindingHelper, pageMdHelper, npImageHelper, npConstants, npPropertyChangeHelper, npMessaging) {
        var uiHelper, pageMd, initReadyDefer = $q.defer();

        var initReady = function () {
            return initReadyDefer.promise;
        };

        var isReady = function () {
            // check for resolved status (code 1)
            return initReadyDefer.promise.$$state.status === 1;
        };

        /**
         * @name init
         * @description
         * Waits for the window root element to be loaded, then resolves the returned promise.
         * @param {Window} w The frame window
         * @param {string} uiTechnology Technology of the app running inside of window
         * @returns {Object} promise that will be resolved as soon as the window content is fully loaded.
         */
        var init = function (w, uiTechnology) {
            if (uiTechnology === 'UI5') {
                uiHelper = $injector.get('npUi5Helper');
                uiHelper.setWindow(w).then(initReadyDefer.resolve, initReadyDefer.reject);
            }
            else {
                initReadyDefer.reject(new Error('Helper for technology ', uiTechnology, ' is not available.'));
            }
            return initReady();
        };

        /**
         * @name reload
         * @description Reloads the window
         * @returns {Object} promise that will be resolved as soon as the window is reloaded
         */
        var reload = function (newContext) {
            var win = getWindow();
            if (win) {
                initReadyDefer = $q.defer();
                win.location.reload();
                // Doing a reload and then changing the location will break the UIComposer.
                // Shouldn't we do either one or the other?
                // Issue 1772 was caused by calling the reload function directly in a ".then(npUiCanvasAPI.reload)" call
                // Anything that was returned by a previous promise will therefor be passed to this function.
                if (_.isString(newContext)) {
                    var splitUrl = win.location.href.split('#');
                    var targetUrl = splitUrl[0];
                    if (splitUrl.length > 1) {
                        win.location.href = targetUrl + '#' + newContext;
                    }
                }
            }
            return initReady();
        };

        /**
         * @name invalidate
         * @description Invalidate the canvas API window.
         */
        var invalidate = function () {
            initReadyDefer = $q.defer();
            if (uiHelper) {
                uiHelper.setWindow();
            }
        };

        /**
         * @name navTo
         * @description
         * Navigates the canvas to the page name, waiting for the navigation to complete
         * @param {pageMd} newPageMd
         * @returns {Object} promise that will be resolved as soon as the navigation has completed
         */
        var navTo = function (newPageMd) {
            if (pageMd === newPageMd) {
                return navTo._navPromise;
            }
            pageMd = newPageMd;
            navTo._navPromise = initReady()
                .then(function () {
                    return uiHelper.navTo(newPageMd.name);
                })
                .then(function () {
                    var rootMd = pageMdHelper.getControlMd(newPageMd.rootControlId, newPageMd),
                        controlMd = findTemplate(rootMd) || rootMd;
                    return controlReady(controlMd);
                });
            return navTo._navPromise;
        };

        var findTemplate = function (controlMd) {
            if (pageMdHelper.isTemplate(controlMd)) {
                return controlMd;
            }
            var templateMd = null;
            _.some(controlMd.groups, function (groupMd) {
                templateMd = templateMd || _.find(controlMd.getChildrenMd(groupMd.groupId), findTemplate);
                return !!templateMd;
            });
            return templateMd;
        };
        /**
         * @name getWindow
         * @memberof npUiCanvasAPI
         * @description
         * returns the window currently observed by the service.
         * @returns {Window} window The frame window
         */
        var getWindow = function () {
            return uiHelper.getWindow();
        };


        /**
         * @name getCurrentViewName
         * @memberof npUiCanvasAPI
         * @description to be used only when we get back from interactive mode to know where the user did navigate.
         * @param isSmartApp check if this is a smart application or not
         * @returns {string} The current view's name.
         */
        // TODO investigate if we can use route info
        var getCurrentViewName = function (isSmartApp) {
            return uiHelper.getCurrentViewName(isSmartApp);
        };

        /**
         * @name deleteControl
         * @memberof npUiCanvasAPI
         * @description will delete a control
         * @param {Object} controlMd
         */
        // TODO rename it to removeControl
        var deleteControl = function (controlMd) {
            uiHelper.removeControl(controlMd.controlId);
        };


        /**
         * @name getControlDomRefByMd
         * @memberof npUiCanvasAPI
         * @description returns the dom object corresponding to a control metadata
         * @param {Object} controlMd
         * @returns {HTMLElement} control dom ref
         */
        // TODO change this to getBoundRect and input is controlMd, instanceIndex (handles templates too)
        var getControlDomRefByMd = function (controlMd) {
            var control = getControlInstanceByMd(controlMd);
            if (control) {
                return uiHelper.getDomRef(control);
            }
        };

        /**
         * @name bindControlGroup
         * @memberof npUiCanvasAPI
         * @description binds/unbinds a control group.
         * If groupMd.binding is undefined, the group will be unbound.
         * If groupMd.binding is defined and templateMd undefined, will use the old template control.
         * @param {Object} controlMd
         * @param {Object} groupMd
         */
        var bindControlGroup = function (controlMd, groupMd) {
            var control = getControlByMd(controlMd),
                templateMd = controlMd.getChildrenMd(groupMd.groupId)[0],
                bindingInfo = uiHelper.getBindingInfo(control, groupMd.groupId) || {};

            deleteControl(templateMd);
            bindingInfo.path = npBindingHelper.getPath(groupMd.binding);
            bindingInfo.template = getControlByMd(templateMd) || initControlByMd(templateMd);
            var topMostTemplateMd = pageMdHelper.getTopMostTemplate(templateMd);
            bindingInfo.expandPaths = topMostTemplateMd === templateMd ? npBindingHelper.getExpandPathsFromMd(templateMd, pageMd) : null;

            uiHelper.bindAggregation(control, groupMd.groupId, bindingInfo);
        };

        var updateControlGroupBinding = function (controlMd, groupId) {
            if (!_.isEmpty(groupId)) {
                var control = getControlByMd(controlMd);
                var bindingInfo = uiHelper.getBindingInfo(control, groupId) || {};
                var groupMd = pageMdHelper.getGroupMd(groupId, controlMd);
                var templateMd = controlMd.getChildrenMd(groupMd.groupId)[0];
                bindingInfo.expandPaths = npBindingHelper.getExpandPathsFromMd(templateMd, pageMd);

                uiHelper.bindAggregation(control, groupId, bindingInfo);
            }
        };

        var unbindControlGroup = function (controlMd, groupMd) {
            var control = getControlByMd(controlMd);
            var templateMd = controlMd.getChildrenMd(groupMd.groupId)[0];
            uiHelper.bindAggregation(control, groupMd.groupId);
            moveChildByMd(templateMd);
        };

        /**
         * @name setControlPropertiesByMd
         * @memberof npUiCanvasAPI
         * @description sets the properties of the control
         * @param {ControlMetadata} controlMd
         * @param {PropertyMd[]} properties
         */
        var setControlPropertiesByMd = function (controlMd, properties) {
            var ctrl = getControlByMd(controlMd);
            if (!ctrl) {
                return;
            }
            _.forEach(properties, function (propertyMd) {
                setControlProperty(ctrl, propertyMd);
            });
        };

        var setControlProperty = function (ctrl, propertyMd) {
            if (!ctrl) {
                return;
            }
            var value;
            if (pageMdHelper.isBound(propertyMd)) {
                value = npBindingHelper.getPath(propertyMd.binding);
                uiHelper.bindProperty(ctrl, propertyMd.name, value);
            }
            else {
                uiHelper.bindProperty(ctrl, propertyMd.name);
                value = npPropertyChangeHelper.parsePropertyValue(propertyMd);
                try {
                    uiHelper.setControlProperty(ctrl, propertyMd.name, value);
                }
                catch (err) {
                    $log.error('canvas-api could not set propertyMd: ', propertyMd, err);
                }
            }
        };


        /**
         * @name controlReady
         * @memberof npUiCanvasAPI
         * @description waits for the control to be rendered into the canvas. It will check if binding data is loaded and control is rendered.
         * If pageMd has a mainEntity, it will wait for it to be updated
         * If control is a template, it will get the topmost template parent and update the group where it is contained.
         * @param {Object} controlMd
         * @returns {ControlPromise} promise that will be resolved after the update of the control. promise contains the controlMd
         */
        var controlReady = function (controlMd) {

            return setEntityContext(pageMd.mainEntity)
                // if it fails is fine, recover by waiting for main control update
                .catch(function () {
                    // unbind
                    uiHelper.setContext();
                    var targetMd = controlMd;
                    var topMostTemplateMd = pageMdHelper.getTopMostTemplate(controlMd);
                    if (topMostTemplateMd) {
                        targetMd = topMostTemplateMd.getParentMd();
                        updateControlGroupBinding(targetMd, topMostTemplateMd.parentGroupId);
                    }
                    return waitForControl(targetMd);
                })
                .then(function () {
                    return waitForImagesLoading(controlMd);
                })
                .then(function () {
                    return controlMd;
                });
        };

        var waitForImagesLoading = function (controlMd) {
            var urls = _.chain(controlMd.properties)
                .filter(function (property) {
                    return property.type === 'URI' && typeof property.value === 'string' && property.value.length > 0;
                })
                .pluck('value')
                .value();
            return npImageHelper.loadImages(urls);
        };

        var waitForControl = function (controlMd) {
            var ctrl = getControlByMd(controlMd);
            var waitForRender = _.find(controlMd.properties, {
                name: npConstants.renderingProperties.VISIBLE
            }) || {};
            if (waitForRender.value === false) {
                return $q.when(ctrl);
            }
            var groupIds = getGroupsWithAbsoluteBinding(ctrl, controlMd.groups);
            if (_.isEmpty(groupIds)) {
                return uiHelper.waitForRendering(ctrl);
            }
            else {
                var waitForBindings = _.map(groupIds, function (groupId) {
                    return uiHelper.waitForBinding(ctrl, groupId);
                });
                return $q.all(waitForBindings);
            }
        };

        var initControlByMd = function (controlMd) {
            var ctrl = getControlByMd(controlMd);
            if (ctrl) {
                $log.warn('tried to initialize again control, which already exists. New parent', controlMd.parentControlId, ctrl);
            }
            else {
                var sCtrlType = npUiCatalog.getControlType(controlMd.catalogControlName, controlMd.catalogId),
                    sTagName = npUiCatalog.getTagName(controlMd.catalogControlName, controlMd.catalogId);
                ctrl = uiHelper.initControl(sCtrlType, controlMd.controlId, sTagName);
            }
            _.forEach(controlMd.properties, function (propertyMd) {
                setControlProperty(ctrl, propertyMd);
            });
            return ctrl;
        };

        var addChildByMd = function (controlMd) {
            var ctrl = initControlByMd(controlMd),
                parentMd = controlMd.getParentMd(),
                parent = getControlByMd(parentMd),
                posLeft = _.chain(controlMd.floorplanProperties).find({
                    name: 'left'
                }).result('value').value(),
                posTop = _.chain(controlMd.floorplanProperties).find({
                    name: 'top'
                }).result('value').value();
            uiHelper.insertControl(ctrl, parent, controlMd.parentGroupId, controlMd.parentGroupIndex, posLeft, posTop);
        };

        /**
         * @name moveChildByMd
         * @memberof npUiCanvasAPI
         * @description moves the control from the old parent to the specified index of the group. If the group is singleChild, it will replace the old control with the new one.
         * @param {Object} controlMd
         */
        var moveChildByMd = function (controlMd) {
            var ctrl = getControlByMd(controlMd),
                newParentMd = controlMd.getParentMd(),
                newParent = getControlByMd(newParentMd),
                posLeft = _.chain(controlMd.floorplanProperties).find({
                    name: 'left'
                }).result('value').value(),
                posTop = _.chain(controlMd.floorplanProperties).find({
                    name: 'top'
                }).result('value').value();
            uiHelper.moveControl(ctrl, newParent, controlMd.parentGroupId, controlMd.parentGroupIndex, posLeft, posTop);
        };

        /**
         * @name getEditablePropertyAtPosition
         * @memberof npUiCanvasAPI
         * @description determines a controls editable property at a certain position
         * @param {UIControl} parentControl
         * @param {number} mouse x position (UICanvas coords)
         * @param {number} mouse y position (UICanvas coords)
         * @returns {Object} Found property of control with current value
         */
        var getEditablePropertyAtPosition = function (parentControlMd, x, y) {
            var properties = parentControlMd.properties;
            var foundDomRef = getTextNodeParentAtPoint(x, y);
            var control = getControlInstanceByMd(parentControlMd, 0); // Requires control instance to find bound properties
            // possible property candidates for inline-editing are either
            // - the ones that match the foundDomRef textNode value or
            // - if no textNode was found, the ones without value-limitations of type string, int or float
            var possibleProperties = _.filter(properties, function (property) {
                if (foundDomRef) {
                    if (property.binding && property.binding.paths && property.binding.paths.length) {
                        return uiHelper.getControlProperty(control, property.name) === foundDomRef.textContent;
                    }
                    return property.value === foundDomRef.textContent;
                }
                var possibleValues = npUiCatalog.getControlProperties(parentControlMd.catalogControlName, parentControlMd.catalogId)[property.name].possibleValues;
                return _.isEmpty(possibleValues) && (property.type === 'string' || property.type === 'int' || property.type === 'float');
            });
            var defaultProperty = npUiCatalog.getDefaultProperty(parentControlMd.catalogControlName, parentControlMd.catalogId);
            var foundProperty;
            // the right property is either
            // - the candidate if we found only one or
            // - if defined, the default property from the ui catalog (in that case we need to make sure it matches the foundDomRef)
            if (possibleProperties.length === 1) {
                foundProperty = possibleProperties[0];
            }
            else if (defaultProperty) {
                var prop = _.find(properties, function (p) {
                    return p.name === defaultProperty;
                });
                foundProperty = {
                    name: defaultProperty,
                    value: prop.value
                };
                if (foundDomRef && foundDomRef.textContent !== foundProperty.value) {
                    foundDomRef = undefined;
                }
            }
            // if we found a property that doesn't match our previously foundDomRef (e.g. we took the default property in ui-catalog),
            // we need to search again for exactly one matching domRef
            if (foundProperty && !foundDomRef) {
                var parentDomRef = getControlDomRefByMd(parentControlMd);
                var textNodes = getTextNodesIn(parentDomRef, false);
                _.remove(textNodes, function (node) {
                    return node.textContent !== foundProperty.value;
                });
                if (textNodes.length === 1) {
                    foundDomRef = textNodes[0].parentElement;
                }
            }
            // make sure we have both, property and domRef
            if (foundProperty && foundDomRef) {
                return {
                    name: foundProperty.name,
                    value: foundProperty.value,
                    isBound: pageMdHelper.isBound(foundProperty),
                    domRef: foundDomRef
                };
            }
        };

        /**
         * @name getTextNodeParentAtPoint
         * @private
         * @description returns the domRef at a point if it contains only childNodes of type text
         * @param {number} mouse x position (UICanvas coords)
         * @param {number} mouse y position (UICanvas coords)
         * @returns {domRef{}} if domRefs only child is a text node, otherwise undefined
         */
        var getTextNodeParentAtPoint = function (x, y) {
            var domRef = getWindow().document.elementFromPoint(x, y);
            if (domRef && domRef.childNodes && domRef.childNodes.length > 0 && _.every(domRef.childNodes, 'nodeType', 3)) {
                return domRef;
            }
        };

        /**
         * @name getTextNodesIn
         * @private
         * @description retrieves all children of a parentNode that are text nodes
         * @param {domRef{}} parent Node
         * @param {boolean} weather to include whitespace text nodes in search
         * @returns {domRef[]} all found text nodes
         */
        var getTextNodesIn = function (rootNode, includeWhitespaceNodes) {
            var textNodes = [],
                nonWhitespaceMatcher = /\S/;

            function getTextNodes(node) {
                if (node.nodeType !== 3) {
                    _.forEach(node.childNodes, getTextNodes);
                }
                else if (includeWhitespaceNodes || nonWhitespaceMatcher.test(node.nodeValue)) {
                    textNodes.push(node);
                }
            }

            getTextNodes(rootNode);
            return textNodes;
        };

        /**
         * @name getGroupsWithAbsoluteBinding
         * @private
         * @description returns a list of group ids which have binding
         * @param {Object} ctrl
         * @param {GroupMetadata[]} groupsMd
         * @returns {string[]} groupIds
         */
        var getGroupsWithAbsoluteBinding = function (ctrl, groupsMd) {
            var groupsWithBinding = _.filter(groupsMd, function (group) {
                return pageMdHelper.isBound(group) && group.binding.isRelative === false && !_.isEmpty(uiHelper.getBindingInfo(ctrl, group.groupId));
            });
            return _.map(groupsWithBinding, 'groupId');
        };

        var setEntityContext = function (entityId) {
            return npBindingHelper.getEntityDefaultPath(entityId)
                .then(function (entityDefaultPath) {
                    var rootMd = pageMdHelper.getControlMd(pageMd.rootControlId, pageMd),
                        expandPaths = npBindingHelper.getExpandPathsFromMd(rootMd, pageMd);
                    return uiHelper.setContext(entityDefaultPath, expandPaths);
                });
        };

        /**
         * @name getControlByMd
         * @private
         * @description returns the control. If the controlMd is a template, it will return the control template instance
         * @param {Object} controlMd
         * @returns {UIControl}
         */
        var getControlByMd = function (controlMd) {
            var control = uiHelper.getControlById(controlMd.controlId);
            // TODO handle case when page is also bound and doesnt have parent
            if (!control && pageMdHelper.isTemplate(controlMd)) {
                var parentMd = controlMd.getParentMd(),
                    parent = getControlByMd(parentMd),
                    bindingInfo = uiHelper.getBindingInfo(parent, controlMd.parentGroupId);
                if (bindingInfo && uiHelper.getId(bindingInfo.template) === controlMd.controlId) {
                    control = bindingInfo.template;
                }
            }
            return control;
        };

        /**
         * @name getControlInstanceByMd
         * @private
         * @description returns the control instance. If controlMd is contained in a template, it will ensure the cloned instance will be returned.
         * @param {Object} controlMd
         * @param {number} index of the desired clone. It is used only if controlMd is a template control
         * @returns {UIControl|*}
         */
        var getControlInstanceByMd = function (controlMd, index) {
            index = index || 0;
            var topMostTemplateMd = pageMdHelper.getTopMostTemplate(controlMd);
            if (!topMostTemplateMd) {
                return uiHelper.getControlById(controlMd.controlId);
            }

            if (!pageMdHelper.isTemplate(controlMd)) {
                index = controlMd.parentGroupIndex || 0;
            }
            // the parent of the topmost is not bound, so we can get it by id
            var topMostParentControl = uiHelper.getControlById(topMostTemplateMd.parentControlId),
                control = topMostParentControl,
                controlMdParents = getParentsOfControlMd(controlMd, topMostTemplateMd);
            _.forEachRight(controlMdParents, function (controlParentMd) {
                control = uiHelper.getChild(control, controlParentMd.parentGroupId, controlParentMd.parentGroupIndex || 0);
            });
            return uiHelper.getChild(control, controlMd.parentGroupId, index);
        };

        /**
         * @name getParentsOfControlMd
         * @private
         * @description gets the parents of a controlMd until the endMd is reached.
         * controlMd is NOT included between the returned controls. endMd is included.
         * @param {Object} controlMd
         * @param {Object} [endMd]. if not passed, the rootControlMd is used
         * @returns {Object[]} [nearestParent, parentParent, parentParentParent]
         */
        var getParentsOfControlMd = function (controlMd, endMd) {
            endMd = endMd || pageMdHelper.getControlMd(pageMd.rootControlId, pageMd);
            if (endMd === controlMd) {
                return [];
            }
            var parentsMd = [],
                targetMd = controlMd;
            while (targetMd && targetMd.getParentMd()) {
                targetMd = targetMd.getParentMd();
                parentsMd.push(targetMd);
                if (targetMd === endMd) {
                    break;
                }
            }
            if (targetMd !== endMd) {
                $log.error('getParentsOfControlMd couldn\'t get all parents until the desired one', controlMd, endMd);
            }
            return parentsMd;
        };

        /**
         * @name refreshPageModel
         * @memberof npUiCanvasAPI
         * @description refreshes page model, used for smart template pages
         */
        var refreshPageModel = function () {
            var pageMdEntitySet = npBindingHelper.getNameSetFromId(pageMd.mainEntity);
            var currentEntitySet = uiHelper.getCurrentEntitySet();
            if (pageMdEntitySet !== null && pageMdEntitySet !== currentEntitySet) {
                npBindingHelper.getEntityDefaultPath(pageMd.mainEntity).then(function (defaultContext) {
                    // TODO: remove npMessaging from this file
                    // if the main entity was changed the Smart Template application should be reloaded, to reinitialise
                    npMessaging.showBusyIndicator(true);
                    // hide the busy cursor when finished
                    reload(defaultContext).finally(npMessaging.hideBusyIndicator);
                });
            }
            else {
                uiHelper.refreshPageFromAnnotation();
            }
        };

        /**
         * @name reloadMockData
         * @memberof npUiCanvasAPI
         * @description reloads the mock data, used for smart template pages
         */
        var reloadMockData = function () {
            uiHelper.reloadMockData();
        };

        return {
            initReady: initReady,
            isReady: isReady,
            init: init,
            reload: reload,
            invalidate: invalidate,
            navTo: navTo,
            getWindow: getWindow,
            getCurrentViewName: getCurrentViewName,
            deleteControl: deleteControl,
            getControlDomRefByMd: getControlDomRefByMd,
            bindControlGroup: bindControlGroup,
            unbindControlGroup: unbindControlGroup,
            setControlPropertiesByMd: setControlPropertiesByMd,
            controlReady: controlReady,
            addChildByMd: addChildByMd,
            moveChildByMd: moveChildByMd,
            getEditablePropertyAtPosition: getEditablePropertyAtPosition,
            refreshPageModel: refreshPageModel,
            reloadMockData: reloadMockData
        };
    }
];

module.exports = npUiCanvasAPI;
