'use strict';
module.exports = {

    SampleDataManager: {
        src: [
            'server/SampleDataManager/**/*.spec.js'
        ], // a folder works nicely
        options: {
            reporter: 'mocha-jenkins-reporter',
            coverageFolder: 'reports/coverage/server/SampleDataManager',
            root: './server/SampleDataManager',
            reportFormats: ['lcov'],
            check: {
                lines: 0,
                statements: 0
            }
        }
    },
    Previewer: {
        src: [
            'server/Previewer/**/*.spec.js',
            'test/Previewer/int/server/*.spec.js'
        ], // a folder works nicely
        options: {
            reporter: 'mocha-jenkins-reporter',
            coverageFolder: 'reports/coverage/server/Previewer',
            root: './server/Previewer',
            reportFormats: ['lcov'],
            check: {
                lines: 0,
                statements: 0
            }
        }
    },

    PrototypeBuilder: {
        src: [
            'server/PrototypeBuilder/**/*.spec.js',
            'test/int/PrototypeBuilder/server/*.spec.js'
        ], // a folder works nicely
        options: {
            reporter: 'mocha-jenkins-reporter',
            coverageFolder: 'reports/coverage/server/PrototypeBuilder',
            timeout: 5000,
            root: './server/PrototypeBuilder',
            reportFormats: ['lcov'],
            check: {
                lines: 50,
                statements: 50
            }
        }
    },

    DataModeler: {
        src: [
            'server/DataModeler/**/*.spec.js',
            'test/int/DataModeler/server/*.spec.js'
        ], // a folder works nicely
        options: {
            reporter: 'mocha-jenkins-reporter',
            coverageFolder: 'reports/coverage/server/DataModeler',
            root: './server/DataModeler',
            reportFormats: ['lcov'],
            check: {
                lines: 20,
                statements: 20
            }
        }
    },

    UIComposer: {
        src: [
            'server/UIComposer/**/*.spec.js'
            // TODO UIComposer team fix prototypeService.prototype.createDataDrivenPrototype 'node_modules/norman-prototype-editors-test/UIComposer/**/*.spec.js'
        ],

        options: {
            coverage: false,
            reporter: 'mocha-jenkins-reporter',
            coverageFolder: 'reports/coverage/server/UIComposer',
            root: './server/UIComposer',
            reportFormats: ['lcov'],
            check: {
                lines: 20,
                statements: 20
            }
        }
    },

    UIComposer_int: {
        src: [
            'test/int/UIComposer/**/*.spec.js'
        ], // a folder works nicely
        options: {
            reporter: 'mocha-jenkins-reporter',
            coverageFolder: 'reports/coverage/integration/UIComposer_int',
            root: './server/UIComposer',
            reportFormats: ['lcov'],
            check: {
                lines: 20,
                statements: 20
            }
        }
    },

    SharedWorkSpace: {
        src: [
            'server/SharedWorkSpace/**/*.spec.js'
// TODO BY SharedWorkSpace team             'node_modules/norman-prototype-editors-test/SharedWorkSpace/**/*.spec.js'
        ], // a folder works nicely
        options: {
            reporter: 'mocha-jenkins-reporter',
            coverageFolder: 'reports/coverage/server/SharedWorkSpace',
            root: './server/SharedWorkSpace',
            reportFormats: ['lcov'],
            check: {
                lines: 0,
                statements: 0
            }
        }
    },

    SharedWorkSpace_int: {
        src: [
            'test/int/SharedWorkSpace/**/*.spec.js'
        ], // a folder works nicely
        options: {
            reporter: 'mocha-jenkins-reporter',
            coverageFolder: 'reports/coverage/integration/SharedWorkSpace_int',
            root: './server/SharedWorkSpace',
            reportFormats: ['lcov'],
            check: {
                lines: 20,
                statements: 20
            }
        }
    },

    ui5Acceptance: {
        src: [
            'test/UI5Acceptance/ui5_acceptance_test.js'
        ],
        options: {
            reporter: 'mocha-jenkins-reporter',
            coverageFolder: 'reports/coverage/server/UI5Acceptance',
            root: './server/PrototypeBuilder',
            reportFormats: ['lcov'],
            check: {
                lines: 0,
                statements: 0
            }
        }
    }

};
