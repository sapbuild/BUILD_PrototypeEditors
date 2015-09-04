'use strict';
var _ = require('norman-client-tp').lodash;
module.exports = TreePanelController;

// @ngInject
function TreePanelController($scope, $rootScope, $state, $stickyState, npPrototype, npUiCanvasAPI, npTreeModel, npTreeSelect, npPageMetadata, npMessaging, npConstants, npKeyboarder, npFloorplanHelper) {
    var that = this;
    var keyboardListeners = [];

    that.nodes = [];
    that.createPage = createPage;

    $scope.$on('pageCreated', onPageCreated);
    $scope.$on('pageDeleted', onPageDeleted);
    $scope.$on('pageRenamed', onPageRenamed);
    $scope.$on('gridRefreshed', refreshTree);
    $scope.$on('npGrid/elementsMoved', $scope.$broadcast.bind($scope, 'expandSelectedNodes'));
    $scope.$on('ui-composer/afterEnter', onAfterEnter);
    $scope.$on('ui-composer/beforeExit', onBeforeExit);
    $scope.$on('$destroy', onDestroy);


    init();

    function init() {
        refreshTree();
        npFloorplanHelper.getValidFloorplans()
            .then(function (floorplans) {
                that.floorplans = floorplans;
            });
    }

    function onDestroy() {
        npTreeModel.invalidateNodes();
    }

    /**
     * Refreshs tree model to display changes in the tree
     */
    function refreshTree() {
        npTreeModel.refreshModel()
            .then(function (nodes) {
                that.nodes = nodes;
                $scope.$broadcast('expandSelectedNodes');
            });
        $rootScope.$broadcast('disableDataModeler', {value: false});
    }

    function selectNode(which, event) {
        event.preventDefault();
        if (which === 'next') {
            npTreeSelect.selectNextNode();
        }
        else {
            npTreeSelect.selectPreviousNode();
        }
    }

    /**
     * Creates a new Page based on the selected compatible floorplan (e.g. ABSOLUTE, GRID)
     * and updates the tree accordingly.
     * @return {object} Promise object that resolves when updates are done.
     */
    function createPage(floorplan) {
        $rootScope.$broadcast('disableDataModeler', {value: true});
        npMessaging.showBusyIndicator();
        return npPageMetadata.flushUpdates()
            .then(function () {
                return npPrototype.createPage({floorplan: floorplan.floorplan, catalogId: floorplan.catalogId});
            })
            .catch(function (error) {
                npMessaging.showError('Error: failed to create new page', error);
            });
    }

    function onPageCreated(event, pageName) {
        return npUiCanvasAPI.reload()
            .then(function () {
                return npPageMetadata.setCurrentPageName(pageName);
            });
    }

    function onPageDeleted(event, deletedPageName) {
        return npPrototype.getPrototype()
            .then(function (appMetadata) {
                selectPreviousPage(appMetadata, deletedPageName);
            });
    }

    function onPageRenamed(event, pageName, pageDisplayName) {
        var updatedPage = _.find(that.nodes, function (pageNode) {
            return pageNode.data.name === pageName;
        });
        if (updatedPage.displayName !== pageDisplayName) {
            refreshTree();
        }
    }

    function selectPreviousPage(appMetadata, pageName) {
        var iPage = getPageIndex(pageName);
        if (_.size(appMetadata.pages)) {
            var iPageToBeSelected = Math.max(iPage - 1, 0);
            npPageMetadata.setCurrentPageName(appMetadata.pages[iPageToBeSelected].name);
        }
        else {
            $state.go('page-map-view', {
                    currentProject: $state.params.currentProject
                })
                .then(function () {
                    $stickyState.reset('ui-composer-scaffolding');
                });
        }
    }

    function getPageIndex(pageName) {
        return _.findIndex(that.nodes, function (node) {
            return node.data.name === pageName;
        });
    }

    function onAfterEnter() {
        keyboardListeners.push(npKeyboarder.on(npConstants.keymap.ArrowUp, selectNode.bind(this, 'previous')));
        keyboardListeners.push(npKeyboarder.on(npConstants.keymap.ArrowLeft, selectNode.bind(this, 'previous')));
        keyboardListeners.push(npKeyboarder.on(npConstants.keymap.ArrowDown, selectNode.bind(this, 'next')));
        keyboardListeners.push(npKeyboarder.on(npConstants.keymap.ArrowRight, selectNode.bind(this, 'next')));
    }

    function onBeforeExit() {
        _.forEach(keyboardListeners, function (listener) {
            npKeyboarder.off(listener);
        });
    }
}
