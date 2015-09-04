'use strict';

jQuery.sap.declare('sap.norman.controls.Angular');
jQuery.sap.require('sap.ui.core.HTML');
jQuery.sap.require('sap.norman.angular');

sap.ui.core.HTML.extend('sap.norman.controls.Angular', {
    metadata: {
        library: 'sap.norman.controls',
        properties: {
            'scope': {type: 'object', defaultValue: null}
        }
    },
    constructor: function() {
        sap.ui.core.HTML.apply(this, arguments);
        // wait for angular to be ready
        sap.norman.angular.attachReady(function() {
            // if scope is still undefined, set it
            if (!this.getScope()) {
                var scope = sap.norman.angular.rootScope.$new({});
                this.setProperty('scope', scope, true);
                // rendering might have already happened
                this._compile();
            }
        }, this);
    },
    setContent: function(/*sContent*/) {
        sap.ui.core.HTML.prototype.setContent.apply(this, arguments);
        this._compile();
        return this;
    },
    onAfterRendering: function() {
        sap.ui.core.HTML.prototype.onAfterRendering.apply(this, arguments);
        this._compile();
    },
    _compile: function() {
        var dom = this.getDomRef(), compile = sap.norman.angular.compile, scope = this.getScope();
        if (compile && scope && dom) {
            var content = this.getContent();
            var compareDom = dom.outerHTML.replace(' data-sap-ui-preserve="' + this.getId() + '" id="' + this.getId() + '"', '');
            if (compareDom === content) {
                dom = compile(dom.outerHTML)(scope);
                this.$().replaceWith(dom);

            }
        }
    },
    renderer: {}
});
