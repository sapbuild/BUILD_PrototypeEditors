'use strict';
require('norman-server-tp');
var propertyPanel = require('../../pageobjects/uicomposerPropertyPanel.po.js');
var chai = require('norman-testing-tp').chai;
var chaiAsPromised = require('norman-testing-tp')['chai-as-promised'];
chai.should();                          // Necessary for Q.all().should to work
chai.use(chaiAsPromised);
var expect = chai.expect;
var propertyPanel = new propertyPanel('');

module.exports = function() {

    this.When(/^I type "([^"]*)" into the property input field "([^"]*)" in "([^"]*)" section$/, function (input, fieldname, section, callback) {
        browser.waitForAngular();
        propertyPanel.TypePropertyInputValue(section, fieldname, input);
        browser.waitForAngular();
        callback();
    });

    this.Then(/^The value of property input field "([^"]*)" is "([^"]*)" in "([^"]*)" section$/, function (fieldname, input, section, callback) {
        browser.waitForAngular();
        expect(propertyPanel.propertyInputField(section, fieldname).getAttribute('value')).to.eventually.equal(input).and.notify(callback);
    });

    this.When(/^I click on the property toggle field "([^"]*)" in "([^"]*)" section$/, function (fieldname,section, callback) {
        browser.waitForAngular();
        propertyPanel.clickPropertyToggleField(section,fieldname);
        browser.waitForAngular();
        callback();
    });

    this.Then(/^The property toggle field "([^"]*)" is inactive in "([^"]*)" section$/, function (fieldname, section, callback) {
        browser.waitForAngular();
        expect(propertyPanel.propertyToggleFieldNamedIsChecked(section, fieldname)).to.eventually.be.false.and.notify(callback);
    });

    this.Then(/^The property toggle field "([^"]*)" is active in "([^"]*)" section$/, function (fieldname, section, callback) {
        browser.waitForAngular();
        expect(propertyPanel.propertyToggleFieldNamedIsChecked(section, fieldname)).to.eventually.be.true.and.notify(callback);
    });

    this.When(/^I click on the Show More Property icon$/, function (callback) { 
        browser.waitForAngular();
        propertyPanel.clickShowMoreIcon(); 
        browser.waitForAngular(); 
        callback(); 
    });

    this.When(/^I click on the Show Less Property icon$/, function (callback) {
        browser.waitForAngular();
        propertyPanel.clickShowLessIcon();
        browser.waitForAngular();
        callback();
    });


    this.Then(/^The property panel displays more properties$/, function (callback) {
        browser.waitForAngular();
        expect(propertyPanel.showLessIcon.isPresent()).to.eventually.be.true.and.notify(callback)
    });

    this.Then(/^The property panel displays less properties$/, function (callback) {
        browser.waitForAngular();
        expect(propertyPanel.showMoreIcon.isPresent()).to.eventually.be.true.and.notify(callback)
    });

    this.Then(/^The "([^"]*)" DDLB has "([^"]*)" value selected under "([^"]*)" section$/, function(name, value, section, callback) {
        expect(propertyPanel.getPropertyDDLBFieldValue(section, name)).to.eventually.equal(value).and.notify(callback)
    });

    this.When(/^I display the select options for the property "([^"]*)" DDLB under "([^"]*)" section$/, function(name, section, callback) {
        browser.waitForAngular();
        propertyPanel.clickPropertyDDLBFieldValue(section, name);
        browser.waitForAngular();
        callback();
    });

    this.When(/^I select option "([^"]*)" in the property "([^"]*)" DDLB under "([^"]*)" section$/, function(value, name, section, callback) {
        browser.waitForAngular();
        propertyPanel.selectPropertyDDLBValue(section, name, value);
        browser.waitForAngular();
        callback();
    });

};





