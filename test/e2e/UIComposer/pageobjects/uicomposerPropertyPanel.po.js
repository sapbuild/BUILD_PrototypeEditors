'use strict';
var promise = protractor.promise;

var propertyPanel = function (value, cb) {
    if(value.length > 0){
        var url = value.charAt(0) == '/' ? value : '/' + value;
        browser.get(url);
    }
    if (typeof cb === 'function') { cb(); }
};

propertyPanel.prototype = Object.create({}, {
    // HELPER
    typeIntoInputField: { value: function (el, input) {
        el.clear();
        el.sendKeys(input);
    }},

    // Canvas Element Properties

    //showMoreIcon: { get : function(){ return element(by.css('.np-p-showmore-ind'))}},

    showMoreIcon: { get : function(){ return element(by.css('.prototype-assets--images--show_more'))}},

    //showMoreSeparator:{get: function(){ return element(by.css('.np-p-property-sep'))}},

    showLessIcon:{get: function(){ return element(by.css('.prototype-assets--images--show_less'))}},

    propertyFieldText: { value: function (section, name) { return this.propertiesSectionPath(section).element(by.cssContainingText('.np-p-data-title', name));}},

    propertiesSectionPath: { value: function (name) { return element(by.cssContainingText('.np-p-properties-sidebar-title', name)).element(by.xpath('..'));}},

    propertyInputField: {value: function(section, name) {
        switch (section) {
            case 'PROPERTIES':
                return this.propertyFieldText(section, name).element(by.xpath('..')).element(by.css('.np-p-data-input')).element(by.tagName('input'));
                break;
            case 'ACTIONS':
                return this.propertyFieldText(section, name).element(by.xpath('..')).element(by.css('.np-p-data-event-input'));
                break;
        }
    }},

    propertyDDLBField: {value: function(section, name) {
        switch (section) {
            case 'PROPERTIES':
                return this.propertyFieldText(section, name).element(by.xpath('..')).element(by.css('.np-s-selectbox'));
                break;
            case 'ACTIONS':
                return this.propertyFieldText(section, name).element(by.xpath('..')).element(by.css('.np-p-data-selection'));
                break;
        };
    }},

    propertyDDLBFieldOptions: {value: function(section, name, value) {
        switch (section) {
            case 'PROPERTIES':
                return this.propertyDDLBField(section,name).element(by.cssContainingText('.np-s-selectbox-item-li', value));
                break;
            case 'ACTIONS':
                return this.propertyDDLBField(section,name).element(by.cssContainingText('.np-s-selectbox-item', value));
                break;
        }
    }},

    PropertyDDLBFieldValue: {value: function(section, name) {
        return this.propertyDDLBField(section,name).element(by.tagName('a'))
    }},

    propertyToggleField: {value: function(section, name) {
        switch (section) {
            case 'PROPERTIES':
                return this.propertyFieldText(section, name).element(by.xpath('..')).element(by.css('.np-p-data-input')).element(by.tagName('span'));
                break;
            //TODO add logic for others
            case 'ACTIONS':
                break;
        }
    }},

// action

    clickShowMoreIcon: { value: function(){ return this.showMoreIcon.click()}},

    clickShowLessIcon: { value: function(){ return this.showLessIcon.click()}},

    getPropertyDDLBFieldValue: {value: function(section, name) {
        return this.PropertyDDLBFieldValue(section,name).getText()
    }},

    clickPropertyDDLBFieldValue:{value: function(section, name){
      return this.PropertyDDLBFieldValue(section, name).click();
    }},

    selectPropertyDDLBValue: {value: function(section, name, value){
        return this.propertyDDLBFieldOptions(section, name, value).click();
    }},

    TypePropertyInputValue: {value: function(section, name, value){
        return this.typeIntoInputField (this.propertyInputField(section,name), value);
    }},

   clickPropertyToggleField: { value: function (section, name) {
        this.propertyToggleField(section, name).click();
    }},

// State evaluation methods

    propertyToggleFieldNamedIsChecked:  { value:   function (section, name)     {
        var ele = this.propertyToggleField(section, name);
        return ele.getAttribute('ng-model').then(function(model){
            return browser.executeScript('return angular.element(arguments[0]).scope().'+ model +';',
                ele.getWebElement());
        });
    }},

});

module.exports = propertyPanel;
