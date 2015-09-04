'use strict';

var SmartTemplate = function (value, cb) {
    if (value.length > 0) {
        var url = value.charAt(0) == '/' ? value : "/" + value;
        console.log(url);
        browser.get(url);
    }
    if (typeof cb === 'function') cb()
};

SmartTemplate.prototype = Object.create({}, {
    // <editor-fold desc="Selectors">
    mainEntityDropDownList: { get: function () {
        return element(by.css('[ng-change="propertyPanel.onMainEntityChange()"]'));
    }},

//    outlineChildNamed: { get: function (name) {
//        return element.all(by.model('tree.nodes')).element(by.cssContainingText('[ng-click="node.select()"]', name));
//    }},

    propertyFilterOnDropDownList: { get: function () {
        return element(by.css('(ng-click="toggleList()"]'));
    }},

    linkMapPage: { get: function (name) {
        return element.all(by.repeater('screen in map.unconnected track by $index')).filter(function (el) {
            return el.getText().then(function (value) {
                return value == name;
            })
        }).first();
    }},

    // </editor-fold>


    // <editor-fold desc="Actions">

    enterMainEntity: { value: function (entity) {
        browser.waitForAngular();
        this.mainEntityDropDownList.sendKeys(entity);
    }},

    clickOutlineTreeChildNamed: { value: function (name) {
        browser.waitForAngular();
        var UiElements = element.all(by.cssContainingText('.angular-ui-tree-handle', name)).map(function (elm) {
            return elm;
        });
        UiElements.then(function (result) {
            for (var i = 0; i < result.length; i++) {
                var text = result[i].element(by.css('.np-e-tree-handle-text')).getText();
                console.log('result[i] text: ' + text);
                if(text == name)
                {
                    result[i].click()
                }
            }
        });

    }},

    propertyFilterOn: { value: function (property) {
        browser.waitForAngular();
        this.propertyFilterOnDropDownList.sendKeys(property);
    }},

    clickPropertyFilter: { value: function () {
        browser.waitForAngular();
        this.propertyFilterOnDropDownList.click();
    }}

    // </editor-fold>


});

module.exports = SmartTemplate;
