/**
 * @name config.js
 * @description This will configure pdfcompare tool only, NOT webapp.
 * @author Rajesh Kumar Mahato <rajesh-kumar.mahato@capgemini.com>
 */

 export const config = {
    toolName: "Smart Compare Tool",
    toolVersion: "v4.0.102",
    toolServerIP:"http://localhost",
    toolServerPort:8080,
    toolReportingTheme: "bootstrap",
    projectName: "Customized for Demo",
    testEnvironment: "TST01",
    testSprint: "1",
    testPhase: "1",
    testPDFDirectory: "./data/file/",
    baselinePDFDirectory: "./data/baseline/",
    testResultDirectory: "./reports",
    dynamicDataDirectory: "./data/dynamic-data/",
    //legacyPDFDirectory: "./legacy_pdfs/",
    "include": ["src/**/*.ts"],
    "exclude": ["node_modules", "tests"],
    mode: "batch"
};
