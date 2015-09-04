'use strict';
//var fs = require('fs');
//var path = require('path');
var promise = protractor.promise;


var HeaderIcons = function (value, cb) {
    if(value.length > 0){
        var url = value.charAt(0) == '/' ? value : '/' + value;
        browser.get(url);
    }
    if (typeof cb === 'function') { cb(); }
};


HeaderIcons.prototype = Object.create({}, {
    // HELPER

    //SELECTORS - header icons

    iconDataModeler:   { get:   function ()     { return element(by.id('np-e-data-modeler-icon'));}},

    iconPhonePortrait:   { get:   function ()     { return element(by.id('np-e-form-factor-phone-icon'));}},

    iconTabletPortrait:   { get:   function ()     { return element(by.id('np-e-form-factor-tablet-icon'));}},

    iconDesktop:   { get:   function ()     { return element(by.id('np-e-form-factor-desktop-icon'));}},

    iconPreviewMode: { get:   function ()     { return element(by.id('np-e-preview-icon'));}},

    iconEditMode: { get:   function ()     { return element(by.id('np-e-edit-icon'));}},

    iconToggleGrid:   { get:   function ()     { return element(by.id('np-e-grid-icon'))}},

    rulerIcon: {
        get: function() {
            return element(by.id('np-e-ruler-icon'));
        }
    },

    iconSnapping:   { get:   function ()     { return element(by.id('np-e-snapping-icon'));}},

    iconPageMap:   { get:   function ()     { return element(by.id('np-e-page-map-icon'));}},

    pageMapPage:   { get:   function ()     { return element(by.id('np-p-page-map-container-id'));}},

    iconBrushForComposer:   { get:   function ()     { return element(by.css('span[ng-click="ctrl.goToUIComposer()"]'));}},

    iconLeftSidebar :{get: function() {return element(by.id('np-e-toggle-siderbar-left-icon'));}},

    iconRightSidebar :{get: function() {return element(by.id('np-e-toggle-siderbar-right-icon'));}},

    noLeftSidebarOnCanvas:             { get:   function ()     { return element(by.css('.np-e-side-panel-left--hidden'));}},

    noRightSidebarOnCanvas:             { get:   function ()     { return element(by.css('.np-e-side-panel-right--hidden'));}},

    leftSidebarOnCanvas:             { get:   function ()     { return element(by.css('.np-e-side-panel-left'));}},

    rightSidebarOnCanvas:             { get:   function ()     { return element(by.css('.np-e-side-panel-right'));}},

    iconZoom:             { get:   function ()     { return element(by.css('.ui-zoom'));}},

    iconFullWidth:{get: function() {return element(by.css('.default-width'));}},

    iconFitWidth:{get: function() {return element(by.css('.fit-width'));}},

    zoomPercent:         { get:   function ()     { return element(by.css('.ui-zoom')).element(by.binding("sliderModel.value"));}},

    iconSlidePlus:         { get:   function ()     { return element(by.css('[ng-click="increment()"]'));}},

    // STATE EVALUATION METHODS

    doesShowNavBar: { get:   function ()     {
        return this.iconNavBar.getAttribute('class').then( function(value) {
            return promise.fulfilled( value.indexOf('np-e-header-icon-active') > -1 );
        });
    }},

    isInPhonePortraitModeOn: { get:   function ()     {
        return this.iconPhonePortrait.getAttribute('class').then( function(value) {
            return promise.fulfilled( value.indexOf('Device_Light_phone-port') > -1 );
        });
    }},

    isInPhonePortraitModeOff: { get:   function ()     {
        return this.iconPhonePortrait.getAttribute('class').then( function(value) {
            return promise.fulfilled( value.indexOf('Device_Light_phone-port-off') > -1 );
        });
    }},

    isInTabletPortraitModeOn: { get:   function ()     {
        return this.iconTabletPortrait.getAttribute('class').then( function(value) {
            return promise.fulfilled( value.indexOf('Device_Light_tablet-port') > -1 );
        });
    }},

    isInTabletPortraitModeOff: { get:   function ()     {
        return this.iconTabletPortrait.getAttribute('class').then( function(value) {
            return promise.fulfilled( value.indexOf('Device_Light_tablet-port-off') > -1 );
        });
    }},


    isInDesktopModeOn: { get:   function ()     {
        return this.iconDesktop.getAttribute('class').then( function(value) {
            return promise.fulfilled( value.indexOf('DeviceLight_monitor') > -1 );
        });
    }},

    isInDesktopModeOff: { get:   function ()     {
        return this.iconDesktop.getAttribute('class').then( function(value) {
            return promise.fulfilled( value.indexOf('DeviceLight_monitor-off') > -1 );
        });
    }},

    isInEditMode: { get:   function ()     {
        return this.iconEditMode.getAttribute('class').then( function(value) {
            return promise.fulfilled( value.indexOf('ng-hide') > -1 );
        });
    }},

    isInPreviewMode: { get:   function ()     {
        return this.iconPreviewMode.getAttribute('class').then( function(value) {
            return promise.fulfilled( value.indexOf('ng-hide') > -1 );
        });
    }},

    showRulerX: {
        get: function() {
            return element(by.css('.np-e-canvas-xscale.np-e-canvas-xscale--show'));
        }
    },

    showRulerY: {
        get: function() {
            return element(by.css('.np-e-canvas-yscale.np-e-canvas-yscale--show'));
        }
    },

    isSnappingIconOn: { get:   function ()     {
        return this.iconSnapping.getAttribute('class').then( function(value) {
            return promise.fulfilled( value.indexOf('snap-icon') > -1 );
        });
    }},

    isSnappingIconOff: { get:   function ()     {
        return this.iconSnapping.getAttribute('class').then( function(value) {
            return promise.fulfilled( value.indexOf('snap-icon-off') > -1 );
        });
    }},

    verifyZoomPercent: { value: function () {
        return this.zoomPercent.getText().then( function(value) {
            return promise.fulfilled(value == "100");
        });
    }},
    //ACTIONS METHODS

    clickIconDataModeler:   { value: function () { this.iconDataModeler.click();}},

    clickIconPhonePortrait:   { value: function () { this.iconPhonePortrait.click();}},

    clickIconTabletPortrait:   { value: function () { this.iconTabletPortrait.click();}},

    clickIconDesktop:   { value: function () { this.iconDesktop.click();}},

    clickIconPreviewMode: { value: function () { this.iconPreviewMode.click();}},

    clickIconEditMode: { value: function () { this.iconEditMode.click();}},

    clickIconToggleGrid:   { value: function () { this.iconToggleGrid.click();}},

    clickIconRuler: { value: function () { this.rulerIcon.click();}},

    clickIconSnapping: { value: function () { this.iconSnapping.click();}},

    clickBrushIcon: { value: function () { this.iconBrushForComposer.click();}},

    clickPageMapIcon: { value: function () { this.iconPageMap.click();}},

    clickIconLeftSidebar :{ value: function() {this.iconLeftSidebar.click();}},

    clickIconRightSidebar :{ value: function() {this.iconRightSidebar.click();}},

    clickIconZoom :{ value: function() {this.iconZoom.click();}},

    clickIconFullWidth :{ value: function() {this.iconFullWidth.click();}},

    clickIconFitWidth :{ value: function() {this.iconFitWidth.click();}},

    clickIconSlidePlus :{ value: function() {this.iconSlidePlus.click();}}
});

module.exports = HeaderIcons;
