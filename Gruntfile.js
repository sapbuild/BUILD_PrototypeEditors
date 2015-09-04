'use strict';

var fs = require('fs');
var path = require('path');

require('mocha-jenkins-reporter');

var projects = [
    'client',
    'server'
];
var repo = 'PrototypeEditors';

var reports = path.join(process.cwd(), 'reports');
if (!fs.existsSync(reports)) {
    fs.mkdirSync(reports);
}
var junitReport = path.join(reports, 'junit');
if (!fs.existsSync(junitReport)) {
    fs.mkdirSync(junitReport);
}

module.exports = function (grunt) {

    // Time how long tasks take. Can help when optimizing build times
    require('time-grunt')(grunt);

    // Load grunt tasks automatically, when needed
    require('jit-grunt')(grunt, {
        protractor: 'grunt-protractor-runner',
        express: 'grunt-express-server',
        ngAnnotate: 'grunt-ng-annotate'
    });

    grunt.loadNpmTasks('grunt-mocha-istanbul');
    grunt.loadNpmTasks('grunt-string-replace');
    grunt.loadNpmTasks('grunt-svg-sprite');

    grunt.loadNpmTasks('grunt-contrib-watch');

    // Define the configuration for all the tasks
    grunt.initConfig({
        // vars
        env: {
            dev: {NODE_ENV: 'development', JUNIT_REPORT_PATH: 'reports/junit/TESTS-Server-all.xml'},
            junit: {NODE_ENV: 'production'},
            prod: {NODE_ENV: 'production'},
            client: 'sample/client',
            server: 'sample/server'
        },

        // Access information from package.json for sonar publication
        pkg: grunt.file.readJSON('package.json'),

        // Make sure code styles are up to par and there are no obvious mistakes
        eslint: require('./grunt-conf/eslint.js'),

        // Empties folders to start fresh
        clean: require('./grunt-conf/clean.js'),

        // Copies remaining files to places other tasks can use
        copy: require('./grunt-conf/copy.js'),

        // compile less files into a single css file
        less: require('./grunt-conf/less.js'),

        // wrap node modules for browser
        browserify: require('./grunt-conf/browserify.js'),

        // e2e tests
        protractor: require('./grunt-conf/protractor.js')(grunt),

        'string-replace': require('./grunt-conf/string-replace.js'),

        // Test settings
        karma: require('./grunt-conf/karma.js'),

        // Watch files
        watch: require('./grunt-conf/watch.js'),

        //Grunt wait Task for e2e testing:
        wait: require('./grunt-conf/wait.js'),

        /*** SERVER *******************************************************************************/

        // Server settings
        express: require('./grunt-conf/express.js'),

        // Server tests
        mocha_istanbul: require('./grunt-conf/mocha.js'),

        // Merge multiple lcov reports
        lcovMerge: require('./grunt-conf/lcovmerge.js'),

        // convert svg images to sprite
        svg_sprite: require('./grunt-conf/svg-sprite.js')

    });

    //trim the json output from the test runner; the json from cucumber output may contain non-json entries.
    grunt.registerTask('trimJsonOutput', function () {
        console.log('triming');
        var testOutput = grunt.file.read('test/results/testReport.json');
        var data = testOutput.match(/(\[\s+\{[\s\S]*\}\s+\]\s+\}\s+\]\s+\}\s+\])/)[1];
        grunt.file.write('test/results/testReport.json', data.replace(/\]\[/g, ','));
    });

    //for e2e
    grunt.registerTask('checkTestFailed', 'My "default" task description.', function () {
        var testOutput = grunt.file.read('test/results/testReport.json');
        if (testOutput.indexOf('"status": "failed"') !== -1) {
            grunt.fail.fatal('Test failures found', 1);
        }
    });

    grunt.registerTask('test', function (target) {
        var tasks = {
                client: ['clean:dev', 'env:dev', 'copy:UITests', 'browserify:dev', 'karma:DataModeler', 'karma:Previewer', 'karma:SharedWorkSpace', 'karma:SampleDataManager', 'karma:UIComposer'],
                server: ['env:dev', 'mocha_istanbul:DataModeler', 'mocha_istanbul:PrototypeBuilder', 'mocha_istanbul:SampleDataManager', 'mocha_istanbul:SharedWorkSpace', 'mocha_istanbul:UIComposer', 'mocha_istanbul:Previewer'],
                clientDataModeler: ['copy:UITests', 'browserify:dev', 'karma:DataModeler'],
                clientPreviewer: ['copy:UITests', 'browserify:dev', 'karma:Previewer'],
                clientSharedWorkSpace: ['copy:UITests', 'browserify:dev', 'karma:SharedWorkSpace'],
                clientSampleDataManager: ['copy:UITests', 'browserify:dev', 'karma:SampleDataManager'],
                clientUIComposer: ['copy:UITests', 'browserify:dev', 'karma:UIComposer'],
                ui5Acceptance:['mocha_istanbul:ui5Acceptance'],
                dflt: ['test:client', 'test:server' ],
                e2e: ['serve:e2e', 'wait', 'protractor:e2e', 'wait', 'trimJsonOutput', 'checkTestFailed'] //wait dev after protractor to allow json output to complete.
            },
            task = tasks[target];

        if (task && grunt.option('watch')) {
            task.push('watch');
        }

        return grunt.task.run(tasks[target || 'dflt']);
    });

    grunt.registerTask('serve', function (target) {
        var tasks = {
            dev: ['clean', 'env:dev', 'copy:sample', 'svg-sprite', 'less', 'browserify:sample', 'browserify:vendor', 'express:sample', 'watch'],
            e2e: ['clean', 'env:dev', 'copy:sample', 'svg-sprite', 'less', 'browserify:sample', 'browserify:vendor', 'express:sample']
        };
        return grunt.task.run(tasks[target || 'dev']);
    });

    grunt.registerTask('svg-sprite', ['svg_sprite', 'string-replace:sprite']);
    grunt.registerTask('default', ['dist']);
    grunt.registerTask('build', ['dist']);
    grunt.registerTask('dist', ['clean', 'eslint', 'test:client', 'lcovMerge:client', 'test:server', 'lcovMerge:server']);
};
