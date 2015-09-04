@smarttemplate
Feature: SmartTemplate

  @flow
  Scenario: Login with Data Modeller User
    Given I am on the sign up page
    When I signup with random credentials
    Then I am logged in

  @flow
  @OnceLoggedInCreateProject
  Scenario: Once Logged in I'm on the Norman Page
    Given I am on the Landing Page
    When  I click New Project Link
    And  I enter Project Name "SMARTTEMPLATE"
    Then Project "SMARTTEMPLATE" is created

  @flow
  @OpenTheCreatedProject
  Scenario: Once a project is created
    Given Project "SMARTTEMPLATE" exists
    When I click to enter the project
    Then I am in the prototype page
    Then I see the View All Map
    When  I click the View All Map Icon
    And   I click Add button to add first list report
    Then  There are "1" Pages Created
    And   I click Project in the Menu
    And   I am in the prototype page
    When I click on thumbnail of page "Page 1"
    Then I open data modeler

  @flow
  @CreateBlankDataModel
  Scenario: I choose to create a data Model from an Excel file
    Given Data modeler page is displayed
    #file located in test/testcase folder of this project
    Then I upload XL file: "../files/SmartTemplateDemoData.xlsx"

  @flow
  @CheckSalesOrderEntityExistsAndClickOnIt
  Scenario: Create a DataModel: Check that SalesOrder entity is existing
    Given Data modeler page is displayed
    Given Exists Entity "SalesOrder"
    Then I click on Entity named "SalesOrder"

  @flow
  @CheckPropertiesForEntitySalesOrder
  Scenario: Create a DataModel: check SalesOrder entity properties
    Given Data modeler page is displayed
    #  ID's type is not to be considered in the second list, so the first type is for the second property
    Then I check properties for entity "SalesOrder" are "ID,Name,Status,CreationDate" of type "String,String,String"

  @flow
  @CheckCustomerExistsAndClickOnIt
  Scenario: Create a DataModel: Check that Customer entity is existing
    Given Data modeler page is displayed
    Given Exists Entity "Customer"
    Then I click on Entity named "Customer"

  @flow
  @CheckSalesOrderItemExistsAndClickOnIt
  Scenario: Create a DataModel: Check that SalesOrderItem entity is existing
    Given Data modeler page is displayed
    Given Exists Entity "SalesOrderItem"
    Then I click on Entity named "SalesOrderItem"

  @flow
  @CheckProductItemExistsAndClickOnIt
  Scenario: Create a DataModel: Check that Product entity is existing
    Given Data modeler page is displayed
    Given Exists Entity "Product"
    Then I click on Entity named "Product"

  @flow
  @OpenUiComposer
  Scenario: Create a DataModel: Open UI Composer
    Given Data modeler page is displayed
    Then I click on UI Composer


  @flow
  @ChooseUiComposerType
  Scenario: UI Composer - Smart Template: set main entity and filter
    # To import Excel file, the page is reload (browser refresh, then the back navigation is directed to page map and not to UI Composer
    Given I am on Page map page
    Then I click on Project in the menu
    When I click on thumbnail of page "Page 1"
    Then I am in ui composer canvas view
#    Then I click on outline item named "Page 1"
#    Then In Properties I click on Main Object Dropdown
#    Then I choose main Entity as "SalesOrder"
#    Then I click on outline item named "Filter bar"
#    Then I click on outline item named "Filter Filter 1"
#    Then I choose to filter on property named "Name"



