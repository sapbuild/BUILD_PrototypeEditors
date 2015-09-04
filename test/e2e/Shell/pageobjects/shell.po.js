'use strict';

var Shell = function (value, cb) {
    var url = value.charAt(0) == '/' ? value : "/" + value;
    browser.get(url);
    var width = 1800;
    var height = 1000;
    browser.driver.manage().window().setSize(width, height);
    if (typeof cb === 'function') cb()
};

Shell.prototype = Object.create({}, {


    // <editor-fold desc="Selectors">

    menuHome: { get: function () {
        return element(by.css('[type="home"]'));
    }},

    menuProject: { get: function () {
        return element(by.css('[type="project"]'));
    }},


    menuFiles: { get: function () {
        return element(by.css('[type="docs"]'));
    }},

    menuSettings: { get: function () {
        return element(by.css('[type="settings"]'));
    }},

    // </editor-fold>

    // <editor-fold desc="Actions">

    clickMenuProject: { value: function () {
        this.menuProject.click();
    }},

    clickMenuHome: { value: function () {
        this.menuHome.click();
    }},

    clickMenuFiles: { value: function () {
        this.menuFiles.click();
    }},

    clickMenuSettings: { value: function () {
        this.menuSettings.click();
    }}

    // </editor-fold>


});

module.exports = Shell;
