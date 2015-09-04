'use strict';

var chai = require('norman-testing-tp').chai;
var AnnotationBuilder = require('../../lib/services/builder/annotationBuilder.js');
var builderUtils = require('../../lib/services/builder/builderUtils.js');
var modelBuilder = require('../../lib/services/builder/modelBuilder.js');
var oDataHelper = require('../../lib/services/builder/technology/odataHelper');
var fs = require('fs');
var _ = require('norman-server-tp').lodash;
var path = require('path');
var expect = chai.expect;

describe('AnnotationBuilder Builder', function () {

    var uiCatalogs;
    var dataModel;
    var retrieveTestData = function (testFileName) {
        var testData = {};
        testData.jsonSource = JSON.parse(fs.readFileSync(path.resolve(__dirname, testFileName + '.json')), 'utf-8');
        if (fs.existsSync(path.resolve(__dirname, testFileName + '.annotations.xml'))) {
            testData.xmlTarget = fs.readFileSync(path.resolve(__dirname, testFileName + '.annotations.xml')).toString().replace(/\r\n/g, '\n').replace(/\t/g, '    ');
        }
        return testData;
    };

    before(function (done) {
        uiCatalogs = [JSON.parse(fs.readFileSync(path.resolve(__dirname, './material/stBeta3.json')), 'utf-8')];
        dataModel = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'material/sampleDataModel.json')), 'utf-8');
        builderUtils.setContext(uiCatalogs, dataModel, {catalogId: 'designCatalog'});
        oDataHelper.initialize(done);
    });

    beforeEach(function () {
        oDataHelper.reset();
    });

    describe('ListReport', function () {
        it('with header', function () {
            var testData = retrieveTestData('material/smartTemplates/listReport/listReportWithHeader');
            testData.jsonSource.mainEntityName = 'SalesOrder';
            AnnotationBuilder.extractAnnotationFromPageMetadata(testData.jsonSource, {});
            var generatedXML = AnnotationBuilder.getAnnotationFile();
            expect(generatedXML).to.equal(testData.xmlTarget);
        });
        it('with action button and column', function () {
            var testData = retrieveTestData('material/smartTemplates/listReport/listReportWithActionButtonAndColumn');
            testData.jsonSource.mainEntityName = 'SalesOrder';
            AnnotationBuilder.extractAnnotationFromPageMetadata(testData.jsonSource, {});
            var generatedXML = AnnotationBuilder.getAnnotationFile();
            expect(generatedXML).to.equal(testData.xmlTarget);
        });

        it('and can deal with property name conflicts', function () {
            var testData = retrieveTestData('material/smartTemplates/listReport/listReportFilterRepeat');
            testData.jsonSource.mainEntityName = 'SalesOrder';
            AnnotationBuilder.extractAnnotationFromPageMetadata(testData.jsonSource, {});
            var generatedXML = AnnotationBuilder.getAnnotationFile();
            expect(generatedXML).to.equal(testData.xmlTarget);
            var dataModelExtension = AnnotationBuilder.getDataModelExtension();
            expect(dataModelExtension.SalesOrder.Name).to.equal(undefined); // another name is not created, should be 'Name_1'
        });

        it('with additional info in a column', function () {
            var testData = retrieveTestData('material/smartTemplates/listReport/listReportWithAdditionalInfo');
            testData.jsonSource.mainEntityName = 'SalesOrder';
            AnnotationBuilder.extractAnnotationFromPageMetadata(testData.jsonSource, {});
            var generatedXML = AnnotationBuilder.getAnnotationFile();
            expect(generatedXML).to.equal(testData.xmlTarget);
        });

        it('and can deal with URLs', function () {
            var testData = retrieveTestData('material/smartTemplates/listReport/listReportURL');
            testData.jsonSource.mainEntityName = 'SalesOrder';
            AnnotationBuilder.extractAnnotationFromPageMetadata(testData.jsonSource, {});
            var generatedXML = AnnotationBuilder.getAnnotationFile();
            expect(generatedXML).to.equal(testData.xmlTarget);
        });

        it('and can deal with URLs on same Object', function () {
            var testData = retrieveTestData('material/smartTemplates/listReport/listReportURLOnSameObject');
            testData.jsonSource.mainEntityName = 'SalesOrder';
            AnnotationBuilder.extractAnnotationFromPageMetadata(testData.jsonSource, {});
            var generatedXML = AnnotationBuilder.getAnnotationFile();
            expect(generatedXML).to.equal(testData.xmlTarget);
        });

        it('and can deal with invalid URLs', function () {
            var testData = retrieveTestData('material/smartTemplates/listReport/listReportURLInvalid');
            testData.jsonSource.mainEntityName = 'SalesOrder';
            AnnotationBuilder.extractAnnotationFromPageMetadata(testData.jsonSource, {});
            var generatedXML = AnnotationBuilder.getAnnotationFile();
            expect(generatedXML).to.equal(testData.xmlTarget);
        });

        it('and can deal with URLs and Value and Currency', function () {
            var testData = retrieveTestData('material/smartTemplates/listReport/listReportCurrencyAndValueAndURL');
            testData.jsonSource.mainEntityName = 'SalesOrder';
            AnnotationBuilder.extractAnnotationFromPageMetadata(testData.jsonSource, {});
            var generatedXML = AnnotationBuilder.getAnnotationFile();
            expect(generatedXML).to.equal(testData.xmlTarget);
        });
    });

    describe('knows how to deal with simple page metadata', function () {
        it('in a simple use case', function () {
            var testData = retrieveTestData('material/smartTemplates/objectPage');
            testData.jsonSource.mainEntityName = 'SalesOrder';
            AnnotationBuilder.extractAnnotationFromPageMetadata(testData.jsonSource, {});
            var generatedXML = AnnotationBuilder.getAnnotationFile();
            expect(generatedXML).to.equal(testData.xmlTarget);
        });

        it('and can deal with URLs in Lists', function () {
            var testData = retrieveTestData('material/smartTemplates/objectPageURL');
            testData.jsonSource.mainEntityName = 'SalesOrder';
            AnnotationBuilder.extractAnnotationFromPageMetadata(testData.jsonSource, {});
            var generatedXML = AnnotationBuilder.getAnnotationFile();
            expect(generatedXML).to.equal(testData.xmlTarget);
        });

        it('and can deal with annotationPath', function () {
            var testData = retrieveTestData('material/smartTemplates/objectPageWithAnnotationPath');
            testData.jsonSource.mainEntityName = 'SalesOrder';
            AnnotationBuilder.extractAnnotationFromPageMetadata(testData.jsonSource, {});
            var generatedXML = AnnotationBuilder.getAnnotationFile();
            expect(generatedXML).to.equal(testData.xmlTarget);
        });

        it('and can deal with a table with no column', function () {
            var testData = retrieveTestData('material/smartTemplates/objectPageWithATableAndNoColumn');
            testData.jsonSource.mainEntityName = 'SalesOrder';
            AnnotationBuilder.extractAnnotationFromPageMetadata(testData.jsonSource, {});
            var generatedXML = AnnotationBuilder.getAnnotationFile();
            expect(generatedXML).to.equal(testData.xmlTarget);
        });

        it('and can deal with a bound table with no column', function () {
            var testData = retrieveTestData('material/smartTemplates/objectPageWithABoundTableAndNoColumn');
            testData.jsonSource.mainEntityName = 'SalesOrder';
            AnnotationBuilder.extractAnnotationFromPageMetadata(testData.jsonSource, {});
            var generatedXML = AnnotationBuilder.getAnnotationFile();
            expect(generatedXML).to.equal(testData.xmlTarget);
        });

        it('and can deal with a table with two column', function () {
            var testData = retrieveTestData('material/smartTemplates/objectPageWithATableAndTwoColumn');
            testData.jsonSource.mainEntityName = 'SalesOrder';
            AnnotationBuilder.extractAnnotationFromPageMetadata(testData.jsonSource, {});
            var generatedXML = AnnotationBuilder.getAnnotationFile();
            expect(generatedXML).to.equal(testData.xmlTarget);
        });

        it('and can deal with two table with two column', function () {
            var testData = retrieveTestData('material/smartTemplates/objectPageWithTwoTableAndTwoColumn');
            testData.jsonSource.mainEntityName = 'SalesOrder';
            AnnotationBuilder.extractAnnotationFromPageMetadata(testData.jsonSource, {});
            var generatedXML = AnnotationBuilder.getAnnotationFile();
            expect(generatedXML).to.equal(testData.xmlTarget);
        });

        it('and can deal with two table with two column on one Navigation', function () {
            var testData = retrieveTestData('material/smartTemplates/objectPageWithTwoTableOneNav');
            testData.jsonSource.mainEntityName = 'SalesOrder';
            AnnotationBuilder.extractAnnotationFromPageMetadata(testData.jsonSource, {});
            var generatedXML = AnnotationBuilder.getAnnotationFile();
            expect(generatedXML).to.equal(testData.xmlTarget);
        });

        it('and can deal with annotationPath with hardcoded path', function () {
            var testData = retrieveTestData('material/smartTemplates/objectPageWithAnnotationPathHardcoded');
            testData.jsonSource.mainEntityName = 'SalesOrder';
            AnnotationBuilder.extractAnnotationFromPageMetadata(testData.jsonSource, {});
            var generatedXML = AnnotationBuilder.getAnnotationFile();
            expect(generatedXML).to.equal(testData.xmlTarget);
        });

        it('and can deal with a Header and KPI', function () {
            var testData = retrieveTestData('material/smartTemplates/objectPageWithHeaderAndKpi');
            testData.jsonSource.mainEntityName = 'SalesOrder';
            AnnotationBuilder.extractAnnotationFromPageMetadata(testData.jsonSource, {});
            var generatedXML = AnnotationBuilder.getAnnotationFile();
            expect(generatedXML).to.equal(testData.xmlTarget);
        });

        it('and can deal with a Header and two KPI', function () {
            var testData = retrieveTestData('material/smartTemplates/objectPageWithHeaderAndTwoKpi');
            testData.jsonSource.mainEntityName = 'SalesOrder';
            AnnotationBuilder.extractAnnotationFromPageMetadata(testData.jsonSource, {});
            var generatedXML = AnnotationBuilder.getAnnotationFile();
            expect(generatedXML).to.equal(testData.xmlTarget);
        });

        it('and can deal with object page with form section', function () {
            var testData = retrieveTestData('material/smartTemplates/objectPageWithFormSection');
            testData.jsonSource.mainEntityName = 'SalesOrder';
            AnnotationBuilder.extractAnnotationFromPageMetadata(testData.jsonSource, {});
            var generatedXML = AnnotationBuilder.getAnnotationFile();
            expect(generatedXML).to.equal(testData.xmlTarget);
        });
    });

    describe('knows how to deal with binding', function () {

        it('and can deal with annotationPath', function () {
            var testData = retrieveTestData('material/smartTemplates/objectPageWithAnnotationPathAndNavProp');
            testData.jsonSource.mainEntityName = 'SalesOrder';
            AnnotationBuilder.extractAnnotationFromPageMetadata(testData.jsonSource, {});
            var generatedXML = AnnotationBuilder.getAnnotationFile();
            expect(generatedXML).to.equal(testData.xmlTarget);
        });

    });

    describe('knows how to deal with v2 annotations', function () {
        it('and can create them on the metadata', function () {
            var testData = retrieveTestData('material/smartTemplates/listReport/listReportWithFilter');
            testData.jsonSource.mainEntityName = 'SalesOrder';
            AnnotationBuilder.extractAnnotationFromPageMetadata(testData.jsonSource, {});
            var generatedXML = AnnotationBuilder.getAnnotationFile();
            expect(generatedXML).to.equal(testData.xmlTarget);
        });

        it('and can create them with hardcoded data', function () {
            var testData = retrieveTestData('material/smartTemplates/listReport/listReportWithFilterForV2');
            var newEntity = oDataHelper.createEntity();
            testData.jsonSource.mainEntity = newEntity.id;
            testData.jsonSource.mainEntityDetail = newEntity;
            testData.jsonSource.mainEntityName = newEntity.name;
            AnnotationBuilder.extractAnnotationFromPageMetadata(testData.jsonSource, {});
            var generatedXML = AnnotationBuilder.getAnnotationFile();
            expect(generatedXML).to.equal(testData.xmlTarget);
            var dataModelExtension = AnnotationBuilder.getDataModelExtension();
            expect(dataModelExtension.Entity_0.MyValue.label).to.equal('My Filter');
            //expect(modelBuilder.generateEDMX(dataModel)).to.equal('My filter');
        });

        it('and can create them when binding is involved', function () {
            var testData = retrieveTestData('material/smartTemplates/listReport/listReportWithFilterForV2WithBinding');
            testData.jsonSource.mainEntityName = 'SalesOrder';
            AnnotationBuilder.extractAnnotationFromPageMetadata(testData.jsonSource, {});
            var generatedXML = AnnotationBuilder.getAnnotationFile();
            expect(generatedXML).to.equal(testData.xmlTarget);
            var dataModelExtension = AnnotationBuilder.getDataModelExtension();
            expect(dataModelExtension.SalesOrder.ID.label).to.equal('My Filter');
        });
    });

    describe('object page', function () {
        describe('form section', function () {
            it('can have one form group with multiple elements', function () {
                var testData = retrieveTestData('material/smartTemplates/objectPage/form/FormGroup');
                testData.jsonSource.mainEntityName = 'SalesOrder';
                AnnotationBuilder.extractAnnotationFromPageMetadata(testData.jsonSource, {});
                var generatedXML = AnnotationBuilder.getAnnotationFile();
                expect(generatedXML).to.equal(testData.xmlTarget);
            });

            it('can have 2 form groups', function () {
                var testData = retrieveTestData('material/smartTemplates/objectPage/form/2FormGroups');
                testData.jsonSource.mainEntityName = 'SalesOrder';
                AnnotationBuilder.extractAnnotationFromPageMetadata(testData.jsonSource, {});
                var generatedXML = AnnotationBuilder.getAnnotationFile();
                expect(generatedXML).to.equal(testData.xmlTarget);
            });

            it('can have 2 form groups in 2 different sections', function () {
                var testData = retrieveTestData('material/smartTemplates/objectPage/form/FormGroupsIn2Sections');
                testData.jsonSource.mainEntityName = 'SalesOrder';
                AnnotationBuilder.extractAnnotationFromPageMetadata(testData.jsonSource, {});
                var generatedXML = AnnotationBuilder.getAnnotationFile();
                expect(generatedXML).to.equal(testData.xmlTarget);
            });
        });
        describe('table section', function () {
            it('can have Table Actions', function () {
                var testData = retrieveTestData('material/smartTemplates/objectPage/table/TableAction');
                testData.jsonSource.mainEntityName = 'SalesOrder';
                AnnotationBuilder.extractAnnotationFromPageMetadata(testData.jsonSource, {});
                var generatedXML = AnnotationBuilder.getAnnotationFile();
                expect(generatedXML).to.equal(testData.xmlTarget);
            });
            it('can have Two Columns with one bound', function () {
                var testData = retrieveTestData('material/smartTemplates/objectPage/table/Table2Columns1Bound');
                testData.jsonSource.mainEntityName = 'SalesOrder';
                AnnotationBuilder.extractAnnotationFromPageMetadata(testData.jsonSource, {});
                var generatedXML = AnnotationBuilder.getAnnotationFile();
                expect(generatedXML).to.equal(testData.xmlTarget);

                // Need to have generated an extra property to display the value Val1 of the first column of the table
                var dataModelExtension = AnnotationBuilder.getDataModelExtension();
                expect(dataModelExtension.SalesOrderItem['ObjectPage-Column_0_0_Target_0_Value']).to.not.be.null;
            });
        });
        describe('has bugs', function () {
            it('can have 2 columns in a table', function () {
                var testData = retrieveTestData('material/smartTemplates/bugs/listReport1');
                testData.jsonSource.mainEntityName = 'SalesOrder';
                AnnotationBuilder.extractAnnotationFromPageMetadata(testData.jsonSource, {});
                var generatedXML = AnnotationBuilder.getAnnotationFile();
                expect(generatedXML).to.equal(testData.xmlTarget);
            });

            it('can comply with Francine model', function () {
                var testData = retrieveTestData('material/smartTemplates/bugs/objectPage1');
                testData.jsonSource.mainEntityName = 'SalesOrder';
                AnnotationBuilder.extractAnnotationFromPageMetadata(testData.jsonSource, {});
                var generatedXML = AnnotationBuilder.getAnnotationFile();
                expect(generatedXML).to.equal(testData.xmlTarget);
            });
        });
    });

    describe('beta 3 - catalog enhancements', function () {
//we change the catalog

        describe('form section', function () {
            it('can have a formElement with a currency and exploit the nullable property', function () {
                var testData = retrieveTestData('material/smartTemplates/objectPageWithFormWithCurrency');
                testData.jsonSource.mainEntityName = 'SalesOrder';
                AnnotationBuilder.extractAnnotationFromPageMetadata(testData.jsonSource, {});
                var generatedXML = AnnotationBuilder.getAnnotationFile();
                expect(generatedXML).to.equal(testData.xmlTarget);
                var dataModelExtension = AnnotationBuilder.getDataModelExtension();
                expect(dataModelExtension.SalesOrder['ObjectPage-FormElement_0_0_Facets_0_Target_0_Data_0_Value'].label).to.equal('Element 1');
                expect(dataModelExtension.SalesOrder['ObjectPage-FormElement_0_0_Facets_0_Target_0_Data_0_Value'].nullable).to.equal('true');
            });


        });

    });
});
