'use strict';
// init angular, save root and compiler into sapui5 module
jQuery.sap.declare('sap.norman.angular');
sap.norman.angular = {};
sap.norman.angular.init = function(sModuleName, aParams) {
    if (!sModuleName) {
        sModuleName = jQuery('[ng-app]').attr('ng-app');
    }
    if (!sModuleName) {
        return jQuery.sap.log.error('Angular ng-app not found, must set one on html');
    }
    if (!angular) {
        return jQuery.sap.log.error('Angular not loaded!');
    }
    var app = angular.module(sModuleName, aParams || []);
    this._isReady = false;

    var that = this;
    var _checkReady = function() {
        if (that._isReady && that._listeners && that._listeners.length) {
            for (var i = 0, l = that._listeners.length; i < l; i++) {
                that._listeners[i].callback.call(that._listeners[i].listener || that);
            }
            delete that._listeners;
        }
    };

    var onRun = function($rootScope, $compile) {
        sap.norman.angular.compile = $compile;
        sap.norman.angular.rootScope = $rootScope;
        sap.norman.angular.rootModule = app;
        that._isReady = true;
        _checkReady();
    };
    sap.ui.getCore().attachInit(_checkReady);
    app.run(onRun);

    return this;
};
sap.norman.angular.attachReady = function(fn, listener) {
    if (this._isReady) {
        fn.call(listener);
    }
    else {
        if (!this._listeners) {
            this._listeners = [];
        }
        this._listeners.push({
            callback: fn,
            listener: listener || window
        });
    }

    return this;
};
sap.norman.angular.detachReady = function(fn, listener) {
    var aListeners = this._listeners || [];
    listener = listener || window;
    for (var i = 0, l = aListeners.length; i < l; i++) {
        if (aListeners[i].callback === fn && aListeners[i].listener === listener) {
            aListeners.splice(i, 1);
            break;
        }
    }

    return this;
};
