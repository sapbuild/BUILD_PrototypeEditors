'use strict';


var Shell = require('../../pageobjects/shell.po.js');
var chai = require('norman-testing-tp').chai;
var assert = chai.assert;
var chaiAsPromised = require('norman-testing-tp')['chai-as-promised'];
chai.use(chaiAsPromised);
var expect = chai.expect;
var path = require('path');
var sleepBeforeCheck = 2000;

var shellPage = new Shell('');

module.exports = function () {

    // <editor-fold desc="Givens">
    // </editor-fold>

    // <editor-fold desc="Whens">
    // </editor-fold>

    // <editor-fold desc="Thens">

    this.Then(/^I click on Home in the menu$/, function (callback) {
        browser.waitForAngular();
        shellPage.clickMenuHome();
        browser.waitForAngular();
        callback();
    });

    this.Then(/^I click on Project in the menu$/, function (callback) {
        browser.waitForAngular();
        shellPage.clickMenuProject();
        browser.waitForAngular();
        callback();
    });

    this.Then(/^I click on Files in the menu$/, function (callback) {
        browser.waitForAngular();
        shellPage.clickMenuFiles();
        browser.waitForAngular();
        callback();
    });

    this.Then(/^I click on Settings in the menu$/, function (callback) {
        browser.waitForAngular();
        shellPage.clickMenuSettings();
        browser.waitForAngular();
        callback();
    });


    // </editor-fold>


};
