import { generate } from 'cucumber-html-reporter';
import { resolve } from 'path';
import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync, writeFileSync } from 'fs';
//import { description, version } from '../../package.json';

let reportsArray = [];
const startTime = Date.now();
let reportPath;

const setTotalTime = (options) => {
    let totalTime = Date.now() - startTime;
    if (totalTime < 60 * 1000) {
        options.metadata['Total Time Taken'] = `${totalTime / 1000} Seconds`;
    } else if (totalTime < 60 * 60 * 1000) {
        const mins = Math.floor(totalTime / (60 * 1000));
        options.metadata['Total Time Taken'] = `${mins} Minutes - ${(totalTime - mins * (60 * 1000)) / 1000} Seconds`;
    }
};

const cleanUpReportsFolder = (configObj) => {
    const numOfReportsToKeep = configObj.keepPrevReports ? configObj.keepPrevReports : 0;
    const reportsFolderPath = resolve(`${process.cwd()}/reports`);
    if (!existsSync(reportsFolderPath)) {
        mkdirSync(reportsFolderPath);
    } else {
        const reportsArr = [];
        readdirSync(reportsFolderPath).forEach((fileName) => {
            if (fileName.startsWith('report') && fileName.endsWith('.html')) {
                reportsArr.push(fileName);
            }
        });
        const resolvedPaths = reportsArr.map(name => ({ name, time: statSync(resolve(`${reportsFolderPath}/${name}`)).mtime.getTime() }))
        .sort((a, b) => a.time - b.time)
        .map(obj => resolve(`${reportsFolderPath}/${obj.name}`));
        for (let i = 0; i < resolvedPaths.length; i++) {
            if (resolvedPaths.length - i >= numOfReportsToKeep) {
                unlinkSync(resolve(resolvedPaths[i]));
            }
        }
    }
};

const removeDebugSteps = async() => {
    for (const reportObj of reportsArray) {
        for (let i = 0; i < reportObj.elements.length; i++) {
            if (!reportObj.elements[i].display) {
                reportObj.elements.splice(i, 1);
                i--;
            }
        }
    }
};

const generateReport = async (configObj) => {
    const date = new Date();
    const dateStr = date.toLocaleString().replace(/\//g, '-').replace(',', '-').replace(' ', '-').replace(/:/g, '-').replace(/[\s]+.*/g, '');
    const options = {
        theme: 'hierarchy', // ['bootstrap', 'hierarchy', 'foundation', 'simple']
        jsonFile: resolve(`${process.cwd()}/reports/report.json`),
        //Added Folder name as well so that genrated reports will be inside folder
        output: resolve(`${process.cwd()}/reports/${dateStr}/report_${dateStr}.html`),
        brandTitle: `${description}`,
        reportSuiteAsScenarios: true,
        //Made False so that another report not open in new Browser
        launchReport: false,
        metadata: {
            "Version": `${version}`,
            "Date": date,
            "Platform": process.platform,
        }
    };
    reportPath=options.output;
    setTotalTime(options);
    await cleanUpReportsFolder(configObj);
    await removeDebugSteps();
    await writeFileSync(resolve(`${process.cwd()}/reports/report.json`), JSON.stringify(reportsArray));
    await generate(options);
    await unlinkSync(resolve(`${process.cwd()}/reports/report.json`));
};

const getReportPath=() => reportPath;

const createReportObj = async (name, resolvedConfigPath) => {
    const reportObj = {
        keyword: 'File',
        id: name.replace(/ /ig, '_').replace(/.pdf/ig, ''),
        name,
        uri: '',
        resolvedConfigPath,
        elements: []
    };
    return reportObj;
};

const addParentStep = (reportObj, name, display) => {
    const obj = {
        keyword: 'Step',
        id: reportObj.id.concat(name.replace(/ /g, '_')),
        name,
        display,
        type: 'scenario',
        steps: []
    };
    reportObj.elements.push(obj);
};

const addChildStep = (reportObj, name, status, msg) => {
    const obj = {
        name,
        keyword: '',
        result: status === 'failed' ? { error_message: msg, status } : { status },
        match: {}
    };
    if (status !== 'failed' && msg !== undefined) obj.text = msg;
    reportObj.elements[reportObj.elements.length - 1].steps.push(obj);
};

const getReportsObjArray = () =>{
    reportsArray= []; 
    return reportsArray;} ;

export default {
    addChildStep,
    addParentStep,
    createReportObj,
    generateReport,
    getReportsObjArray,
    getReportPath,
}