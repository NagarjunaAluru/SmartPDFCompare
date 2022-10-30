import { PDFparser } from 'pdf2json';
//import PDFparser from "pdf2json";
//import PDFparser from 'pdf2json';
//const multipart = require('C:/Users/nagaluru/Downloads/node-main/tsconfig.json');
import { filter, findIndex, findLastIndex } from 'lodash';
import { startComparison } from './comparer';
import { addChildStep, addParentStep } from './reporter';
import { objectsMerged, replaceDynamicDataInBaselineObj } from './dataHandler';
import { log, setLogLevel } from './logger';
//import myJson from './package.json' assert {type: 'json'};

const wait = ms => new Promise((r, j)=>setTimeout(r, ms));

const getUniqueKey = (obj, str) => {
    let i = 1;
    while(obj[`${str}${i++}`] !== undefined);
    return `${str}${--i}`;
};

const decodeText = async (textsArr) => {
    for (let i = 0; i < textsArr.length; i++) {
        if (textsArr[i].R !== undefined) {
            for (let j = 0; j < textsArr[i].R.length; j++) {
                (textsArr[i].R)[j].T = await decodeURIComponent((textsArr[i].R)[j].T);
            }
        }
    }
};

const isMergeableObj = (obj1, obj2, configObj) => {
    if (!configObj.doNotMergeObj && obj1.y === obj2.y && obj1.clr === obj2.clr && obj1.A === obj2.A && (obj1.x + obj1.w/configObj.wToXCoversionFactor + configObj.maxXDiffForObjMerge >= obj2.x)) {
        if (configObj.mergeOnlyIfTextAttrMatches) {
            if (obj1.R.length === 1 && obj2.R.length === 1 && obj1.R[0].S === obj2.R[0].S && obj1.R[0].TS[0] === obj2.R[0].TS[0] && obj1.R[0].TS[1] === obj2.R[0].TS[1] && obj1.R[0].TS[2] === obj2.R[0].TS[2] && obj1.R[0].TS[3] === obj2.R[0].TS[3])
                return true;
            else
                return false;
        }
        return true;
    } else 
        return false;
};

const setPageBoundaries = (jsonObj, configObj) => {
    for (let i = 0; i < jsonObj.formImage.Pages.length; i++) {
        jsonObj.formImage.Pages[i].minY = configObj.topMarginInches * configObj.inchToPageUnitConversionFactor;
        jsonObj.formImage.Pages[i].maxY = jsonObj.formImage.Pages[i].Height - (configObj.bottomMarginInches * configObj.inchToPageUnitConversionFactor);
        jsonObj.formImage.Pages[i].minX = configObj.leftMarginInches * configObj.inchToPageUnitConversionFactor;
        jsonObj.formImage.Pages[i].maxX = jsonObj.formImage.Width - (configObj.rightMarginInches * configObj.inchToPageUnitConversionFactor);
    }
};

const identifyHeaderFooterElements = (jsonObj) => {
    for (let i = 0; i < jsonObj.formImage.Pages.length; i++) {
        _.filter(jsonObj.formImage.Pages[i].Texts, obj => { 
            if (obj.y < jsonObj.formImage.Pages[i].minY) return obj;
        }).forEach(element => {
            element.header = true;
        });

        _.filter(jsonObj.formImage.Pages[i].Texts, obj => {
            if (obj.y > jsonObj.formImage.Pages[i].maxY) return obj;
        }).forEach(element => { 
            element.footer = true; 
        });
    }
};

const assignPageNumberAndLineNumber = async (jsonObj, configObj) => {
    const pageObjArray = jsonObj.formImage.Pages;
    for (let i = 0; i < pageObjArray.length; i++) {
        const pageObj = pageObjArray[i];
        const tempArr = pageObj.Texts;
        let lineNumber = 1;
        let prevLineY = 0;
        pageObj.pageNumber = i + 1;
        for (let j = 0; j < tempArr.length; j++) {
            tempArr[j].pageNumber = i + 1;
            if (!tempArr[j].header && !tempArr[j].footer) {
                if (j > 0 && Math.abs(tempArr[j].y - tempArr[j-1].y) > configObj.minYDiffBetweenLines && !tempArr[j-1].header && !tempArr[j-1].footer) {
                    lineNumber++;
                    prevLineY = tempArr[j-1].y;
                }
                tempArr[j].lineNumber = lineNumber;
                tempArr[j].yDiffWithPrevLine = tempArr[j].y - prevLineY;
            }
        }
        pageObj.Texts = tempArr;
        await decodeText(pageObj.Texts);
    }
};

const mergeTextObjects = async (jsonObj, configObj) => {
    const pageObjArray = jsonObj.formImage.Pages;
    for (let i = 1; i <= pageObjArray.length; i++) {
        const pageObj = pageObjArray[i-1];
        let tempArr = pageObj.Texts;
        let lineNumber = 1;

        const headerObjArr = _.filter(tempArr, obj => { if (obj.header) return obj; });
        for (let j = 0; j < headerObjArr.length; j++) {
            if ((j < headerObjArr.length - 1) && dataHandler.objectsMerged(headerObjArr[j], headerObjArr[j+1], configObj)) {
                headerObjArr.splice(j+1, 1);
                j--;
            }
        }
        if (headerObjArr.length) {
            _.filter(tempArr, obj => { if (obj.header) return obj; }).forEach(element => tempArr.splice(tempArr.indexOf(element), 1));
            tempArr = headerObjArr.concat(tempArr);
        }

        const footerObjArr = _.filter(tempArr, obj => { if (obj.footer) return obj; });
        for (let j = 0; j < footerObjArr.length; j++) {
            if ((j < footerObjArr.length - 1) && dataHandler.objectsMerged(footerObjArr[j], footerObjArr[j+1], configObj)) {
                footerObjArr.splice(j+1, 1);
                j--;
            }
        }
        if (footerObjArr.length) {
            _.filter(tempArr, obj => { if (obj.footer) return obj; }).forEach(element => tempArr.splice(tempArr.indexOf(element), 1));
            tempArr = tempArr.concat(footerObjArr);
        }
        // Original approach for merging obhects - new approach seems better, but keeping old one in case revert is needed //
        /* do {
            lineObjArr = _.filter(tempArr, obj => { if (obj.pageNumber === i && obj.lineNumber === lineNumber) return obj; });
            for (let j = 0; j < lineObjArr.length; j++) {
                if ((j < lineObjArr.length - 1) && dataHandler.objectsMerged(lineObjArr[j], lineObjArr[j+1], configObj)) {
                    lineObjArr.splice(j+1, 1);
                    j--;
                }
            }
            if (lineObjArr.length) {
                _.filter(tempArr, obj => { if (obj.pageNumber === i && obj.lineNumber === lineNumber) return obj; }).forEach(element => tempArr.splice(tempArr.indexOf(element), 1));
                tempArr = tempArr.slice(0, _.findLastIndex(tempArr, obj => { if (obj.pageNumber === i && lineNumber === 1 ? obj.header : obj.lineNumber === lineNumber - 1) return obj; }) + 1)
                            .concat(lineObjArr)
                            .concat(tempArr.slice(_.findLastIndex(tempArr, obj => { if (obj.pageNumber === i && lineNumber === 1 ? obj.header : obj.lineNumber === lineNumber - 1) return obj; }) + 1));
            }
            lineNumber++;
        } while (lineObjArr.length); */
        // ---------------------------------------------------------------------------------------------------------------- //

        // New approach for merging objects
        while (true) {
            let lineStartInd = _.findIndex(tempArr, obj => { if (obj.pageNumber === i && obj.lineNumber === lineNumber) return obj; });
            let lineEndInd = _.findLastIndex(tempArr, obj => { if (obj.pageNumber === i && obj.lineNumber === lineNumber) return obj; });
            if ((lineStartInd === -1) || (lineEndInd === -1)) break;
            for (let j = lineStartInd; j < lineEndInd; j++) {
                if (dataHandler.objectsMerged(tempArr[j], tempArr[j+1], configObj)) {
                    tempArr.splice(j+1, 1);
                    j--;
                    lineEndInd--;
                }
            }
            lineNumber++;
        }

        pageObj.Texts = tempArr;
    }
};

const getFormattedJSON = async (jsonObj, reportObj, configObj, type, dynamicDataObj) => {
    try {
        await setPageBoundaries(jsonObj, configObj);
        await identifyHeaderFooterElements(jsonObj);
        await assignPageNumberAndLineNumber(jsonObj, configObj);
        await mergeTextObjects(jsonObj, configObj);
        await reporter.addChildStep(reportObj, `Format ${type} Object`, 'passed', JSON.stringify(jsonObj, null, '  '));
    } catch (err) {
        await reporter.addChildStep(reportObj, `Format ${type} Object`, 'failed', err.message);
        throw err;
    }

    if (dynamicDataObj) {
        await reporter.addParentStep(reportObj, 'Replace Dynamic Data In Baseline Object', configObj.debug);
        try {
            await dataHandler.replaceDynamicDataInBaselineObj(jsonObj, dynamicDataObj, configObj);
            await reporter.addChildStep(reportObj, 'Replace Dynamic Data In Baseline Object', 'passed', JSON.stringify(jsonObj, null, '  '));
        } catch (err) {
            await reporter.addChildStep(reportObj, 'Replace Dynamic Data In Baseline Object', 'failed', err.stack);
        }
    }
    return jsonObj;
};

const loadFiles = async (iterationObj, reportObj, configObj, dynamicDataObj) => {
    const fileParser = new PDFparser();
    fileParser.on('pdfParser_dataError', async (errData) => {
        await reporter.addChildStep(reportObj, 'Parse Test File', 'failed', errData.parserError);
        throw errData.parserError;
    });
    fileParser.on('pdfParser_dataReady', async (pdfData) => {
        await reporter.addChildStep(reportObj, 'Parse Test File', 'passed', configObj.includeParsedJSONToReport ? JSON.stringify(pdfData, null, '  ') : undefined);
        const baselineParser = new PDFparser();
        baselineParser.on('pdfParser_dataError', async (errData) => {
            await reporter.addChildStep(reportObj, 'Parse Baseline File', 'failed', errData.parserError);
            throw errData.parserError;
        });
        baselineParser.on('pdfParser_dataReady', async (baselineData) => {
            await reporter.addChildStep(reportObj, 'Parse Baseline File', 'passed', configObj.includeParsedJSONToReport ? JSON.stringify(baselineData, null, '  ') : undefined);
            await reporter.addParentStep(reportObj, 'Format Parsed Objects', configObj.debug);
            const testFileObj = await getFormattedJSON(pdfData, reportObj, configObj, 'Test');
            const baselineObj = await getFormattedJSON(baselineData, reportObj, configObj, 'Baseline', dynamicDataObj);
            await compare.startComparison(baselineObj, testFileObj, configObj, iterationObj, reportObj);
            delete iterationObj.wait;
        });
        await logger.log(`\nParsing : ${iterationObj.baselineFile}`, 2);
        await baselineParser.loadPDF(iterationObj.baselineFile);
    });
    await reporter.addParentStep(reportObj, 'Parse Test File and Baseline File', configObj.debug);
    await logger.log(`\nParsing : ${iterationObj.testFile}`, 2);
    await fileParser.loadPDF(iterationObj.testFile);
};

const getFileName = (path) => path.substring(path.lastIndexOf(process.platform === 'win32' ? '\\' : '/') + 1);

const createFormattedObjects = async (iterationObj, reportObj, config) => {
    let dynamicDataObj;
    let dataObj;
    let configObj;
    // Parse Dynamic Data File
    if (iterationObj.dynamicDataFile.includes('.json')) {
        await reporter.addParentStep(reportObj, 'Parse Dynamic Data File', config.debug);
        try {
            dataObj = require(iterationObj.dynamicDataFile);
            await reporter.addChildStep(reportObj, 'Parse Dynamic Data File', 'passed', JSON.stringify(dataObj, null, '  '));
        } catch (err) {
            await reporter.addChildStep(reportObj, 'Parse Dynamic Data File', 'failed', err.message);
            throw err;
        }       
    }
        
    dynamicDataObj = dataObj !== undefined ? dataObj.dynamicData : undefined;
    
    await reporter.addParentStep(reportObj, 'Determine Configuration Options', config.debug);
    try {
        configObj = JSON.parse(JSON.stringify(config));
        if (dataObj !== undefined && dataObj.config !== undefined && Object.keys(dataObj.config).length) {
            Object.assign(configObj, dataObj.config);
        }
        if (configObj.logLevel !== undefined) {
            logger.setLogLevel(configObj.logLevel);
        }
        await reporter.addChildStep(reportObj, 'Determine Configuration Options', 'passed', JSON.stringify(configObj, null, '  '));
    } catch (err) {
        await reporter.addChildStep(reportObj, 'Determine Configuration Options', 'failed', err.message);
        throw err;
    }
    reportObj.description = `Test File: <a href="${iterationObj.testFile}" target="_blank">${getFileName(iterationObj.testFile)}</a>
        Baseline File: <a href="${iterationObj.baselineFile}" target="_blank">${getFileName(iterationObj.baselineFile)}</a>`
        .concat(reportObj.resolvedConfigPath ? `\nConfiguration File: <a href="${reportObj.resolvedConfigPath}" target="_blank">${getFileName(reportObj.resolvedConfigPath)}</a>` : '')
        .concat(iterationObj.dynamicDataFile ? `\nDynamic Data File: <a href="${iterationObj.dynamicDataFile}" target="_blank">${getFileName(iterationObj.dynamicDataFile)}</a>` : '')
        .concat(`\nComparison Mode: ${configObj.customValidation ? 'Custom' : 'Generic'}`)
        .concat(`\nTest Coverage: ${configObj.completeValidation ? 'Complete' : 'Content Only'}`);
    delete reportObj.resolvedConfigPath;
    await loadFiles(iterationObj, reportObj, configObj, dynamicDataObj);
};

// module.exports = {
//     createFormattedObjects,
// }
//module.exports.createFormattedObjects = createFormattedObjects
export default createFormattedObjects;