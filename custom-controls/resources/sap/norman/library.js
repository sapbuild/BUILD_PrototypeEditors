sap.ui.define([], function() {
    "use strict";
    sap.ui.getCore().initLibrary({
        name: "sap.norman",
        version: "0.0.2",
        dependencies: ["sap.ui.core"],
        controls: ["sap.norman.controls.Angular"],
        elements: ["sap.norman.angular"]
    });
    return sap.norman;
}, false);
