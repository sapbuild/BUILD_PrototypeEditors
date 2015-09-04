'use strict';
var fs = require('fs');
var path = require('path');
var promise = protractor.promise;

by.addLocator('attr',
    /**
     * Find element(s), where attribute = value
     * @param {string} attr
     * @param {string} value
     * @param {Element} [parentElement=]
     * @returns {Array.<Element>}
     */
    function (attr, value, parentElement) {
        parentElement = parentElement || document;
        var nodes = parentElement.querySelectorAll('[' + attr + ']');
        return Array.prototype.filter.call(nodes, function (node) {
            return (node.getAttribute(attr) === value);
        });
    });

var UiComposer = function (value, cb) {
    if(value.length > 0){
        var url = value.charAt(0) == '/' ? value : '/' + value;
        browser.get(url);
    }
    if (typeof cb === 'function') { cb(); }
};


UiComposer.prototype = Object.create({}, {
    // HELPER
    typeIntoInputField: { value: function (el, input) {
        el.clear();
        el.sendKeys(input);
//        browser.waitForAngular();
    }},

    //SELECTORS
    //prototype page

    numOfPages:         { get:   function ()     { return element.all(by.binding('screenName'));}},
    linkPage:           { value: function (name) { return element(by.cssContainingText( '.ui-screen-tile', name));}},
    treeChildNamed:    { value: function (name) {
        return element.all(by.repeater( 'item in item.gridChildren')).filter( function(el){
            return el.getText().then(function(value){
                return value == name;
            })
        }).first();
    }},

    //composer page
    canvas:             { get:   function ()     { return element(by.css('.np-c-grid'));}},

    previewModeScreen: { get:   function ()     { return element(by.id('canvas-runtime'));}},

    buttonInCanvas:     { get:   function ()     { return element(by.id('canvasOverlay'));}},

    //blank Prototype tiles:
    protoTiles:             { get:   function ()     {  return element.all(by.css( '.np-p-page-map-tile-inner')); }},
    prototypePage:             { get:   function ()     {  return element.all(by.css( '.tile-image')); }},




    pendingInvitesCount:     { get:   function ()     { return element.all(by.binding('user.email')); }},
    //return control with given name
    expectedControl:    { value: function (name) { return element(by.cssContainingText( '.np-c-grid-element', name));}},
    numberOfElementOnCanvas: { get:  function ()     { return element.all(by.css('.np-c-grid-element'));}},

    elementOnCanvasNamed:     { value:   function (name)     {
        return element.all(by.css('.np-c-grid-element[np-selected=true]')).filter( function(el) {
            return browser.executeScript('return angular.element(arguments[0]).scope().element.controlMd.catalogControlName;',
                el.getWebElement()).then(function(value){
                    return promise.fulfilled(value == name);
                })
        }).first();
    }},


    dragElementControlNamed:     { value:   function (title) {
        return element(by.css('.ng-scope[display-name=\"' + title + '\"]>.np-component-library-item'));
    }},



    // Header items
    btnAddFirstBlankPage:             { get:   function ()     {  return element(by.css( '#add-page-card-ABSOLUTE .np-e-add-page-tile-button')); }},
    btnAddFirstListReport:            { get:   function ()     {  return element(by.css( '#add-page-card-DEFAULT .np-e-add-page-tile-button')); }},


    btnAddBlankPage:             { get:   function ()     {  return element(by.css( '.np-p-page-map-add-page-btn')); }},
    btnAddBlankPagePopupBtn:     { get:   function ()     {  return element(by.css( '#map-view-add-page-popup-ABSOLUTE')); }},
    btnAddBlankPageFromTree:     { get:   function ()     {  return element(by.id( 'tree-add-page-popup-ABSOLUTE')); }},

    btnSelectThumbnail:           { get:   function ()     {  return element.all(by.repeater('choice in map.pageTypes'));}},
    //btnSelectThumbnail:           { get:   function ()     {  return element(by.src( 'data:image/png')); }},
    //btnSelectThumbnail:           { get:   function ()     {  return element(by.css( '[ng-click="map.createPage()"]')); }},
    iconToggleNavBar:   { get:   function ()     { return element(by.id('np-e-toggle-nav-icon'));}},

    iconDataModeler:   { get:   function ()     { return element(by.id('np-e-data-modeler-icon'));}},

    iconUndo:   { get:   function ()     { return element(by.id('np-e-undo-icon'));}},
    iconRedo:   { get:   function ()     { return element(by.id('np-e-redo-icon'));}},

    drpDwnTarget:{ get:   function ()     { return element.all(by.css('.np-p-data-selection'));}},

    lnkTarget: { get:   function ()     { return element.all(by.css('.np-s-selectbox-item'));}},

    targetTxt: { get:   function ()     { return element.all(by.css('.np-s-selectbox-toggle'));}},

    iconShareCurrentVersion: { get:   function ()     { return element(by.id('np-e-share-current-version-icon'));}},

    iconCreateResearchStudy:  { get:   function ()     { return element(by.id('np-e-create-research-study-icon'));}},

    iconPublish:{get: function() {return element(by.id('np-e-publish-icon'));}},

    iconPublishproject:{get: function() {return element(by.css('.np-e-publish-pubBtn'));}},

    iconDeletePageInTreeView:{get: function() {return element(by.css('.np-e-tree-handle-page-img.np-e-tree-handle-page-img-delete.ng-isolate-scope'));}},

    iconDeleteTab:{get: function() {return element(by.id('np-e-tree-handle-confMessage')).element(by.css('.ui-dialog-close')).element(by.css('.ui-button'));}},

    iconPagemapview:{get:   function ()     { return element(by.css('.np-e-header-page-map-icon.ng-isolate-scope'));}},

    pageLinksinProjectpage:          { get:   function ()     { return element(by.id('prototype-members')).all(by.repeater('screen in prototype.screens'));}},

    pageNumberinProjectPage: { value: function (number) { return this.pageLinksinProjectpage.get(number - 1);}},

    pointertoPageinTreeView:{get:   function ()     { return element(by.repeater('node in tree.nodes'));}},

    nameofPageinPagemap: { value:   function ()     { return element(by.id('np-p-page-map-grid')).element(by.id('np-p-screen-S0')).element(by.css('.np-p-page-map-tile-inner-screen-name-home')).getAttribute('value');}},

    // Top Left: Object Hierarchy

    pageLinks:          { get:   function ()     { return element(by.model('tree.nodes')).all(by.repeater('node in tree.nodes'));}},
    linkPageNumbered: { value: function (number) { return this.pageLinks.get(number - 1);}},
    linkAddPage:     { get:   function ()     { return element(by.css('.np-e-tree-add-page'));}},


    // Right: Canvas Element Properties


    propertyFieldNamed:  { value: function (name) {
        return element.all(by.repeater('property in propertyPanel.properties'))
            .all(by.attr('title',name))
            .first()
            .element(by.xpath('..'))
            .all(by.css('.np-p-data-input'))
            .first().all(by.css('*:first-child')).first();
    }},

    linkPageNumberedIsExpanded: { value: function (number) {
        return this.linkPageNumbered(number).getAttribute('data-collapsed').then( function(value) {
            return promise.fulfilled(value == 'false');
        });
    }},

    doesShowNavBar: { get:   function ()     {
        return this.iconNavBar.getAttribute('class').then( function(value) {
            return promise.fulfilled( value.indexOf('np-e-header-icon-active') > -1 );
        });
    }},


    popupCreateSnapshot:  { get:   function ()     { return element(by.id('snapshot-created-modal'));}},
    isOnPopupCreateSnapshot: { get:   function ()     {
        return this.iconPreviewMode.getAttribute('class').then( function(value) {
            return promise.fulfilled( value.indexOf('ng-hide') > -1 );
        });
    }},

    verifyPageNameInTreeview: { value: function (number) {
        return this.linkPageNumbered(number).getAttribute('data-collapsed').then( function(value) {
            return promise.fulfilled(value == 'false').then ( function() {
                return element(by.css('.np-e-tree-handle-page-name')).getAttribute('value');
            });
        });
    }},

    verifyPageNameinProjectpepage: { value: function (number) {
        return this.pageNumberinProjectPage(number).getAttribute('screen-name').then (function(value){
            return promise.fulfilled(value == "new name");
        });
    }},


    //actions
//    dismissErrorMessage: { value: function () { element(by.css('.ui-toast-close')).click();}},
    clickPage:          { value: function (name) { this.linkPage(name).click();}},
    clickLinkPageNumbered:  { value: function (number) { this.linkPageNumbered(number).click();}},
    clickLinkAddPage:          { value: function () { this.linkAddPage.click();}},
    clickTreeChildNamed:        { value: function (name) { this.treeChildNamed(name).click();}},
    clickIconDataModeler:   { value: function () { this.iconDataModeler.click();}},
    clickIconCreateResearchStudy:  { value: function () { this.iconCreateResearchStudy.click();}},
    clickIconShareCurrentVersion: { value: function () { this.iconShareCurrentVersion.click();}},
    clickIconToggleGrid:   { value: function () { this.iconToggleGrid.click();}},
    clickCanvas:{ value: function () { this.canvas.click();}},
    clickIconToggleSnapping:   { value: function () { this.iconSnapping.click();}},
    clickAddBlankPage: {   value: function () {
        this.btnAddBlankPage.click();
    }},
    clickAddBlankPagePopupBtn: {   value: function () {
        this.btnAddBlankPagePopupBtn.click();
    }},

    clickAddOneBlankPageFromTree: {   value: function () {
        this.btnAddBlankPageFromTree.click();
    }},


    clickAddFirstBlankPage: {   value: function () {
        this.btnAddFirstBlankPage.click();
    }},

    clickAddFirstListReport: {   value: function () {
        this.btnAddFirstListReport.click();
    }},

    clickBlankTemplate :{value: function () {
        this.btnSelectThumbnail.click();
    }},
    clickIconPublish: { value: function() {this.iconPublish.click();}},

    clickIconPublishhproject :{ value: function() {this.iconPublishproject.click();}},

    clickIconUndo: { value: function () { this.iconUndo.click();}},

    clickIconRedo: { value: function () { this.iconRedo.click();}},

    clickPageDrpDwn:{ value: function () { this.drpDwnTarget.last().click();}},

    clickPageData:{ value: function () { this.lnkTarget.last().click();}},

    clickPagenameinTreeView:{ value: function () { this.pointertoPageinTreeView.click();}},

    doubleClickToRenameInTreeView:{value:    function() { browser.actions().doubleClick(element(by.css('.np-e-tree-handle-page-name'))).perform();}},

    clearNameInTreeView:  { value: function () { element(by.css('.np-e-tree-handle-page-name')).getAttribute('value').clear();}},

    dragElementOntoCanvas:  {value: function (elem){
        browser.waitForAngular();

        var dnd_javascript = fs.readFileSync(path.resolve(__dirname, '../support/dragDropSimulator.js'));
        browser.executeScript("" + dnd_javascript);

        //Give the script some time to execute.
        browser.sleep(10000);
        browser.waitForAngular();
        browser.executeScript("jQuery(arguments[0]).simulateDragDrop({ dropTarget: '#canvasOverlay'});", elem.getWebElement());
        browser.waitForAngular();

    }},

    //Delete page tree view
    clickDeletePageInTreeView:   { value: function () { this.iconDeletePageInTreeView.click();}},
    clickDeleteTab:   { value: function () { this.iconDeleteTab.click();}},

    //page map view
    clickPageMapView:{ value: function () { this.iconPagemapview.click();}},

    enterDeleteKey:{value:    function() { browser.actions().sendKeys(protractor.Key.DELETE).perform();}},

    // ------------ Create Research Study Popup ----------------
    // elements
    dialogCreateResearchStudy: { get:   function ()     { return element(by.id('study-create-modal'));}},

    inputfieldName: { get:   function ()     {
        return element(by.id('study-create-modal')).element(by.css('.ui-input'));
    }},

    buttonCreateAndGotoResearch: { get:   function ()     {
        return element(by.id('study-create-modal')).element(by.css('.ui-dialog-close')).element(by.css('.ui-button'));
    }},

    // state evaluation methods
    dialogCreateResearchStudyIsActive: { value: function () {
        return this.dialogCreateResearchStudy.getAttribute('style').then( function(value) {
            return promise.fulfilled(value.indexOf('display: block') > -1);
        });
    }},

    // actions
    clickButtonCreateAndGotoResearch: { value: function () { this.buttonCreateAndGotoResearch.click();}},

    typeInNameField: { value: function (input) {
        browser.waitForAngular();
        this.inputfieldName.sendKeys(input);
        browser.waitForAngular();
    }},


        // Study Title on Research Page
    txtStudyTitle: { value:   function ()     { return element(by.css('.title-wrapper .title')).getText();}},

    // search for UI controls
    searchInputField: {
        get: function () {
            return element(by.css('.np-e-sidebar-search-inner'));
        }
    },

    typeSearchField: {
        value: function (input) {
            browser.waitForAngular();
            this.searchInputField.sendKeys(input);
            browser.waitForAngular()
        }
    },

    searchResultList: {
        get: function () {
            return element.all(by.repeater('component in controls'))
        }
    },

    searchResult:    {
        get: function () {
            return element.all(by.repeater('component in controls')).getAttribute('display-name')
        }
    },

    changeCss: {
        value: function () {
            var control = browser.driver.findElement(by.css('.ui-video-slider-container'));
            browser.driver.executeScript("arguments[0].style.height = '239px'; ", control).then(function () {

            });
        }
    },

    clickCloseOverlay:  {   value: function()   {this.firstTimeVid.click();}},

    firstTimeVid:       {  get: function () { return element.all(by.css('[ng-click="help.closeHelpOverlay()"]'));}},

    RedDottedLine: {
        get: function() {
            return element(by.css('.np-c-grid--hidden>.np-c-grid-element')).getCssValue('outline');
        }
    },
    typeNewName: { value: function (input) {
        browser.waitForAngular();
        browser.sleep(1000);
        this.inputForRename.sendKeys(input);
        browser.waitForAngular();
    }},

    inputForRename: { get:   function ()     {
        return element(by.css('.np-e-tree-handle-page-name'));
    }}


});

module.exports = UiComposer;
