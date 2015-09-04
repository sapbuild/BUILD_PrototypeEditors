'use strict';
require('norman-server-tp');
var UiComposer = require('../../pageobjects/uicomposer.po.js');
var chai = require('norman-testing-tp').chai;
var chaiAsPromised = require('norman-testing-tp')['chai-as-promised'];
chai.should();                          // Necessary for Q.all().should to work
chai.use(chaiAsPromised);
var expect = chai.expect;
var composerPage = new UiComposer('');


var tmpPageCount = 0;

module.exports = function() {
    this.Given(/^I am on the Landing Page for Composer$/, function (callback) {

        browser.waitForAngular();

        element.all(by.css('[ng-click="help.closeHelpOverlay()"]')).then(function(items) {
            var count = items.length;
            if(count == 1){
                browser.waitForAngular();
                composerPage.changeCss();
                browser.waitForAngular();
                composerPage.clickCloseOverlay();
                browser.waitForAngular();
             }
            expect(browser.getTitle()).to.eventually.equal('BUILD').and.notify(callback);
        });

    });

    this.When(/^I click on thumbnail of page "([^"]*)"$/, function (page, callback) {
        //composerPage.dismissErrorMessage();
        browser.waitForAngular();
        composerPage.clickPage(page);
        browser.waitForAngular();
        callback();
    });

    this.Then(/^I am in ui composer canvas view$/, function (callback) {
        expect(composerPage.canvas.isPresent()).to.eventually.be.true.and.notify(callback);
    });

    this.Then(/^ui composer preview screen displayed$/, function (callback) {
        browser.waitForAngular();
        expect(composerPage.previewModeScreen.isPresent()).to.eventually.be.true.and.notify(callback);
    });

    this.When(/^I drag and drop a control of type "([^"]*)" onto the canvas$/, function (title, callback) {
        composerPage.dragElementOntoCanvas(composerPage.dragElementControlNamed(title));
        browser.waitForAngular();
        callback();
    });

    this.Then(/^A control of type "([^"]*)" is on the canvas$/, function (title, callback) {
        expect(composerPage.elementOnCanvasNamed(title).isPresent()).to.eventually.be.true.and.notify(callback);
    });

    this.Then(/^The control is not on the canvas$/, function (callback) {
        expect(composerPage.numberOfElementOnCanvas.count()).to.eventually.equal(1).and.notify(callback);

    });
    this.When(/^I click on Undo button$/, function (callback) {
        composerPage.clickIconUndo();
        browser.waitForAngular();
        browser.sleep(5000);
        callback();
    });

    this.When(/^I click on Redo button$/, function (callback) {
        composerPage.clickIconRedo();
        browser.sleep(5000);
        callback();
    });

    this.When(/^I click on the Add Page link$/, function (callback) {
        tmpPageCount = composerPage.pageLinks.count();
        composerPage.pageLinks.count().then(function(value){
            tmpPageCount = value;
            composerPage.clickLinkAddPage();
            callback();
        });
    });

    this.Then(/^A new page is created$/, function (callback) {
        var newVal = tmpPageCount + 1;
        expect(composerPage.pageLinks.count()).to.eventually.equal(newVal).and.notify( function () {
            tmpPageCount = 0;
            callback();
        });
    });

    this.When(/^I wait for "(\d+)" ms$/, function (number, callback) {
        browser.sleep(Number(number));
        callback();
    });

    this.When(/^I click on the link for page "(\d+)"$/, function (number, callback) {
        composerPage.clickLinkPageNumbered(number);
        callback();
    });

    this.Then(/^I am on page "(\d+)"$/, function (number, callback) {
        expect(composerPage.linkPageNumberedIsExpanded(number)).to.eventually.be.true.and.notify(callback);
    });


    this.Then(/^There are "(\d+)" pages$/, function (number, callback) {
        expect(composerPage.pageLinks.count()).to.eventually.equal(Number(number)).and.notify(callback);
    });

    this.When(/^I click on Create Research Study icon$/, function (callback) {
        composerPage.clickIconCreateResearchStudy();
        callback();
    });

    this.Then(/^I am on the Create Research Study popup$/, function (callback) {
        expect(composerPage.dialogCreateResearchStudyIsActive()).to.eventually.be.true.and.notify(callback);
    });

    this.When(/^I type "([^"]*)" into the Name field$/, function (input, callback) {
        browser.waitForAngular();
        composerPage.typeInNameField(input);
        callback();
    });

    this.When(/^I click on button Create and Go To Research$/, function (callback) {
        browser.waitForAngular();
        composerPage.clickButtonCreateAndGotoResearch();
        callback();
    });

    this.Then(/^The Study Name is "([^"]*)"$/, function (name, callback) {
        expect(composerPage.txtStudyTitle()).to.eventually.equal(name).and.notify(callback);
    });

    this.Then(/^The value of property input field "([^"]*)" is "([^"]*)"$/, function (fieldname, input, callback) {
        expect(composerPage.propertyFieldNamed(fieldname).getAttribute('value')).to.eventually.equal(input).and.notify(callback);
    });

    this.When(/^I click on the tree child named "([^"]*)"$/, function (name, callback) {
        composerPage.clickTreeChildNamed(name);
        callback();
    });

    this.When(/^I add Page Target to the Link on Canvas$/, function (callback) {
        browser.waitForAngular();
        composerPage.clickPageDrpDwn();
        browser.waitForAngular();
        composerPage.clickPageData();
        browser.waitForAngular();
        callback();
    });

    this.Then(/^Link Target is "([^"]*)"$/, function (link ,callback) {
        browser.waitForAngular();
        expect(composerPage.targetTxt.last().getText()).to.eventually.equal(link).and.notify(callback);
    });


    this.When(/^Create "([^"]*)" Blank Prototype Pages$/, function (num ,callback) {
        var times = parseInt(num);
        for(var i = 0; i < times; i++) {
            composerPage.clickAddBlankPage();
            browser.sleep(500);
            // TODO check if popup is visible
            composerPage.clickAddBlankPagePopupBtn();
            browser.sleep(1000);
        }
        callback();
    });

    this.When(/^I click Add button to add first blank page$/, function (callback) {
        browser.waitForAngular();
        composerPage.clickAddFirstBlankPage();
        browser.waitForAngular();
        callback();
    });

    this.When(/^I click Add button to add first list report$/, function (callback) {
        browser.waitForAngular();
        composerPage.clickAddFirstListReport();
        browser.waitForAngular();
        callback();
    });



    this.Then(/^There are "([^"]*)" Pages Created$/, function (num, callback) {
        expect(composerPage.protoTiles.count()).to.eventually.equal(parseInt(num)).and.notify(callback);
    });

    this.Given(/^I am in the ui composer canvas view$/, function (callback) {
        expect(composerPage.canvas.isPresent()).to.eventually.be.true.and.notify(callback);

    });

    this.Then(/^I click the Publish button$/, function (callback) {
        composerPage.clickIconPublish();
        browser.waitForAngular();
        callback();
    });


    this.Then(/^I click on the publish project$/, function (callback) {
        composerPage.clickIconPublishhproject();
        browser.waitForAngular();
        var pubUrl = element(by.id('np-e-publish-urltxt')).getAttribute('value');
        //instead opening a new tab just use the main tab to navigate to the prototype URL:
            browser.driver.get(pubUrl)
            browser.sleep(500);
        callback();
    });


    this.Then(/^I verify that I see the button$/, function (callback) {
        browser.driver.wait(function() {    //this will now wait until the button appears are fail out after 30 seconds
            return browser.driver.isElementPresent(by.css(".sapMBtnContent"));
        });
        //This is used for validation , to see if a button from the composer is displayed in a new tab
        expect(browser.driver.findElement(by.className('sapMBtnContent')).isEnabled()).to.eventually.be.true.and.notify(callback);

    });

    this.When(/^I delete page 1 from the tree view$/, function (callback) {
        composerPage.clickDeletePageInTreeView();
        callback();
    });
    this.Then(/^I click delete tab$/, function (callback) {
        composerPage.clickDeleteTab();
        callback();
    });

    this.Then(/^I enter delete key from keyboard to delete page$/, function(callback){
        browser.waitForAngular();
        //composerPage.enterDeleteKey().to.eventualy.be.true.and.notify(callback);
        composerPage.enterDeleteKey();
        //browser.actions().sendKeys(protractor.Key.DELETE).perform();
        browser.waitForAngular();
        callback();
    });

    this.Then(/^There are "(\d+)" pages in tree view$/, function (number, callback) {
        expect(composerPage.pageLinks.count()).to.eventually.equal(Number(number)).and.notify(callback)
    });

    this.Then(/^I see the View All Map Icon$/, function (callback) {
        composerPage.clickPageMapView();
        callback();
    });


    this.Then(/^There are "(\d+)" pages in page map view$/, function (number, callback) {
        browser.waitForAngular();
        expect(composerPage.protoTiles.count()).to.eventually.equal(Number(number)).and.notify(callback)
    });


    this.Then(/^There are "(\d+)" pages in prototype page$/, function (number, callback) {
        browser.waitForAngular();
        expect(composerPage.prototypePage.count()).to.eventually.equal(Number(number)).and.notify(callback)
    });

    this.When(/^I enter a search value "([^"]*)"$/, function (text, callback) {
        browser.waitForAngular();
        composerPage.typeSearchField(text);
        browser.waitForAngular();

        callback();
    });

    this.Then(/^There are "(\d+)" search results$/, function(number, callback) {
        expect(composerPage.searchResultList.count()).to.eventually.equal(Number(number)).and.notify(callback);
    });

    this.Then(/^check each search result contains "([^"]*)"$/, function(text, callback) {
        var search = new RegExp(text, 'i');
        expect(composerPage.searchResult).to.eventually.match(search).and.notify(callback)
    });
    this.When(/^I add page 4 from the tree view$/, function (callback) {
        composerPage.clickLinkAddPage();
        browser.waitForAngular();
        composerPage.clickAddOneBlankPageFromTree();
        browser.sleep(5000);
        callback();
    });

    this.When(/^I click on ruler icon$/, function(callback) {
        composerPage.clickIconRuler();
        callback();
    });

    this.Then(/^There is a X ruler shown$/, function(callback) {
        expect(composerPage.showRulerX.isPresent()).to.eventually.be.true.and.notify(callback);
    });

    this.Then(/^There is a Y ruler shown$/, function(callback) {
        expect(composerPage.showRulerY.isPresent()).to.eventually.be.true.and.notify(callback);
    });

    this.Then(/^I click the canvas$/, function(callback) {
        composerPage.clickCanvas();
        browser.sleep(500);
        callback();
    });

    this.Then(/^I verify they is no red dotted line present around the controll$/, function(callback) {
        expect(composerPage.RedDottedLine.isPresent()).to.eventually.be.true.and.notify(callback);

    });

    this.When(/^I Double click to rename a page in the tree view$/, function (callback) {
        browser.waitForAngular();
        composerPage.doubleClickToRenameInTreeView();
        browser.waitForAngular();
        callback();
    });

    this.When(/^I enter "([^"]*)"$/, function (input,callback) {
        browser.waitForAngular();
        composerPage.clearNameInTreeView();
        browser.waitForAngular();
        browser.sleep(1000);
        composerPage.typeNewName(input);
        browser.waitForAngular();
        callback();
    });

    this.Then(/^The page "(\d+)" Name in tree view is "([^"]*)"$/, function (number,name,callback) {
        browser.waitForAngular();
        browser.sleep(1000);
        expect(composerPage.verifyPageNameInTreeview(number)).to.eventually.equal(name).and.notify(callback);
        browser.waitForAngular();
    });


    this.Then(/^I click on the pagemapview icon$/, function (callback) {
        browser.waitForAngular();
        composerPage.clickPageMapView();
        browser.waitForAngular();
        browser.sleep(1000);
        callback();
    });

    this.Then(/^I verify the name of the page "(\d+)" is changed in projectpage$/, function (number,callback) {
        browser.waitForAngular();
        expect(composerPage.verifyPageNameinProjectpepage(number)).to.eventually.be.true.and.notify(callback);
        browser.waitForAngular();
        browser.sleep(1000);
        callback();
    });

    this.Then(/^The page name in pagemapview is verified as "([^"]*)"$/, function (name, callback) {
        browser.waitForAngular();
        browser.sleep(300);
        expect(composerPage.nameofPageinPagemap()).to.eventually.equal(name).and.notify(callback);
        browser.waitForAngular()
    });

    this.Then(/^I click on the pagename in the tree view$/, function (callback) {
        browser.waitForAngular();
        composerPage.clickPagenameinTreeView();
        browser.waitForAngular();
        browser.sleep(1000);
        callback();
    });
 };
