import { option, config, file as _file, baseline, dynamicData, debug } from 'commander';
import { existsSync, readdirSync } from 'fs';
import _ from 'lodash';
import { resolve } from 'path';
import createFormattedObjects from './src/core/parser';
import { reporter } from './src/core/reporter';
//import multipart from 'C:/Users/nagaluru/Downloads/node-main/tsconfig.json';
import packageConfig from './package.json' assert { type: 'json' };

option('-f, --file <filePath>', 'Path to the file OR folder containing files to be compared',)
.option('-b, --baseline <baselinePath>', 'Path to the baseline file OR folder containing baseline files against which comparison is to be made')
.option('-d, --dynamic-data <dynamicDataPath>', 'Path to dynamic data file or folder containing dynamic data files')
.option('-c, --config <configPath>', 'Path to configuration file - config object values in dynamic data file will override corresponding values from this file')
.option('--debug', 'Run in debug mode. Detailed processing steps are listed when run in debug mode.')
.parse(process.argv);

const getResolvedPath = async (cmdPath, type) => {
    if (type === 'config') {
        if (cmdPath) {
            if (cmdPath.includes('.json')) {
                if (existsSync(resolve(cmdPath)))
                    return await resolve(cmdPath);
                else if (existsSync(resolve(`${process.cwd()}/config/${cmdPath}`)))
                    return await resolve(`${process.cwd()}/config/${cmdPath}`);
                else
                    throw new Error(`Cannot resolve '${cmdPath}' to any valid file or folder location. Please make sure specified path is correct.`);
            } else 
                throw new Error(`Please specify a valid file as config file.`);
        } else {
            return await resolve(`${process.cwd()}/config/default.json`);
        }
    }
    if (cmdPath) {
        if (cmdPath.split('.').length === 2 && !cmdPath.startsWith('./') && !cmdPath.startsWith('.\\') && !cmdPath.endsWith('.pdf') && type !== 'dynamic-data')
            throw new Error(`The file specified is not a PDF. Please specify a valid PDF as ${type === 'baseline' ? 'baseline' : 'test'} file.`);
        if (existsSync(resolve(cmdPath)))
            return await resolve(cmdPath);
        else if (existsSync(resolve(`${process.cwd()}/data/${type}/${cmdPath}`)))
            return await resolve(`${process.cwd()}/data/${type}/${cmdPath}`);
        else
            throw new Error(`Cannot resolve '${cmdPath}' to any valid file or folder location. Please make sure specified path is correct.`);
    } else
        return await resolve(`${process.cwd()}/data/${type}`);
};

const determineFile = (pathToSearch, testfilename, isBaseline) => {
    if ((isBaseline && pathToSearch.includes('.pdf')) || (!isBaseline && pathToSearch.includes('.json'))) {
        return pathToSearch;
    } else if (existsSync(resolve(`${pathToSearch}/${testfilename.replace('.pdf', isBaseline ? '.pdf' : '.json')}`))) {
        return resolve(`${pathToSearch}/${testfilename.replace('.pdf', isBaseline ? '.pdf' : '.json')}`);
    } else if (isBaseline) {
        const files = readdirSync(pathToSearch);
        let filename = '';
        let maxCharMatched = 0;
        for (const file of files) {
            if (file.endsWith('.pdf')) {
                const length = file.length > testfilename.length ? testfilename.length : file.length;
                let matchedCharCount = 0;
                for (let i = 0; i < length; i++) {
                    if (file[i].toLowerCase() === testfilename[i].toLowerCase())
                        matchedCharCount++;
                    else
                        break;
                }
                if (matchedCharCount > maxCharMatched) {
                    filename = file;
                    maxCharMatched = matchedCharCount;
                }
            }
        }
        if (filename !== '')
            return resolve(`${pathToSearch}/${filename}`);
        else
            throw new Error(`No file exists in '${pathToSearch}' that can be used as baseline to test '${testfilename}'`);
    } else
        return '';
};

const wait = ms => new Promise((r, j)=>setTimeout(r, ms));

const compareAllPDFs = async (iterationArray, reportsObjArray, configObj) => {
    for (let i = 0; i < iterationArray.length; i++) {
        if (!iterationArray[i].failed) {
            try {
                iterationArray[i].wait = true;
                await console.log(`====== Performing Verifications For : ${iterationArray[i].testFile} ======`);
                await createFormattedObjects(iterationArray[i], reportsObjArray[i], configObj);
            } catch (err) {
                iterationArray[i].failed = true;
                await console.error(`Error Occurred For Test File : ${iterationArray[i].testFile}`);
                await console.error(err.message);
                // await console.error(err.stack);
                delete iterationArray[i].wait;
            }
            while (iterationArray[i].wait) {
                await wait(100);
            }
        }
    }
    await reporter.generateReport(configObj);
};

const main = async () => {
    try {
        const iterationArray = [];
        const reportsObjArray = reporter.getReportsObjArray();
        const resolvedConfigPath = await getResolvedPath(config, 'config');
        const resolvedTestfilePath = await getResolvedPath(_file, 'file');
        const resolvedBaselinePath = await getResolvedPath(baseline, 'baseline');
        const resolvedDynamicDataPath = await getResolvedPath(dynamicData, 'dynamic-data');
        const configObj = require(resolvedConfigPath);
        if (debug) configObj.debug = true;
        if (resolvedTestfilePath.includes('.pdf')) {
            const filename = resolvedTestfilePath.substring(resolvedTestfilePath.lastIndexOf(process.platform === 'win32' ? '\\' : '/') + 1);
            const reportObj = await reporter.createReportObj(filename, resolvedConfigPath);
            const iterationObj = {};
            await reporter.addParentStep(reportObj, 'Determine Baseline and Dynamic Data Files', configObj.debug);
            iterationObj.testFile = resolvedTestfilePath;
            try {
                iterationObj.baselineFile = determineFile(resolvedBaselinePath, filename, true);
                await reporter.addChildStep(reportObj, 'Determine baseline file to use', 'passed', iterationObj.baselineFile);
            } catch (err) {
                await reporter.addChildStep(reportObj, 'Determine baseline file to use', 'failed', err.message);
                await console.error(err.message);
                iterationObj.failed = true;
            }
            iterationObj.dynamicDataFile = determineFile(resolvedDynamicDataPath, filename, false);
            if (!iterationObj.failed && iterationObj.dynamicDataFile) await reporter.addChildStep(reportObj, 'Determine dynamic data file to use', 'passed', iterationObj.dynamicDataFile);
            iterationArray.push(iterationObj);
            reportsObjArray.push(reportObj);
        } else {
            const testFiles = readdirSync(resolvedTestfilePath);
            for (const testFileName of testFiles) {
                if (testFileName.endsWith('.pdf')) {
                    const reportObj = await reporter.createReportObj(testFileName, resolvedConfigPath);
                    const iterationObj = {};
                    await reporter.addParentStep(reportObj, 'Determine Baseline and Dynamic Data Files', configObj.debug);
                    iterationObj.testFile = resolve(`${resolvedTestfilePath}/${testFileName}`);
                    try {
                        iterationObj.baselineFile = determineFile(resolvedBaselinePath, testFileName, true);
                        await reporter.addChildStep(reportObj, 'Determine baseline file to use', 'passed', iterationObj.baselineFile);
                    } catch (err) {
                        await reporter.addChildStep(reportObj, 'Determine baseline file to use', 'failed', err.message);
                        await console.error(err.message);
                        iterationObj.failed = true;
                    }
                    iterationObj.dynamicDataFile = determineFile(resolvedDynamicDataPath, testFileName, false);
                    if (!iterationObj.failed && iterationObj.dynamicDataFile) await reporter.addChildStep(reportObj, 'Determine dynamic data file to use', 'passed', iterationObj.dynamicDataFile);
                    iterationArray.push(iterationObj);
                    reportsObjArray.push(reportObj);
                }
            }
        }
        await compareAllPDFs(iterationArray, reportsObjArray, configObj);
    } catch (err) {
        await console.error(err.stack);
    }
};

main();