'use strict';
require('norman-server-tp');
var HeaderIcons = require('../../pageobjects/uicomposerHeaderIcons.po.js');
var chai = require('norman-testing-tp').chai;
var chaiAsPromised = require('norman-testing-tp')['chai-as-promised'];
chai.should();                          // Necessary for Q.all().should to work
chai.use(chaiAsPromised);
var expect = chai.expect;
var headerIconPage = new HeaderIcons('');


module.exports = function() {

    this.When(/^I click on Phone Portrait icon$/, function (callback) {
        headerIconPage.clickIconPhonePortrait();
        browser.waitForAngular();
        callback();
    });

    this.Then(/^Phone Portrait mode is active$/, function (callback) {
        Promise.all([
            expect(headerIconPage.isInPhonePortraitModeOn, 'isInPhonePortraitModeOn').to.eventually.be.true,
            expect(headerIconPage.isInTabletPortraitModeOff, 'isInTabletPortraitModeOff').to.eventually.be.true,
            expect(headerIconPage.isInDesktopModeOff, 'isInDesktopModeOff').to.eventually.be.true
        ]).should.notify(callback);
    });

    this.When(/^I click on Tablet Portrait icon$/, function (callback) {
        headerIconPage.clickIconTabletPortrait();
        browser.waitForAngular();
        callback();
    });

    this.Then(/^Tablet Portrait mode is active$/, function (callback) {
        Promise.all([
            expect(headerIconPage.isInPhonePortraitModeOff, 'isInPhonePortraitModeOff').to.eventually.be.true,
            expect(headerIconPage.isInTabletPortraitModeOn, 'isInTabletPortraitModeOn').to.eventually.be.true,
            expect(headerIconPage.isInDesktopModeOff, 'isInDesktopModeOff').to.eventually.be.true
        ]).should.notify(callback);
    });

    this.When(/^I click on Desktop icon$/, function (callback) {
        headerIconPage.clickIconDesktop();
        browser.waitForAngular();
        callback();
    });

    this.Then(/^Desktop mode is active$/, function (callback) {
        Promise.all([
            expect(headerIconPage.isInPhonePortraitModeOff, 'isInPhonePortraitModeOff').to.eventually.be.true,
            expect(headerIconPage.isInTabletPortraitModeOff, 'isInTabletPortraitModeOff').to.eventually.be.true,
            expect(headerIconPage.isInDesktopModeOn, 'isInDesktopModeOn').to.eventually.be.true
        ]).should.notify(callback);
    });

    this.When(/^I click on Edit icon$/, function (callback) {
        headerIconPage.clickIconEditMode();
        browser.waitForAngular();
        callback();
    });

    this.Then(/^Edit mode is active$/, function (callback) {
        Promise.all([
            expect(headerIconPage.isInPreviewMode, 'isInPreviewMode').to.eventually.be.false,
            expect(headerIconPage.isInEditMode, 'isInEditMode').to.eventually.be.true
        ]).should.notify(callback);
    });

    this.When(/^I click on Preview icon$/, function (callback) {
        headerIconPage.clickIconPreviewMode();
        browser.waitForAngular();
        callback();
    });

    this.Then(/^Preview mode is active$/, function (callback) {
        Promise.all([
            expect(headerIconPage.isInPreviewMode, 'isInPreviewMode').to.eventually.be.true,
            expect(headerIconPage.isInEditMode, 'isInEditMode').to.eventually.be.false
        ]).should.notify(callback);
    });


    this.When(/^I click on ruler icon$/, function(callback) {
        headerIconPage.clickIconRuler();
        callback();
    });

    this.When(/^I click on snapping icon$/, function(callback) {
        headerIconPage.clickIconSnapping();
        callback();
    });

    this.Then(/^There is a X ruler shown$/, function(callback) {
        expect(headerIconPage.showRulerX.isPresent()).to.eventually.be.true.and.notify(callback);
    });

    this.Then(/^There is a Y ruler shown$/, function(callback) {
        expect(headerIconPage.showRulerY.isPresent()).to.eventually.be.true.and.notify(callback);
    });

    this.Then(/^snapping icon is not active$/, function(callback){
       expect(headerIconPage.isSnappingIconOff, 'isSnappingIconOff').to.eventually.be.true.and.notify(callback);
    });

    this.Then(/^snapping icon is active$/, function(callback){
        expect(headerIconPage.isSnappingIconOn, 'isSnappingIconOn').to.eventually.be.true.and.notify(callback);
    });

    this.When(/^I click data modeler icon$/, function (callback) {
        headerIconPage.clickIconDataModeler();
        browser.waitForAngular();
        callback();
    });

    this.When(/^I click the brush icon$/, function (callback) {
        headerIconPage.clickBrushIcon();
        browser.waitForAngular();
        browser.sleep(3000);
        callback();
    });

    this.When(/^I click page map icon$/, function (callback) {
        headerIconPage.clickPageMapIcon();
        browser.waitForAngular();
        callback();
    });

    this.Then(/^page map page displayed$/, function(callback) {
        expect(headerIconPage.pageMapPage.isPresent()).to.eventually.be.true.and.notify(callback);
    });
    this.Then(/^I click grid icon$/, function(callback) {
        headerIconPage.clickIconToggleGrid();
        callback();
    });

    this.When(/^I click on the the left side bar icon$/, function (callback) {
        headerIconPage.clickIconLeftSidebar();
        browser.waitForAngular();
        callback();
    });

    this.When(/^Left side bar is not visible$/, function (callback) {
        expect(headerIconPage.noLeftSidebarOnCanvas.isPresent()).to.eventually.be.true.and.notify(callback);
        browser.waitForAngular();
    });
    //Side bar
    this.Then(/^I click on the the right side bar icon$/, function (callback) {
        headerIconPage.clickIconRightSidebar();
        browser.sleep(1000);
        browser.waitForAngular();
        callback();
    });

    this.Then(/^Right side bar is not visible$/, function (callback) {
        expect(headerIconPage.noRightSidebarOnCanvas.isPresent()).to.eventually.be.true.and.notify(callback);
        browser.waitForAngular();
    });

    this.Then(/^Left side bar is visible$/, function (callback) {
        expect(headerIconPage.leftSidebarOnCanvas.isPresent()).to.eventually.be.true.and.notify(callback);
        browser.waitForAngular();
    });

    this.Then(/^Right side bar is visible$/, function (callback) {
        browser.waitForAngular();
        expect(headerIconPage.rightSidebarOnCanvas.isPresent()).to.eventually.be.true.and.notify(callback);
        browser.waitForAngular();
    });
  // Zoom
    this.When(/^I click on the zoom icon$/, function (callback) {
        browser.waitForAngular();
        headerIconPage.clickIconZoom();
        browser.waitForAngular();
        callback();
    });

    this.Then(/^I click on the full width option$/, function (callback) {
        browser.waitForAngular();
        headerIconPage.clickIconFullWidth();
        browser.waitForAngular();
        callback();
    });

    this.Then(/^I check the zoom percentage for the full width option$/, function (callback) {
        browser.waitForAngular();
        expect(headerIconPage.verifyZoomPercent()).to.eventually.be.true.and.notify(callback);
        browser.waitForAngular();
    });

    this.Then(/^I click on the fit width option$/, function (callback) {
        browser.waitForAngular();
        headerIconPage.clickIconFitWidth();
        browser.waitForAngular();
        callback();
    });


    this.Then(/^I compare the zoom percentage value of fit width and full width to verify it$/, function (callback) {
        //Obtain the Zoom percentage and store it in the variable
        var a = element(by.css('.ui-zoom')).element(by.binding("sliderModel.value")).getText().then(function (a) {
            console.log("Value in a: " + a);
            headerIconPage.clickIconZoom();
            headerIconPage.clickIconFullWidth();
            //Obtain the Zoom percentage and store it in the variable
            var b = element(by.css('.ui-zoom')).element(by.binding("sliderModel.value")).getText().then(function (b) {
                console.log("Value in b: " + b);
                //Compare both the variables to not to be equal
                expect(a).to.not.equal(b);
            });

        });
        callback();
    });

    this.Then(/^I compare the canvas pixel value of fit width and full width to verify it$/, function (callback) {
        headerIconPage.clickIconZoom();
        headerIconPage.clickIconFitWidth();
        var a = element(by.css('.np-e-canvas-container-inner')).getAttribute("style").then(function (a) {
            console.log("Value in a: " + a);
            headerIconPage.clickIconZoom();
            headerIconPage.clickIconFullWidth();
            var b = element(by.css('.np-e-canvas-container-inner')).getAttribute("style").then(function (b) {
                console.log("Value in b: " + b);
                expect(a).to.not.equal(b);
            });

        });
        callback();
    });


    this.Then(/^I click the plus sign of the slider once inside zoom$/, function (callback) {
        headerIconPage.clickIconZoom();
        browser.waitForAngular();
        headerIconPage.clickIconSlidePlus();
        browser.sleep(1000);
        browser.waitForAngular();
        callback();
    });

    this.Then(/^I compare the zoom percentage value obtained after clicking the plus sign once against full width and verify it$/, function (callback) {
        var a = element(by.css('.ui-zoom')).element(by.binding("sliderModel.value")).getText().then(function (a) {
            console.log("Value in a: " + a);
            headerIconPage.clickIconFullWidth();
            var b = element(by.css('.ui-zoom')).element(by.binding("sliderModel.value")).getText().then(function (b) {
                console.log("Value in b: " + b);
                expect(a).to.not.equal(b);
                expect(a).to.be.above(b);
            });

        });
        callback();
    });


 };





