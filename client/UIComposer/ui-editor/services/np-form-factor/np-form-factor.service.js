'use strict';

var _ = require('norman-client-tp').lodash;
module.exports = npFormFactor;

// @ngInject
function npFormFactor() {
    var formFactors = [{
            name: 'Phone',
            type: 'phone',
            icon: 'prototype-assets--images--header--Device_Light_phone-port',
            height: 568 + 'px',
            width: 320 + 'px'
        }, {
            name: 'Tablet',
            type: 'tablet',
            icon: 'prototype-assets--images--header--Device_Light_tablet-port',
            height: 1024 + 'px',
            width: 768 + 'px'
        }, {
            name: 'Desktop',
            type: 'desktop',
            icon: 'prototype-assets--images--header--DeviceLight_monitor',
            height: 1024 + 'px',
            width: 1280 + 'px'
        }],
        currentFormFactor = formFactors[2]; // default to desktop

    return {
        setFormFactorByName: setFormFactorByName,
        getAvailableFormFactors:getAvailableFormFactors,
        setCurrentFormFactor: setCurrentFormFactor,
        getCurrentFormFactor: getCurrentFormFactor
    };

    /**
     * @name setFormFactorByName
     * @description initialize the current form factor to a default form factor.
     * @returns {Object} returns the formfactor being set.
     */
    function setFormFactorByName(name) {
        currentFormFactor = _.find(formFactors, {name: name});
        return currentFormFactor;
    }

    /**
     * @name getAvailableFormFactors
     * @description Cache the position of other elements before the target element is moved for optimization.
     * @returns {formFactors[]} returns a list of supported form factors.
     */
    function getAvailableFormFactors() {
        return formFactors;
    }

    /**
     * @name setCurrentFormFactor
     * @description set a given form factor as current one.
     * @param {object} formFactor to set it as current.
     */
    function setCurrentFormFactor(formFactor) {
        currentFormFactor = formFactor;
    }

    /**
     * @name getCurrentFormFactor
     * @description to retrieve the current form factor.
     * @returns {object} returns the current form factor for the prototype.
     */
    function getCurrentFormFactor() {
        return currentFormFactor;
    }
}

