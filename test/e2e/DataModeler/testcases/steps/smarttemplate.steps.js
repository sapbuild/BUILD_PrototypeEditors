'use strict';


var SmartTemplate = require('../../pageobjects/smarttemplate.po.js');
var chai = require('norman-testing-tp').chai;
var assert = chai.assert;
var chaiAsPromised = require('norman-testing-tp')['chai-as-promised'];
chai.use(chaiAsPromised);
var expect = chai.expect;
var path = require('path');
var sleepBeforeCheck = 2000;

var smarttemplatePage = new SmartTemplate('');

module.exports = function () {

// <editor-fold desc="Givens">

    this.Given(/^I am on smart template page$/, function (callback) {
        browser.waitForAngular();
        expect(browser.driver.getCurrentUrl()).to.eventually.match(/ui-composer/).and.notify(callback);
    });

    this.Given(/^I am on Page map page$/, function (callback) {
        browser.waitForAngular();
        expect(browser.driver.getCurrentUrl()).to.eventually.match(/page-map/).and.notify(callback);
    });



// </editor-fold>

// <editor-fold desc="Whens">


// </editor-fold>

// <editor-fold desc="Thens">

    this.Then(/^I choose main Entity as "([^ .]*)"$/, function (entityName, callback) {
        browser.waitForAngular();
        smarttemplatePage.enterMainEntity(entityName);
        browser.waitForAngular();
        callback();
    });

    this.Then(/^I click on outline item named "([^ .]*)"$/, function (itemName, callback) {
        browser.waitForAngular();
        smarttemplatePage.clickOutlineTreeChildNamed(itemName);
        browser.waitForAngular();
        callback();
    });

    this.Then(/^I choose to filter on property named "([^ .]*)"$/, function (propertyName, callback) {
        browser.waitForAngular();
        smarttemplatePage.propertyFilterOn(propertyName);
        browser.waitForAngular();
        callback();
    });

    this.Then(/^I click on Home in the menu$/, function (callback) {
        browser.waitForAngular();
        smarttemplatePage.clickMenuHome();
        browser.waitForAngular();
        callback();
    });

    this.Then(/^In Properties I click on Main Object Dropdown$/, function (callback) {
        browser.waitForAngular();
        smarttemplatePage.clickPropertyFilter();
        browser.waitForAngular();
        callback();
    });




// </editor-fold>

};
