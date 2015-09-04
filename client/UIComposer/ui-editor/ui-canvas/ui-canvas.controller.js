'use strict';
var _ = require('norman-client-tp').lodash;
module.exports = UICanvas;

// @ngInject
function UICanvas($window, $scope, $q, $stateParams, npUiCanvasAPI, npGrid, npImageHelper, npSnapGuide, npPrototype, npCanvasElementHighlight, npCanvasElementDrop,
                  npPageMetadata, npMessaging, npCanvasUpdater, npPageMetadataEvents, resPrototype) {

    var that = this;
    var pageChangeListener;

    npGrid.init();

    that.gridElements = npGrid.getElementsFlattened();
    that.horizontalGuides = npSnapGuide.getHorizontalGuides();
    that.verticalGuides = npSnapGuide.getVerticalGuides();
    that.elementHighlights = npCanvasElementHighlight.getElementHighlights();
    that.canvasUrl = npPrototype.getPrototypeMainUrl();
    that.pageTransitionInProgress = false;
    that.onSuccessImageDrop = onSuccessImageDrop;
    that.handleFileUploadError = handleFileUploadError;

    $scope.$on('elementHighlight/updated', refreshElementHighlight);
    $scope.$on('snapGuides/updated', refreshSnapGuides);
    $scope.$on('imagePositionCoordinates', function (event, x, y) {
        updatePositionCoordinates(x, y);
    });
    $scope.$on('ui-composer/afterEnter', onAfterEnter);
    $scope.$on('ui-composer/beforeExit', onBeforeExit);
    $scope.$on('$destroy', onDestroy);


    $scope.$watch(function () {
        return npMessaging.isShowingBusyIndicator();
    }, function (newValue) {
        that.showBusyIndicator = newValue;
    });

    function onAfterEnter() {
        if (!resPrototype.isSmartApp) {
            npCanvasUpdater.startListeningForMetadataChanges();
        }
        pageChangeListener = npPageMetadataEvents.listen(npPageMetadataEvents.events.pageChanged, function onPageChange(event, pageName) {
            navTo(pageName);
        });

        navTo($stateParams.currentScreen);
    }

    function onBeforeExit() {
        // save any pending change
        npPageMetadata.flushUpdates();
        npCanvasUpdater.stopListeningForMetadataChanges();
        pageChangeListener();
    }

    function onDestroy() {
        npUiCanvasAPI.invalidate();
    }

    function navTo(pageName) {
        if (!pageName) {
            return;
        }
        var pageMd;
        $q.all([npPageMetadata.getPageMetadata(pageName), npUiCanvasAPI.initReady()])
            .then(function (values) {
                pageMd = values[0];
                $scope.$emit('uiCanvas/navigationStart', pageMd);
                that.pageTransitionInProgress = true;
                npMessaging.showBusyIndicator();
                return npUiCanvasAPI.navTo(pageMd);
            })
            .then(function () {
                $scope.$emit('uiCanvas/navigationDone', pageMd);
                npMessaging.hideBusyIndicator();
                $window.focus();
            })
            .finally(function () {
                that.pageTransitionInProgress = false;
            });
    }

    function onSuccessImageDrop(response) {
        var assetId = response[0]._id,
            assetSrc = npPrototype.getAssetUrl(assetId);
        npImageHelper.getHotspotImageData(assetSrc).then(function (imgData) {
            var imgWidth = _.parseInt(_.result(_.find(imgData.properties, {
                    name: 'width'
                }), 'value')),
                imgHeight = _.parseInt(_.result(_.find(imgData.properties, {
                    name: 'height'
                }), 'value'));
            var positionData = {
                x: Math.max(that.imageX - (imgWidth / 2), 0),
                y: Math.max(that.imageY - (imgHeight / 2), 0)
            };
            var targetMd = npGrid.getRootElement().controlMd;
            npCanvasElementDrop.dropAtTarget(imgData, targetMd, positionData);
        });
        // this goes to editor, and editor notifies the library panel
        // better performance than using rootScope
        $scope.$emit('requestLibraryRefresh');
    }

    function handleFileUploadError(response) {
        npMessaging.showError('Error: failed to upload the image', response);
    }

    function refreshElementHighlight() {
        $scope.$evalAsync(function () {
            that.elementHighlights = npCanvasElementHighlight.getElementHighlights();
        });
    }

    function refreshSnapGuides() {
        // TODO: See why the $digest is needed in this case.
        that.horizontalGuides = npSnapGuide.getHorizontalGuides();
        that.verticalGuides = npSnapGuide.getVerticalGuides();
        $scope.$digest(); // AA: digest is necessary here, not sure why...
    }

    function updatePositionCoordinates(x, y) {
        that.imageX = x;
        that.imageY = y;
    }
}
