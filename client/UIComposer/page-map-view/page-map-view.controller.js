'use strict';
var _ = require('norman-client-tp').lodash;
module.exports = PageMapViewController;

// @ngInject
function PageMapViewController($scope, $state, $stickyState, npPrototype, npJsPlumb, npKeyboarder, npConstants, npPageMapLayout, npNavBarHelper, npMessaging, npFloorplanHelper, uiCommandManager) {
    var that = this;
    var inputEditField = null;

    that.createPage = createPage;
    that.deletePage = deletePage;
    that.goToComposerPage = goToComposerPage;
    that.selectPage = selectPage;
    that.resetSelection = resetSelection;

    npNavBarHelper.updateHeading();
    npNavBarHelper.enableUpdateSaveStatus();

    $scope.$on('page-map-view/afterEnter', bindKeyboardShortcuts);
    $scope.$on('page-map-view/beforeExit', unbindKeyboardShortcuts);
    $scope.$on('$destroy', onDestroy);
    // TODO: this is needed because for some reason blur is not fired on the input field when clicking on a different page; find better way to do this
    $scope.$on('editPageName', onEditPageName);

    init();

    /**
     * @name init
     * @private
     * @description Initialize page map view
     */
    function init() {
        that.selectedPage = {};
        that.artifactBaseUrl = npPrototype.getArtifactBaseUrl();
        that.currentPageCount;
        npJsPlumb.init();

        updatePageMapConnections().catch(function (error) {
            npMessaging.showError('Error: retrieving prototype failed', error);
        });
    }

    /**
     * @name onDestroy
     * @private
     * @description Destroy page map view
     */
    function onDestroy() {
        npJsPlumb.reset();
        npNavBarHelper.disableUpdateSaveStatus();
    }

    /**
     * @name onEditPageName
     * @private
     * @description Called when pageName is being edited
     */
    function onEditPageName(event, inputField) {
        event.stopPropagation();
        inputEditField = inputField;
    }

    /**
     * @name getFloorplans
     * @private
     * @description determines valid Floorplans
     * @returns {*} Promise resolved after all is successfully done
     */
    function getFloorplans() {
        npMessaging.showBusyIndicator();
        return npFloorplanHelper.getValidFloorplans()
            .then(function (floorplans) {
                that.floorplans = floorplans;
            })
            .finally(npMessaging.hideBusyIndicator);
    }

    /**
     * @name updatePageMapConnections
     * @private
     * @description updates the connections and the compatible floorplans if pageCount is > 0
     * @returns {*} Promise resolved after all is successfully done
     */
    function updatePageMapConnections() {
        return resetSelection().then(getFloorplans);
    }

    /**
     * @name createPage
     * @public
     * @description creates a new page and updates page connections
     * @returns {*} Promise resolved after all is successfully done
     */
    function createPage(event, floorplanData) {
        event.target.disabled = true;
        return npPrototype.createPage({
                floorplan: floorplanData.floorplan,
                catalogId: floorplanData.catalogId
            })
            .catch(function (error) {
                npMessaging.showError('Error: creating new page failed', error);
            })
            .then(updatePageMapConnections)
            .finally(function () {
                event.target.disabled = false;
            });
    }

    /**
     * @name deletePage
     * @public
     * @description deletes the selected page
     */
    function deletePage() {
        if (_.isEmpty(that.selectedPage)) {
            return;
        }

        if (that.currentPageCount > 1 && that.selectedPage.name === 'S0') {
            npPrototype.getPrototype().then(function (proto) {
                if (proto.isSmartApp) {
                    npMessaging.showError('List Report cannot be deleted if there are Object Pages');
                    return;
                }
                return doDeletePage();
            });
        }
        else {
            doDeletePage();
        }
    }

    function doDeletePage() {
        npPrototype.deletePage(that.selectedPage.name)
            .then(function (prototype) {
                if (_.isEmpty(prototype.pages)) {
                    $stickyState.reset('ui-composer-scaffolding');
                }
            })
            .catch(function (error) {
                npMessaging.showError('Error: failed to delete page', error);
            })
            .then(updatePageMapConnections);
    }

    /**
     * @name goToComposerPage
     * @public
     * @description creates a new page and updates page connections
     * @returns {*} Promise resolved after all is successfully done
     */
    function goToComposerPage(pageName) {
        $state.go('ui-composer', {
            currentProject: $state.params.currentProject,
            currentScreen: pageName
        });
    }

    /**
     * @name selectPage
     * @public
     * @description sets the newly selected page
     */
    function selectPage(page, event) {
        if (event) {
            event.stopPropagation();
        }
        if (that.selectedPage.name === page.name) {
            resetSelection();
            return;
        }
        // TODO: this is needed because for some reason blur is not fired on the input field when clicking on a different page; find better way to do this
        if (inputEditField) {
            inputEditField.blur();
            inputEditField = null;
        }
        that.connections = npPageMapLayout.showHighlightedConnections(page, that.connections, that.connectedScreens, that.unconnected);
        that.selectedPage = page;
    }

    function resetSelection() {
        that.selectedPage = {};
        return npPrototype.getPrototype()
            .then(function (proto) {
                var oldConnections = _.size(that.connections);
                that.currentPageCount = proto.pages.length;
                var values = npPageMapLayout.getConnectedPages(proto.pages, proto.navigations);
                // Smart template pages will have connections set up on creation of Object Page,
                // hence we need to reset the connected pages as well
                that.connectedScreens = npPageMapLayout.createLayout(values.connectedPages, values.edges);
                that.unconnected = npPageMapLayout.getGridLayout(values.unConnectedPages);
                that.connections = values.edges;
                npPageMapLayout.createConnections(values.edges);

                // check old value to see if connections did change
                // JsPlumb need to be rest after the screens and connections are redrawn, otherwise the connections retain the old position
                if (oldConnections !== _.size(values.edges)) {
                    npJsPlumb.reset();
                    npJsPlumb.init();
                }
                return proto;
            });
    }

    function undo() {
        var promise = uiCommandManager.undo();
        if (promise) {
            promise.then(updatePageMapConnections);
        }
    }

    function redo() {
        var promise = uiCommandManager.redo();
        if (promise) {
            promise.then(updatePageMapConnections);
        }
    }

    function bindKeyboardShortcuts() {
        var MacOS = npConstants.os.MacOS,
            Windows = npConstants.os.Windows,
            Linux = npConstants.os.Linux;
        var keys = npConstants.keymap,
            modifiers = npConstants.modifierKeys;

        bindKeyboardShortcuts._keyboardListeners = [
            npKeyboarder.on(keys.z, undo, [modifiers.Meta], [MacOS]),
            npKeyboarder.on(keys.z, redo, [modifiers.Meta, modifiers.Shift], [MacOS]),
            npKeyboarder.on(keys.z, undo, [modifiers.Control], [Windows, Linux]),
            npKeyboarder.on(keys.z, redo, [modifiers.Control, modifiers.Shift], [Windows, Linux]),
            npKeyboarder.on(npConstants.keymap.Delete, deletePage),
            npKeyboarder.on(npConstants.keymap.Backspace, deletePage)
        ];
    }

    function unbindKeyboardShortcuts() {
        _.forEach(bindKeyboardShortcuts._keyboardListeners, npKeyboarder.off);
    }

}
