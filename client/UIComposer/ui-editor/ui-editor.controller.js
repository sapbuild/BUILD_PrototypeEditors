'use strict';
var _ = require('norman-client-tp').lodash;
module.exports = UIEditorController;

// @ngInject
function UIEditorController($window, $scope, $q, $state, $location, $timeout, npPrototype, npSnapGuide, Studies, npBindingHelper, npFormFactor,
    npKeyboarder, npConstants, npUiCanvasAPI, AsideFactory, npNavBarHelper, uiCommandManager, npPageMetadata, npMessaging,
    npConcurrentAccessHelper, featureToggle, resPrototype, resPrototypeLock, npZoomHelper, npLayoutHelper, npPageMetadataEvents, uiWebAnalytics) {

    var that = this;

    /**
     * Private variables
     */

    var previewNeedsReload = false,
        firstZoomChanged = true,
        reEntry = false,
        formFactorName = 'Desktop',
        currentProject = $state.params.currentProject,
        prototypeGenerationDisabled = false,
        controlEventsChangedListener = npPageMetadataEvents.listen(npPageMetadataEvents.events.controlEventsChanged, setPreviewNeedsReload);

    /**
     * Public variables
     */

    that.prototypeLocked = !resPrototypeLock.success;
    // Show footer for locked prototype in PreviewMode
    that.showLockedFooter = true;
    // header options
    that.gridVisible = false;
    that.snappingEnabled = true;
    that.rulerHidden = true;
    that.generationVisible = false;
    // Publish prototype snapshot
    that.latestSnapShot = {
        lastPublishedDate: '',
        URL: 'Publish project to create a sharable link',
        publishButtonLabel: '',
        accessMsg: '',

        disablePublishing: false,
        italicizeURLTxt: true
    };
    that.userResearch = {
        studyName: '',
        description: '',
        untitled: 'My Untitled Study'
    };
    that.showInteractiveMode = that.prototypeLocked;
    that.rightclickMenu = {
        show: false,
        elements: [],
        styles: {
            top: 0,
            left: 0
        },
        selectElement: function () {
            // implementation in canvas-element-select
        }
    };
    // controls if on transisionend we should run the fit-width event to resize the ui-canvas.
    that.shouldEmitFitWidth = false;
    that.isSmartApplication = resPrototype.isSmartApp;
    that.canvasFormFactors = npFormFactor.getAvailableFormFactors();
    that.selectedFormFactor = npFormFactor.setFormFactorByName(formFactorName);
    // FIXME: adding 10px because of inset due to padding, should probably be done in a better way
    that.selectedFormFactor.adjustedWidth = parseInt(that.selectedFormFactor.width, 10) + 10 + 'px';
    that.commandManager = uiCommandManager;
    that.applyLeaveAnimation = false;
    // generation dialog choices
    that.choices = [{
        text: 'Master Detail in Read Only',
        value: 'Read'
    }, {
        text: 'Master Detail in Edition',
        value: 'Edit'
    }];
    // generation dialog selected application type
    that.applicationType = {
        selected: 'Read'
    };


    /**
     * Public methods
     */

    that.setCanvasFormFactor = setCanvasFormFactor;
    that.getLastPubProj = getLastPubProj;
    that.publishProj = publishProj;
    that.createSnapshotAndStudy = createSnapshotAndStudy;
    that.openPageMapView = openPageMapView;
    that.dialogOpen = dialogOpen;
    that.dialogClose = dialogClose;
    that.openDataModeler = openDataModeler;

    that.toggleNavigationBar = toggleNavigationBar;
    that.toggleSideBarRight = toggleSideBarRight;
    that.toggleSideBarLeft = toggleSideBarLeft;

    that.hideLockedFooter = hideLockedFooter;

    that.toggleInteractiveMode = toggleInteractiveMode;

    that.sidePanelAnimationComplete = sidePanelAnimationComplete;

    that.snapIconClicked = snapIconClicked;

    that.runAppFlow = runAppFlow;
    that.returnToPrototypePage = returnToPrototypePage;


    /**
     * init & scope listeners/watchers
     */

    npNavBarHelper.updateHeading();
    npNavBarHelper.enableUpdateSaveStatus();
    featureToggle.isEnabled('enable-prototype-generation').then(function (enabled) {
        prototypeGenerationDisabled = !enabled;
    });

    $scope.$on('ui-composer/afterEnter', onAfterEnter);
    $scope.$on('fit-width-value', onFitWidthValue);
    $scope.$on('ui-composer/beforeExit', onBeforeExit);
    $scope.$on('uiCanvas/navigationDone', onNavigationDone);
    $scope.$on('$destroy', onDestroy);
    $scope.$on('requestLibraryRefresh', refreshLibrary);
    $scope.$on('canvasRuntime/loaded', invalidateCanvas);
    $scope.$on('zoom-changed', onZoomChange);
    $scope.$on('bindinghelper-model-loaded', onEntitiesChange);
    $scope.$on('pageDeleted', setPreviewNeedsReload);

    $scope.$watch(function () {
            return npZoomHelper.getZoomLevel();
        }, function (newValue) {
            that.zoom = newValue;
            setCanvasZoomContainerLength(that.selectedFormFactor, newValue);
        }
    );
    $scope.$watch(function () {
        return npFormFactor.getCurrentFormFactor();
    }, function (newValue) {
        setCanvasZoomContainerLength(newValue, npZoomHelper.getZoomLevel());
    });


    /**
     * Implementation details
     */

    function onNavigationDone() {
        if (that.isSmartApplication) {
            // filter the list of controls based on the floorplan type
            $scope.$broadcast('executeCatalogRefresh', npLayoutHelper.getCurrentLayout());
        }

        if (that.prototypeLocked && !that.showInteractiveMode) {
            that.currentAvatar = npPrototype.getPrototypeViewModeData().prototypeViewModeAvatar;
            enterViewModeInteractiveMode();
        }
    }

    function onEntitiesChange() {
        that.generationVisible = !prototypeGenerationDisabled && npBindingHelper.hasEntities();
    }

    function onZoomChange(event, args) {
        if (event.targetScope.pageClass.indexOf('ui-composer') !== -1) { // TODO remove the hardcoded string
            npZoomHelper.setZoomLevel(args.value / 100);
            if (firstZoomChanged) {
                $scope.$emit('fit-width');
                firstZoomChanged = false;
            }
        }
    }

    function invalidateCanvas() {
        previewNeedsReload = false;
    }

    function refreshLibrary(event) {
        event.stopPropagation();
        $scope.$broadcast('executeLibraryRefresh');
    }

    function setCanvasFormFactor(formFactor) {
        npFormFactor.setCurrentFormFactor(formFactor);
        that.selectedFormFactor = formFactor;
        that.selectedFormFactor.adjustedWidth = _.parseInt(that.selectedFormFactor.width) + 10 + 'px';
    }

    function getLastPubProj() {
        that.latestSnapShot.publishButtonLabel = 'Publish';
        that.latestSnapShot.disablePublishing = false;
        npPageMetadata.flushUpdates().then(function saved() {
            npPrototype.getSnapshot().then(function (snapshot) {
                if (snapshot.existing) {
                    setLatestSnapShot(snapshot.stats.created_at, snapshot.snapshotUrl, false);
                }
            }).catch(function (error) {
                npMessaging.showError('Error: failed to get last snapshot', error);
            });
        });
    }

    function publishProj() {
        that.latestSnapShot.publishButtonLabel = 'Publishing...';
        npPageMetadata.flushUpdates().then(function saved() {
            npPrototype.createSnapshot().then(function (snapshot) {

                uiWebAnalytics.trackApplicationEvent(uiWebAnalytics.SNAPSHOTCREATED, uiWebAnalytics.SUCCESS);
                setLatestSnapShot(snapshot.created_at, snapshot.snapshotUrl, false);
                $timeout(function () {
                    that.latestSnapShot.publishButtonLabel = 'Published Project';
                    that.latestSnapShot.disablePublishing = true;
                }, 400);
            }).catch(function (error) {
                uiWebAnalytics.trackApplicationEvent(uiWebAnalytics.SNAPSHOTCREATED, uiWebAnalytics.FAILURE);
                that.latestSnapShot.publishButtonLabel = 'Error!';
                if (error && error.data && error.data.error && error.data.error.message) {
                    npMessaging.showError('Error: ' + error.data.error.message, error);
                }
                else {
                    npMessaging.showError('Error: failed to publish snapshot', error);
                }
            });
        });
    }

    function setPreviewNeedsReload() {
        previewNeedsReload = true;
    }

    function resetToFitWidth() {
        $scope.$emit('fit-width');
    }

    function onFitWidthValue(event, value) {
        var newValue = value.value / 100;
        if (that.zoom !== newValue) {
            that.zoom = newValue;
            setCanvasZoomContainerLength(that.selectedFormFactor, newValue);
        }
    }

    function onAfterEnter() {
        npPageMetadata.setCurrentPageName($state.params.currentScreen);
        bindKeyboardShortcuts();
        npConcurrentAccessHelper.disableUnlockMonitoring();
        $window.addEventListener('beforeunload', npPageMetadata.handleWindowClose);
        // bind to the modelChanged event
        $scope.$on('ModelEditorService.modelChanged', function () {
            previewNeedsReload = true;
        });
        // TODO:  use promises here, instead of broadcast
        if (reEntry) {
            npBindingHelper.refreshModel();
            // reload only when needed
            if (previewNeedsReload) {
                npUiCanvasAPI.reload();
                previewNeedsReload = false;
            }
        } else {
            reEntry = true;
            npBindingHelper.initEntities(currentProject);
        }
    }

    function onBeforeExit() {
        unbindKeyboardShortcuts();
        npConcurrentAccessHelper.enableUnlockMonitoring();
        $window.removeEventListener('beforeunload', npPageMetadata.handleWindowClose);
    }

    function onDestroy() {
        npKeyboarder.off(toggleEscapeBinding.bindingId);
        controlEventsChangedListener();
        if (that.toggleNavigationBar.toggled) {
            that.toggleNavigationBar();
        }
        npNavBarHelper.disableUpdateSaveStatus();
    }

    // set latestSnapShot values
    function setLatestSnapShot(pubTimeStamp, url, itURLTxt, accessMsg) {
        // default accessmessage for publish proj popup
        var defPubAccessMsg = 'Anyone with this link can access project';

        // TODO use angular way to display locale time
        that.latestSnapShot.lastPublishedDate = 'last published: ' + new Date(pubTimeStamp).toLocaleString();
        that.latestSnapShot.URL = constructURL(url);
        that.latestSnapShot.italicizeURLTxt = itURLTxt;
        that.latestSnapShot.accessMsg = accessMsg || defPubAccessMsg;
    }

    // construct the URL
    function constructURL(baseURL) {
        var protocol = $location.protocol(),
            host = $location.host(),
            port = $location.port();
        return protocol + '://' + host + ':' + port + baseURL;
    }


    function createSnapshotAndStudy() {
        if (!that.userResearch.studyName || that.userResearch.studyName.trim().length === 0) {
            that.userResearch.studyName = that.userResearch.untitled;
        }

        npPageMetadata.flushUpdates()
            .then(function saved() {
                return npPrototype.createSnapshot(false);
            })
            .then(function (snapshot) {
                var studyData = {
                    projectId: currentProject,
                    name: that.userResearch.studyName,
                    description: that.userResearch.description,
                    snapshotVersion: snapshot.snapshotVersion + '', // to pass the snapshot version as a string if not published
                    url: snapshot.deepLinks[0].pageUrl,
                    thumbnailUrl: snapshot.deepLinks[0].thumbnail
                };
                return Studies.createStudyWithQuestion(studyData).$promise;
            })
            .then(function (study) {
                that.dialogClose();
                navigateTo('shell.project.UserResearch.edit.screens', {
                    currentProject: currentProject,
                    studyId: study._id,
                    study: study
                });
            })
            .catch(function (err) {
                npMessaging.showError('Error: failed to create study', err);
            });
    }

    function navigateTo(stateName, params) {
        $state.go(stateName, params);
    }

    function dialogOpen() {
        npKeyboarder.suspendListeners();
        that.userResearch.description = '';
        that.userResearch.studyName = '';
    }

    function dialogClose() {
        npKeyboarder.resumeListeners();
    }

    function openDataModeler() {
        navigateTo('models', {
            currentProject: currentProject
        });
    }

    function openPageMapView() {
        resetToFitWidth();
        navigateTo('page-map-view', {
            currentProject: currentProject
        });
    }

    function forwardKeyEvents() {
        forwardKeyEvents.boundListenerFn = npKeyboarder.bindAdditionalWindow(npUiCanvasAPI.getWindow());
    }

    function removeKeyEventForwarding() {
        if (typeof forwardKeyEvents.boundListenerFn === 'function') {
            forwardKeyEvents.boundListenerFn();
        }
        delete forwardKeyEvents.boundListenerFn;
    }

    function onCanvasClick() {
        $scope.$broadcast('popup-close');
    }

    function forwardClickEvents() {
        angular.element(npUiCanvasAPI.getWindow().document).on('click', onCanvasClick);
    }

    function removeClickEventsForwarding() {
        angular.element(npUiCanvasAPI.getWindow().document).off('click', onCanvasClick);
    }

    function toggleEscapeBinding() {
        if (toggleEscapeBinding.bindingId) {
            npKeyboarder.off(toggleEscapeBinding.bindingId);
            delete toggleEscapeBinding.bindingId;
        }
        else {
            toggleEscapeBinding.bindingId = npKeyboarder.on(npConstants.keymap.Escape, that.toggleInteractiveMode);
        }
    }

    function toggleNavigationBar() {
        if (that.toggleNavigationBar.toggled) {
            AsideFactory.show();
            that.toggleNavigationBar.toggled = false;
        }
        else {
            AsideFactory.hide();
            that.toggleNavigationBar.toggled = true;
        }
    }

    function toggleSideBarRight() {
        that.toggleSideBarRight.toggled = !that.toggleSideBarRight.toggled;
        that.shouldEmitFitWidth = true;
    }

    function toggleSideBarLeft() {
        that.toggleSideBarLeft.toggled = !that.toggleSideBarLeft.toggled;
        that.shouldEmitFitWidth = true;
    }

    function hideLockedFooter() {
        that.showLockedFooter = false;
    }


    // TODO: Think of a better way to merge enterViewModeInteractiveMode and toggleInteractiveMode
    function enterViewModeInteractiveMode() {
        npKeyboarder.suspendListeners([toggleEscapeBinding.bindingId].concat(bindKeyboardShortcuts._interactiveModeShortcuts));
        that.showInteractiveMode = true;
        if (!that.toggleNavigationBar.toggled) {
            that.toggleNavigationBar();
        }
        else {
            that.toggleInteractiveMode.navBarWasToggled = true;
        }
    }

    function toggleInteractiveMode() {
        if (!that.showInteractiveMode) {
            npMessaging.showBusyIndicator();
            npPageMetadata.flushUpdates()
                .then(enterInteractiveMode)
                .finally(npMessaging.hideBusyIndicator);
        }
        else {
            leaveInteractiveMode();
        }
    }

    function enterInteractiveMode() {
        if (previewNeedsReload) {
            npUiCanvasAPI.reload();
        }
        forwardKeyEvents();
        forwardClickEvents();
        toggleEscapeBinding();
        npKeyboarder.suspendListeners([toggleEscapeBinding.bindingId].concat(bindKeyboardShortcuts._interactiveModeShortcuts));
        that.showInteractiveMode = true;
        if (!that.toggleNavigationBar.toggled) {
            that.toggleNavigationBar();
        }
        else {
            that.toggleInteractiveMode.navBarWasToggled = true;
        }
    }

    function leaveInteractiveMode() {
        if (that.isSmartApplication) {
            npUiCanvasAPI.reloadMockData();
        }
        removeKeyEventForwarding();
        removeClickEventsForwarding();
        toggleEscapeBinding();
        npKeyboarder.resumeListeners();
        that.showInteractiveMode = false;
        applyLeaveAnimation();
        if (!that.toggleInteractiveMode.navBarWasToggled) {
            that.toggleNavigationBar();
        }
        delete that.toggleInteractiveMode.navBarWasToggled;
        npPageMetadata.setCurrentPageName(npUiCanvasAPI.getCurrentViewName(that.isSmartApplication));
        $scope.$emit('uiComposer/exitInteractiveMode');
    }

    function sidePanelAnimationComplete() {
        if (that.shouldEmitFitWidth) {
            $scope.$emit('fit-width');
            that.shouldEmitFitWidth = false;
        }
    }

    function applyLeaveAnimation() {
        that.applyLeaveAnimation = true;
        $timeout(function () {
            that.applyLeaveAnimation = false;
        }, 1100);
    }

    function snapIconClicked() {
        that.snappingEnabled = !that.snappingEnabled;
        npSnapGuide.setSnappingEnabled(that.snappingEnabled);
    }

    function runAppFlow() {
        that.dialogClose();
        npMessaging.showBusyIndicator();
        npPrototype.createApplication(that.applicationType.selected)
            .then(function () {
                return $q.all([npPrototype.getPages(), npUiCanvasAPI.reload()]);
            })
            .then(function (values) {
                var pages = values[0];
                npPageMetadata.setCurrentPageName(_.first(pages).name);
            })
            .catch(function (error) {
                npMessaging.showError('Error: failed to create application', error);
            });
    }

    function returnToPrototypePage() {
        navigateTo('shell.project.prototype', {
            currentProject: currentProject
        });
    }

    function getZoomedLength(length, zoomLevel) {
        return (parseInt(length, 10) + 50) * zoomLevel + 'px';
    }

    function setCanvasZoomContainerLength(currentFormFactor, zoomLevel) {
        that.canvasZoomContainerWidth = getZoomedLength(currentFormFactor.adjustedWidth, zoomLevel);
        that.canvasZoomContainerHeight = getZoomedLength(currentFormFactor.height, zoomLevel);
    }

    function bindKeyboardShortcuts() {
        var MacOS = npConstants.os.MacOS,
            Windows = npConstants.os.Windows,
            Linux = npConstants.os.Linux;
        var keys = npConstants.keymap,
            modifiers = npConstants.modifierKeys;

        var undoRedoShortcuts = [
            npKeyboarder.on(keys.z, keyboardUndo, [modifiers.Meta], [MacOS]),
            npKeyboarder.on(keys.z, keyboardRedo, [modifiers.Meta, modifiers.Shift], [MacOS]),
            npKeyboarder.on(keys.z, keyboardUndo, [modifiers.Control], [Windows, Linux]),
            npKeyboarder.on(keys.z, keyboardRedo, [modifiers.Control, modifiers.Shift], [Windows, Linux])
        ];

        var interactiveModeShortcuts = [
            npKeyboarder.on(keys.i, that.toggleInteractiveMode, [modifiers.Meta], [MacOS]),
            npKeyboarder.on(keys.i, that.toggleInteractiveMode, [modifiers.Control], [Windows, Linux])
        ];
        bindKeyboardShortcuts._interactiveModeShortcuts = interactiveModeShortcuts;

        bindKeyboardShortcuts._listeners = undoRedoShortcuts.concat(interactiveModeShortcuts);
    }

    function keyboardUndo() {
        $window.document.activeElement.blur();
        uiCommandManager.undo();
    }

    function keyboardRedo() {
        $window.document.activeElement.blur();
        uiCommandManager.redo();
    }

    function unbindKeyboardShortcuts() {
        _.forEach(bindKeyboardShortcuts._listeners, function (listenerId) {
            npKeyboarder.off(listenerId);
        });
        delete bindKeyboardShortcuts._listeners;
    }
}
