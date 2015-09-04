'use strict';

var _ = require('norman-client-tp').lodash;

module.exports = npControlMetadataPrototype;

npControlMetadataPrototype.$inject = [];

/**
 * @ngdoc factory
 * @name npControlMetadataPrototype
 */
function npControlMetadataPrototype() {
    var service = {
        setControlMdPrototype: setControlMdPrototype
    };

    return service;

    /**
     * @name setControlMdPrototype
     * @description
     * Sets helper methods for each control. E.g. getParentMd returns pageMd for chaining
     *
     * @param {ControlMd|ControlMd[]} controlsMd
     * @param {PageMd} pageMd
     */
    function setControlMdPrototype(controlsMd, pageMd) {
        controlsMd = _.makeArray(controlsMd);
        var prototype = new ControlMdPrototype(pageMd);
        _.forEach(controlsMd, function (controlMd) {
            Object.setPrototypeOf(controlMd, prototype);
        });
    }

    function ControlMdPrototype(pageMetadata) {
        var getControlMd = function (controlId, pageMd) {
                return _.find(pageMd.controls, {
                    controlId: controlId
                });
            },
            getGroupMd = function (groupId, controlMd) {
                return _.find(controlMd.groups, {
                    groupId: groupId
                });
            };

        return {
            getParentMd: function () {
                return getControlMd(this.parentControlId, pageMetadata);
            },
            getChildrenMd: function (groupId) {
                var groupMd = getGroupMd(groupId, this) || {};
                return _.map(groupMd.children, function (childId) {
                    return getControlMd(childId, pageMetadata);
                });
            },
            isRootChild: function () {
                return (this.parentControlId === pageMetadata.rootControlId);
            }
        };
    }
}
