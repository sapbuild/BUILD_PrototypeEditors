'use strict';

/**
 * @ngdoc factory
 * @name npPageMetadataChangeEvent
 * @namespace uiComposer:services:npPageMetadata:EventEditor
 */

var npPageMetadataChangeEvent = ['npPageMetadataEvents',
    function (pageMdEvents) {
        /**
         * @name getEventMdObject
         * @memberof uiComposer:services:npPageMetadata:getEventMdObject
         * @description creates a eventsMetaData object out of the eventDef
         * @param {eventMD} contains event information
         * @returns {eventMD} returns eventsMD object
         */
        var getEventMdObject = function (eventDef) {
            var eventMd = {
                eventId: eventDef.eventId,
                actionId: eventDef.actionId,
                params: eventDef.params
            };
            return eventMd;
        };

        /**
         * @name changeEvents
         * @memberof uiComposer:services:npPageMetadata:changeEvents
         * @description changes (sets and un sets) event information
         * @param {eventMD} contains event information
         * @param {controlMD} contains control MD
         */
        var changeEvents = function (eventMd, controlMd) {
            controlMd.events = [];
            // TODO remove the 'NONE' check, this should be done in a different way
            // workaround for now to not save invalid action
            if (eventMd.eventId && eventMd.actionId && eventMd.actionId !== 'NONE' && eventMd.params) {
                controlMd.events = [eventMd];
            }
            pageMdEvents.broadcast(pageMdEvents.events.controlEventsChanged, [controlMd]);
        };

        return {
            changeEvents: changeEvents,
            getEventMdObject: getEventMdObject
        };
    }
];

module.exports = npPageMetadataChangeEvent;
