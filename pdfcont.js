import { option, config, file as _file, baseline, dynamicData, debug } from 'commander';
import { existsSync, readdirSync } from 'fs';
import _ from 'lodash';
import { resolve } from 'path';
import { parser } from './src/core/parser';
import { reporter } from './src/core/reporter';
var batchIO ;
var progressCounter = {
    current: 0,
    total: 0
  };

commander
.option('-f, --file <filePath>', 'Path to the file OR folder containing files to be compared')
.option('-b, --baseline <baselinePath>', 'Path to the baseline file OR folder containing baseline files against which comparison is to be made')
.option('-d, --dynamic-data <dynamicDataPath>', 'Path to dynamic data file or folder containing dynamic data files')
.option('-c, --config <configPath>', 'Path to configuration file - config object values in dynamic data file will override corresponding values from this file')
.parse(process.argv);

const getResolvedPath = async (cmdPath, type) => {
    if (type === 'config') {
        if (cmdPath) {
            if (cmdPath.includes('.json')) {
                if (fs.existsSync(path.resolve(cmdPath)))
                    return await path.resolve(cmdPath);
                else if (fs.existsSync(path.resolve(`${process.cwd()}/config/${cmdPath}`)))
                    return await path.resolve(`${process.cwd()}/config/${cmdPath}`);
                else
                    throw new Error(`Cannot resolve '${cmdPath}' to any valid file or folder location. Please make sure specified path is correct.`);
            } else 
                throw new Error(`Please specify a valid file as config file.`);
        } else {
            return await path.resolve(`${process.cwd()}/config/default.json`);
        }
    }
    if (cmdPath) {
        try {
         //   await fs.promises.access("somefile");
            // The check succeeded
            if (cmdPath.includes('.') && !cmdPath.endsWith('.pdf') && type !== 'dynamic-data')
            throw new Error(`The file specified is not a PDF. Please specify a valid PDF as ${type === 'baseline' ? 'baseline' : 'test'} file.`);
            if (fs.existsSync(path.resolve(cmdPath)))
            return await path.resolve(cmdPath);
        else if (fs.existsSync(path.resolve(`${process.cwd()}/data/${type}/${cmdPath}`)))
            return await path.resolve(`${process.cwd()}/data/${type}/${cmdPath}`);
        else
            throw new Error(`Cannot resolve '${cmdPath}' to any valid file or folder location. Please make sure specified path is correct.`);
        } catch (error) {
            console.log(error)
            }
        } 
        else
        return await path.resolve(`${process.cwd()}/data/${type}`);
};

const determineFile = (pathToSearch, testfilename, isBaseline) => {
    if ((isBaseline && pathToSearch.includes('.pdf')) || (!isBaseline && pathToSearch.includes('.json'))) {
        return pathToSearch;
    } else if (fs.existsSync(path.resolve(`${pathToSearch}/${testfilename.replace('.pdf', isBaseline ? '.pdf' : '.json')}`))) {
        return path.resolve(`${pathToSearch}/${testfilename.replace('.pdf', isBaseline ? '.pdf' : '.json')}`);
    } else if (isBaseline) {
        const files = fs.readdirSync(pathToSearch);
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
            return path.resolve(`${pathToSearch}/${filename}`);
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
                await parser.createFormattedObjects(iterationArray[i], reportsObjArray[i], configObj);
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
            batchIO.emit('system:batchprogress', { progress: i+1 });
        }
    }
    await reporter.generateReport(configObj);
};


// const main = async () => {
//     console.log("$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$4");
//     const resolvedConfigPath = await getResolvedPath(commander.config, 'config');
//     const resolvedTestfilePath = await getResolvedPath(commander.file, 'file');
//     const resolvedBaselinePath = await getResolvedPath(commander.baseline, 'baseline');
//     const resolvedDynamicDataPath = await getResolvedPath(commander.dynamicData, 'dynamic-data');
//     var remoteExecInput = {
//         testFname: resolvedTestfilePath,
//         baselineFname: resolvedBaselinePath,
//         dynamicDataFname: resolvedDynamicDataPath,
//         configFname: resolvedConfigPath
//     };
//     await processpdf(remoteExecInput);
// }
const compareSinglepdf = async(remoteExecInput) => {
   await processpdf(remoteExecInput);
}

const compareBatchpdf = async(io) => {
    var remoteExecInput = {
        testFname: "./data/file",
        baselineFname: "./data/baseline",
        dynamicDataFname: "./data/dynamic-data",
        configFname: "./config/default.json"
    };
    batchIO = io;
    await processpdf(remoteExecInput);
 }

const processpdf = async (remoteExecInput) => {
    try {
        const iterationArray = [];
        const reportsObjArray = reporter.getReportsObjArray();
        await console.log("************Calling get resolved Path");
        const resolvedConfigPath =remoteExecInput.configFname;
        const resolvedTestfilePath = remoteExecInput.testFname;
        const resolvedBaselinePath = remoteExecInput.baselineFname;
        const resolvedDynamicDataPath = remoteExecInput.dynamicDataFname;
        const configObj = require(resolvedConfigPath);
        await console.dir(configObj);
        if (resolvedTestfilePath.includes('.pdf')) {
            const filename = resolvedTestfilePath.substring(resolvedTestfilePath.lastIndexOf(process.platform === 'win32' ? '\\' : '/') + 1);
            const reportObj = await reporter.createReportObj(filename, resolvedConfigPath);
            const iterationObj = {};
            await reporter.addParentStep(reportObj, 'Determine Baseline and Dynamic Data Files');
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
            const testFiles = fs.readdirSync(resolvedTestfilePath);
            for (const testFileName of testFiles) {
                if (testFileName.endsWith('.pdf')) {
                    const reportObj = await reporter.createReportObj(testFileName, resolvedConfigPath);
                    const iterationObj = {};
                    await reporter.addParentStep(reportObj, 'Determine Baseline and Dynamic Data Files');
                    iterationObj.testFile = path.resolve(`${resolvedTestfilePath}/${testFileName}`);
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

function updateBatchProgress(testObj) {
    try {
      rtpSummaryObj.push(testObj.Result.checkpoints.rptJson[0]);
    } catch (e) {
      console.log(e);
    }
    console.log(colors.white(progressCounter.current + " of " + progressCounter.total + " validated."));
    updateProgress(progressCounter.current);
  }
module.exports = {
    compareSinglepdf,getResolvedPath,compareBatchpdf
}

//main();