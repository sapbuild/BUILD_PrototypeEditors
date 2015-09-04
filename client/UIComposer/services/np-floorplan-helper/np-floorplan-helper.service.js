'use strict';
var _ = require('norman-client-tp').lodash;
module.exports = npFloorplanHelper;

// @ngInject
function npFloorplanHelper($q, npUiCatalog, npPrototype) {

    return {
        getValidFloorplans: getValidFloorplans
    };

    /**
     * @name getValidFloorplans
     * @public
     * @description determines all valid floorplans
     * @returns {*} Promise resolved after all is successfully done
     */
    function getValidFloorplans() {
        return npPrototype.getPrototype()
            .then(function (prototype) {
                if (_.size(prototype.pages) > 0) {
                    return getCompatibleFloorplans(prototype);
                }
                else {
                    return getValidStartingFloorplans();
                }
            });
    }

    /**
     * @name getCompatibleFloorplans
     * @private
     * @description determines floorplans in case prototype has more than 1 page
     * @returns {*} Promise resolved after all is successfully done
     */
    function getCompatibleFloorplans(prototype) {
        return npUiCatalog.getCompatibleFloorplans(prototype.catalogId)
            .then(function (floorplans) {
                filterCompatibleFloorplansForSmartTemplate(floorplans, prototype);
                return $q.when(floorplans);
            });
    }

    /**
     * @name getValidStartingFloorplans
     * @private
     * @description determins floorplans in case prototype has no pages
     * @returns {*} Promise resolved after all is successfully done

     */
    function getValidStartingFloorplans() {
        return npUiCatalog.getFloorplans()
            .then(function (floorplans) {
                filterAllFloorplansForSmartTemplate(floorplans);
                return $q.when(floorplans);
            });
    }

    /**
     * @name filterAllFloorplansForSmartTemplate
     * @private
     * @description filters valid floorplans for smart templates
     */
    function filterAllFloorplansForSmartTemplate(floorplans) {
        _.remove(floorplans, function (fp) {
            return fp.isSmart && !fp.isRootFloorplan;
        });
    }

    /**
     * @name filterCompatibleFloorplansForSmartTemplate
     * @private
     * @description Filters valid floorplans for smart templates
     */
    function filterCompatibleFloorplansForSmartTemplate(floorplans, prototype) {
        if (!prototype.isSmartApp) {
            return;
        }
        _.remove(floorplans, function (fp) {
            return !fp.isSmart || fp.isRootFloorplan;
        });
    }
}
