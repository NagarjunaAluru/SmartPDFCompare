import { filter, merge, findLastIndex } from 'lodash';
import { log } from './logger';
import reporter from './reporter';
import { handleLineBreak, handleLineMerge, reassignLineNumForTableSection, handleLineNumberMismatch } from './dataHandler';

const getPageText = async (textsArr) => {
    let str = '';
    for (const obj of textsArr) {
        if (obj.R.length === 1) {
            if (!obj.header && !obj.footer) {
                str = await str.concat(obj.R[0].T);
            }
        }
        else
            throw new Error('Object has multiple R elements');
    }
    return str;
};

const compareCompleteText = async (baselineObj, testFileObj, configObj, iterationObj, reportObj) => {
    let baselineText = '';
    let testFileText = '';
    for (let i = 0; i < baselineObj.formImage.Pages.length; i++) {
        baselineText = await baselineText.concat(await getPageText(baselineObj.formImage.Pages[i].Texts));
    }
    for (let i = 0; i < testFileObj.formImage.Pages.length; i++) {
        testFileText = await testFileText.concat(await getPageText(testFileObj.formImage.Pages[i].Texts));
    }

    await reporter.addParentStep(reportObj, 'Verify Complete Text Of Document'.concat(configObj.ignoreWhiteSpace ? ' (Ignoring White Space)' : ''), true);
    const stepName = 'Verify Complete Document Text'.concat(configObj.ignoreWhiteSpace ? ' (Ignoring White Space)' : '');
    if (baselineText === testFileText) {
        await reporter.addChildStep(reportObj, stepName, 'passed', `Actual Document Text Exactly Matches To Expected Document Text:\n\nExpected: ${baselineText}\n\n  Actual: ${testFileText}`);
    } else if (baselineText.replace(/[\s]*/g, '') === testFileText.replace(/[\s]*/g, '')) {
        if (configObj.ignoreWhiteSpace) {
            await reporter.addChildStep(reportObj, stepName, 'passed', `Actual Document Text Exactly Matches To Expected Document Text When White Space Is Ignored:\n\nExpected: ${baselineText}\n\n  Actual: ${testFileText}`);
        }
        else {
            await reporter.addChildStep(reportObj, stepName, 'skipped', `Actual Document Text Doesn\'t Exactly Match To Expected Document Text, Unless White Space Is Ignored:\n\nExpected: ${baselineText}\n\n  Actual: ${testFileText}`);
        }
    } else {
        while (baselineText.length && testFileText.length) {
            if (baselineText[0] === testFileText[0]) {
                baselineText = baselineText.replace(baselineText[0], '');
                testFileText = testFileText.replace(testFileText[0], '');
            } else {
                break;
            }
        }
        await reporter.addChildStep(reportObj, stepName, 'failed', `Actual Document Text Doesn\'t Exactly Match To Expected Document Text (Ignoring Spaces)\n\nMismatch Starts at below point:\n\nExpected: ${baselineText}\n\n  Actual: ${testFileText}`);
        iterationObj.failed = true;
    }
};

const getTextArray = async (pdfObj) => {
    let resultArr = [];
    const pagesArr = pdfObj.formImage.Pages;
    for (let j = 0; j < pagesArr.length; j++) {
        resultArr = await resultArr.concat(pagesArr[j].Texts);
    }
    for (let i = 0; i < resultArr.length; i++) {
        if (resultArr[i].header || resultArr[i].title || resultArr[i].footer) {
            resultArr.splice(i, 1);
            i--
        }
    }
    return resultArr;
};

const checkForLineWrap = async (baselineTextArr, testFileTextArr, i, k, msg, status, configObj, baselineObj, testFileObj) => {
    await log(`i: ${i}`, 3);
    await log(`Baseline Text: "${baselineTextArr[i].R[k].T}"`, 3);
    await log(`Testfile Text: "${testFileTextArr[i].R[k].T}"`, 3);
    if (baselineTextArr[i].R[k].T.trim() !== testFileTextArr[i].R[k].T.trim()) {
        if (baselineTextArr[i].R[k].T.startsWith(testFileTextArr[i].R[k].T)) {
            return await handleLineBreak(baselineTextArr, testFileTextArr, i, k, msg, status, configObj, baselineObj, testFileObj);
        } else if (testFileTextArr[i].R[k].T.startsWith(baselineTextArr[i].R[k].T)) {
            return await handleLineMerge(baselineTextArr, testFileTextArr, i, k, msg, status, configObj, baselineObj, testFileObj);
        } else {
            return { msg, status, continue: true };
        }
    } else {
        return { msg, status, continue: true };
    }
};

const compareHeaderFooter = async (baselinePageArr, testFilePageArr, pageNumber, configObj, iterationObj, reportObj, type) => {
    const testFileTextArr = filter(testFilePageArr[pageNumber - 1].Texts, { [type]: true });
    let baselineTextArr;
    let pageNumVerificationNeeded;
    if (!baselinePageArr[pageNumber - 1]) {
        baselineTextArr = filter(baselinePageArr[baselinePageArr.length - 1].Texts, { [type]: true });
        pageNumVerificationNeeded = true;
    } else {
        baselineTextArr = filter(baselinePageArr[pageNumber - 1].Texts, { [type]: true });
    }
    let ddrStr = '';
    let msg;
    let status;
    for (let i = 0; i < baselineTextArr.length; i++) {
        await log(`--- Verifying ${type} object # ${i}`, 3);
        await log(baselineTextArr[i], 3);
        if (msg) msg = msg.concat(`\n`).concat('='.repeat(111)).concat('\n\n');

        if (baselineTextArr[i].ddrStr) {
            ddrStr = ddrStr ? ddrStr.concat(', ').concat(baselineTextArr[i].ddrStr) : baselineTextArr[i].ddrStr;
        }

        if (baselineTextArr[i].x === testFileTextArr[i].x) {
            msg = (msg !== undefined ? msg : '').concat(`X-Coordinate Matches:\nExpected: ${baselineTextArr[i].x}\n  Actual: ${testFileTextArr[i].x}\n`);
        } else if (baselineTextArr[i].ignoreX) {
            msg = (msg !== undefined ? msg : '').concat(`Ignoring X-Coordinate As Baseline X-Coordinate Value Is No Longer Valid:\nBaseline: ${baselineTextArr[i].x}\n  Actual: ${testFileTextArr[i].x}\n`);
        } else {
            msg = (msg !== undefined ? msg : '').concat(`X-Coordinate Doesn't Match:\nExpected: ${baselineTextArr[i].x}\n  Actual: ${testFileTextArr[i].x}\n`);
            status = 'failed';
        }

        if (baselineTextArr[i].y === testFileTextArr[i].y) {
            msg = (msg !== undefined ? msg : '').concat(`\nY-Coordinate Matches:\nExpected: ${baselineTextArr[i].y}\n  Actual: ${testFileTextArr[i].y}\n`);
        } else if (baselineTextArr[i].ignoreY) {
            msg = (msg !== undefined ? msg : '').concat(`Ignoring Y-Coordinate As Baseline Y-Coordinate Value Is No Longer Valid:\nBaseline: ${baselineTextArr[i].y}\n  Actual: ${testFileTextArr[i].y}\n`);
        } else if (baselineTextArr[i].yIsApprox) {
            if (Math.abs(baselineTextArr[i].y - testFileTextArr[i].y) <= configObj.allowedYDiffWhenYIsApprox) {
                msg = (msg !== undefined ? msg : '').concat(`\nY-Coordinate Value Is Approximate And Is Within Allowed Range:\nApprox: ${baselineTextArr[i].y}\nActual: ${testFileTextArr[i].y}\n  Diff: ${Math.abs(testFileTextArr[i].y - baselineTextArr[i].y)}\n`);
            } else {
                msg = (msg !== undefined ? msg : '').concat(`\nY-Coordinate Value Is Approximate And Isn't Within Allowed Range:\nApprox: ${baselineTextArr[i].y}\nActual: ${testFileTextArr[i].y}\n  Diff: ${Math.abs(testFileTextArr[i].y - baselineTextArr[i].y)}\n`);
                status = 'failed';
            }
        } else {
            msg = (msg !== undefined ? msg : '').concat(`\nY-Coordinate Doesn't Match:\nExpected: ${baselineTextArr[i].y}\n  Actual: ${testFileTextArr[i].y}\n`);
            status = 'failed';
        }

        if (baselineTextArr[i].clr !== undefined) {
            if (baselineTextArr[i].clr === testFileTextArr[i].clr && baselineTextArr[i].clr !== -1) {
                msg = (msg !== undefined ? msg : '').concat(`\nColor Matches:\nExpected: ${baselineTextArr[i].clr}\n  Actual: ${testFileTextArr[i].clr}\n`);
            } else if (baselineTextArr[i].clr === -1 && testFileTextArr[i].clr === -1) {
                if (baselineTextArr[i].oc === testFileTextArr[i].oc) {
                    msg = (msg !== undefined ? msg : '').concat(`\nColor Matches:\nExpected: ${baselineTextArr[i].oc}\n  Actual: ${testFileTextArr[i].oc}\n`);
                } else {
                    msg = (msg !== undefined ? msg : '').concat(`\nColor Doesn't Match:\nExpected: ${baselineTextArr[i].oc}\n  Actual: ${testFileTextArr[i].oc}\n`);
                    status = 'failed';
                }
            } else {
                msg = (msg !== undefined ? msg : '').concat(`\nColor Doesn't Match:\nExpected: ${baselineTextArr[i].clr}\n  Actual: ${testFileTextArr[i].clr}\n`);
                status = 'failed';
            }
        }

        if (baselineTextArr[i].A !== undefined) {
            if (baselineTextArr[i].A === testFileTextArr[i].A) {
                msg = (msg !== undefined ? msg : '').concat(`\nAllignment Matches:\nExpected: ${baselineTextArr[i].A}\n  Actual: ${testFileTextArr[i].A}\n`);
            } else {
                msg = (msg !== undefined ? msg : '').concat(`\nAllignment Doesn't Match:\nExpected: ${baselineTextArr[i].A}\n  Actual: ${testFileTextArr[i].A}\n`);
                status = 'failed';
            }
        }

        if (baselineTextArr[i].R !== undefined) {
            if (baselineTextArr[i].R.length === testFileTextArr[i].R.length) {
                for (let k = 0; k < baselineTextArr[i].R.length; k++) {
                    let textMatches;
                    if (baselineTextArr[i].R[k].T === testFileTextArr[i].R[k].T) {
                        textMatches = true;
                    } else if (pageNumVerificationNeeded && (configObj.pageNumberTextFormat !== undefined)) {
                        let expectedPageNumText;
                        if (configObj.pageNumberTextFormat.includes('of')) {
                            expectedPageNumText = configObj.pageNumberTextFormat.replace(/of [\d]+/, `of ${testFilePageArr.length}`).replace(/[\d]+/, pageNumber);
                        } else if (configObj.pageNumberTextFormat.includes('Of')) {
                            expectedPageNumText = configObj.pageNumberTextFormat.replace(/Of [\d]+/, `Of ${testFilePageArr.length}`).replace(/[\d]+/, pageNumber);
                        } else if (configObj.pageNumberTextFormat.includes('OF')) {
                            expectedPageNumText = configObj.pageNumberTextFormat.replace(/OF [\d]+/, `OF ${testFilePageArr.length}`).replace(/[\d]+/, pageNumber);
                        } else if (configObj.pageNumberTextFormat.includes('/ ')) {
                            expectedPageNumText = configObj.pageNumberTextFormat.replace(/\/ [\d]+/, `/ ${testFilePageArr.length}`).replace(/[\d]+/, pageNumber);
                        } else if (configObj.pageNumberTextFormat.includes('/')) {
                            expectedPageNumText = configObj.pageNumberTextFormat.replace(/\/[\d]+/, `/${testFilePageArr.length}`).replace(/[\d]+/, pageNumber);
                        } else if (configObj.pageNumberTextFormat.includes('\\ ')) {
                            expectedPageNumText = configObj.pageNumberTextFormat.replace(/\\ [\d]+/, `\ ${testFilePageArr.length}`).replace(/[\d]+/, pageNumber);
                        } else if (configObj.pageNumberTextFormat.includes('\\')) {
                            expectedPageNumText = configObj.pageNumberTextFormat.replace(/\\[\d]+/, `\${testFilePageArr.length}`).replace(/[\d]+/, pageNumber);
                        } else {
                            expectedPageNumText = configObj.pageNumberTextFormat.replace(/[\d]+/, pageNumber);
                        }
                        if (expectedPageNumText === testFileTextArr[i].R[k].T) {
                            baselineTextArr[i].R[k].T = expectedPageNumText;
                            textMatches = true;
                            pageNumVerificationNeeded = false;
                        }
                    }
                    
                    if (textMatches) {
                        msg = (msg !== undefined ? msg : '').concat(`\nText Matches:\nExpected: ${baselineTextArr[i].R[k].T}\n  Actual: ${testFileTextArr[i].R[k].T}\n`);
                    } else {
                        msg = (msg !== undefined ? msg : '').concat(`\nText Doesn't Match:\nExpected: ${baselineTextArr[i].R[k].T}\n  Actual: ${testFileTextArr[i].R[k].T}\n`);
                        status = 'failed';
                    }

                    if (baselineTextArr[i].R[k].S === testFileTextArr[i].R[k].S) {
                        msg = (msg !== undefined ? msg : '').concat(`\nStyle Matches:\nExpected: ${baselineTextArr[i].R[k].S}\n  Actual: ${testFileTextArr[i].R[k].S}\n`);
                    } else {
                        msg = (msg !== undefined ? msg : '').concat(`\nStyle Doesn't Match:\nExpected: ${baselineTextArr[i].R[k].S}\n  Actual: ${testFileTextArr[i].R[k].S}\n`);
                        status = 'failed';
                    }

                    if (baselineTextArr[i].R[k].TS[0] === testFileTextArr[i].R[k].TS[0]) {
                        msg = (msg !== undefined ? msg : '').concat(`\nFont Face ID Matches:\nExpected: ${baselineTextArr[i].R[k].TS[0]}\n  Actual: ${testFileTextArr[i].R[k].TS[0]}\n`);
                    } else {
                        msg = (msg !== undefined ? msg : '').concat(`\nFont Face ID Doesn't Match:\nExpected: ${baselineTextArr[i].R[k].TS[0]}\n  Actual: ${testFileTextArr[i].R[k].TS[0]}\n`);
                        status = 'failed';
                    }

                    if (baselineTextArr[i].R[k].TS[1] === testFileTextArr[i].R[k].TS[1]) {
                        msg = (msg !== undefined ? msg : '').concat(`\nFont Size Matches:\nExpected: ${baselineTextArr[i].R[k].TS[1]}\n  Actual: ${testFileTextArr[i].R[k].TS[1]}\n`);
                    } else {
                        msg = (msg !== undefined ? msg : '').concat(`\nFont Size Doesn't Match:\nExpected: ${baselineTextArr[i].R[k].TS[1]}\n  Actual: ${testFileTextArr[i].R[k].TS[1]}\n`);
                        status = 'failed';
                    }

                    if (baselineTextArr[i].R[k].TS[2] === testFileTextArr[i].R[k].TS[2]) {
                        msg = (msg !== undefined ? msg : '').concat(`\nFont Weight Matches:\nExpected: ${baselineTextArr[i].R[k].TS[2] === 1 ? 'Bold' : 'Normal'}\n  Actual: ${testFileTextArr[i].R[k].TS[2] === 1 ? 'Bold' : 'Normal'}\n`);
                    } else {
                        msg = (msg !== undefined ? msg : '').concat(`\nFont Weight Doesn't Match:\nExpected: ${baselineTextArr[i].R[k].TS[2] === 1 ? 'Bold' : 'Normal'}\n  Actual: ${testFileTextArr[i].R[k].TS[2] === 1 ? 'Bold' : 'Normal'}\n`);
                        status = 'failed';
                    }

                    if (baselineTextArr[i].R[k].TS[3] === testFileTextArr[i].R[k].TS[3]) {
                        msg = (msg !== undefined ? msg : '').concat(`\nFont Style Matches:\nExpected: ${baselineTextArr[i].R[k].TS[3] === 1 ? 'Italic' : 'Normal'}\n  Actual: ${testFileTextArr[i].R[k].TS[3] === 1 ? 'Italic' : 'Normal'}\n`);
                    } else {
                        msg = (msg !== undefined ? msg : '').concat(`\nFont Style Doesn't Match:\nExpected: ${baselineTextArr[i].R[k].TS[3] === 1 ? 'Italic' : 'Normal'}\n  Actual: ${testFileTextArr[i].R[k].TS[3] === 1 ? 'Italic' : 'Normal'}\n`);
                        status = 'failed';
                    }
                }
            } else {
                msg = (msg !== undefined ? msg : '').concat(`\nText Object [R] Length Doesn't Match:\nExpected: ${baselineTextArr[i].R.length}\n  Actual: ${testFileTextArr[i].R.length}\n`);
                status = 'failed';
            }
        }

        if (status === undefined) status = 'passed';
        if (status === 'failed') iterationObj.failed = true;

    }
    if (status) await reporter.addChildStep(reportObj, `Verify ${type[0].toUpperCase().concat(type.substring(1))}`.concat(ddrStr ? ` [Dynamic Data From Object${ddrStr.includes(',') ? 's' : ''}: ${ddrStr}]` : ''), status, msg);
};

const updateYOfRemainingBaselineTextObj = (baselineTextArr, testFileTextArr, endIndex, name, type) => {
    if (testFileTextArr[endIndex].y !== undefined && baselineTextArr[endIndex].y !== undefined) {
        const yDiff = testFileTextArr[endIndex].y - baselineTextArr[endIndex].y;
        for (let i = endIndex; i < baselineTextArr.length; i++) {
            if (baselineTextArr[i].pageNumber === baselineTextArr[endIndex - 1].pageNumber) {
                if (baselineTextArr[i].yIsFixed) break;
                if (baselineTextArr[i].y !== undefined) {
                    baselineTextArr[i].y += yDiff;
                    baselineTextArr[i].yIsApprox = true;
                }
            } else break;
        }
    }
};

const compareTableOrSection = async (baselineTextArr, testFileTextArr, startIndex, reportObj, name, type, iterationObj, configObj, baselineObj, testFileObj) => {
    let status;
    let msg;
    let endIndex;
    for (let i = startIndex; baselineTextArr[i][type] === name; i++) {
        if (msg) msg = msg.concat(`\n`).concat('='.repeat(111)).concat('\n\n');
        if (baselineTextArr[i].x && !baselineTextArr[i].ignoreX) {
            if (baselineTextArr[i].x === testFileTextArr[i].x) {
                msg = (msg !== undefined ? msg : '').concat(`X-Coordinate Matches:\nExpected: ${baselineTextArr[i].x}\n  Actual: ${testFileTextArr[i].x}\n`);
            } else {
                msg = (msg !== undefined ? msg : '').concat(`X-Coordinate Doesn't Match:\nExpected: ${baselineTextArr[i].x}\n  Actual: ${testFileTextArr[i].x}\n`);
                status = 'failed';
            }
        }

        if (baselineTextArr[i].y && !baselineTextArr[i].ignoreY) {
            if (baselineTextArr[i].y === testFileTextArr[i].y) {
                msg = (msg !== undefined ? msg : '').concat(`\nY-Coordinate Matches:\nExpected: ${baselineTextArr[i].y}\n  Actual: ${testFileTextArr[i].y}\n`);
            } else if (baselineTextArr[i].yIsApprox) {
                if (Math.abs(baselineTextArr[i].y - testFileTextArr[i].y) <= configObj.allowedYDiffWhenYIsApprox) {
                    msg = (msg !== undefined ? msg : '').concat(`\nY-Coordinate Value Is Approximate And Is Within Allowed Range:\nApprox: ${baselineTextArr[i].y}\nActual: ${testFileTextArr[i].y}\n  Diff: ${Math.abs(testFileTextArr[i].y - baselineTextArr[i].y)}\n`);
                } else {
                    msg = (msg !== undefined ? msg : '').concat(`\nY-Coordinate Value Is Approximate And Isn't Within Allowed Range:\nApprox: ${baselineTextArr[i].y}\nActual: ${testFileTextArr[i].y}\n  Diff: ${Math.abs(testFileTextArr[i].y - baselineTextArr[i].y)}\n`);
                    if (!status) status = 'skipped';
                }
            } else {
                msg = (msg !== undefined ? msg : '').concat(`\nY-Coordinate Doesn't Match:\nExpected: ${baselineTextArr[i].y}\n  Actual: ${testFileTextArr[i].y}\n`);
                status = 'failed';
            }
        }

        if (baselineTextArr[i].clr !== undefined) {
            if (baselineTextArr[i].clr === testFileTextArr[i].clr && baselineTextArr[i].clr !== -1) {
                msg = (msg !== undefined ? msg : '').concat(`\nColor Matches:\nExpected: ${baselineTextArr[i].clr}\n  Actual: ${testFileTextArr[i].clr}\n`);
            } else if (baselineTextArr[i].clr === -1 && testFileTextArr[i].clr === -1) {
                if (baselineTextArr[i].oc === testFileTextArr[i].oc) {
                    msg = (msg !== undefined ? msg : '').concat(`\nColor Matches:\nExpected: ${baselineTextArr[i].oc}\n  Actual: ${testFileTextArr[i].oc}\n`);
                } else {
                    msg = (msg !== undefined ? msg : '').concat(`\nColor Doesn't Match:\nExpected: ${baselineTextArr[i].oc}\n  Actual: ${testFileTextArr[i].oc}\n`);
                    status = 'failed';
                }
            } else {
                msg = (msg !== undefined ? msg : '').concat(`\nColor Doesn't Match:\nExpected: ${baselineTextArr[i].clr}\n  Actual: ${testFileTextArr[i].clr}\n`);
                status = 'failed';
            }
        }

        if (baselineTextArr[i].A !== undefined) {
            if (baselineTextArr[i].A === testFileTextArr[i].A) {
                msg = (msg !== undefined ? msg : '').concat(`\nAllignment Matches:\nExpected: ${baselineTextArr[i].A}\n  Actual: ${testFileTextArr[i].A}\n`);
            } else {
                msg = (msg !== undefined ? msg : '').concat(`\nAllignment Doesn't Match:\nExpected: ${baselineTextArr[i].A}\n  Actual: ${testFileTextArr[i].A}\n`);
                status = 'failed';
            }
        }

        if (baselineTextArr[i].R !== undefined) {
            if (baselineTextArr[i].R.length === testFileTextArr[i].R.length) {
                for (let k = 0; k < baselineTextArr[i].R.length; k++) {
                    if (baselineTextArr[i].R[k].T === testFileTextArr[i].R[k].T) {
                        msg = (msg !== undefined ? msg : '').concat(`\nText Matches:\nExpected: ${baselineTextArr[i].R[k].T}\n  Actual: ${testFileTextArr[i].R[k].T}\n`);
                    } else if (baselineTextArr[i].R[k].T.trim() === testFileTextArr[i].R[k].T.trim()) {
                        msg = (msg !== undefined ? msg : '').concat(`\nText Matches After Trimming. Please make sure beginning and/or trailing white spaces are not an issue:\nExpected: ${baselineTextArr[i].R[k].T}\n  Actual: ${testFileTextArr[i].R[k].T}\n`);
                        if (!status) status = 'skipped';
                    } else if (baselineTextArr[i].R[k].T.startsWith(testFileTextArr[i].R[k].T)) {
                        msg = (msg !== undefined ? msg : '').concat(`\nText breaks. Please make sure it looks correct on document:\nExpected: ${baselineTextArr[i].R[k].T}\n  Actual: ${testFileTextArr[i].R[k].T}\n`);
                        if (!status) status = 'skipped';
                        baselineTextArr.splice(i, 0, merge({}, baselineTextArr[i], {
                            ignoreX: true,
                            ignoreY: true
                        }));
                        baselineTextArr[i+1].R[k].T = baselineTextArr[i].R[k].T.replace(testFileTextArr[i].R[k].T, '').trim();
                    } else {
                        msg = (msg !== undefined ? msg : '').concat(`\nText Doesn't Match:\nExpected: ${baselineTextArr[i].R[k].T}\n  Actual: ${testFileTextArr[i].R[k].T}\n`);
                        status = 'failed';
                    }

                    if (baselineTextArr[i].R[k].S) {
                        if (baselineTextArr[i].R[k].S === testFileTextArr[i].R[k].S) {
                            msg = (msg !== undefined ? msg : '').concat(`\nStyle Matches:\nExpected: ${baselineTextArr[i].R[k].S}\n  Actual: ${testFileTextArr[i].R[k].S}\n`);
                        } else {
                            msg = (msg !== undefined ? msg : '').concat(`\nStyle Doesn't Match:\nExpected: ${baselineTextArr[i].R[k].S}\n  Actual: ${testFileTextArr[i].R[k].S}\n`);
                            status = 'failed';
                        }
                    }

                    if (baselineTextArr[i].R[k].TS) {
                        if (baselineTextArr[i].R[k].TS[0] !== undefined) {
                            if (baselineTextArr[i].R[k].TS[0] === testFileTextArr[i].R[k].TS[0]) {
                                msg = (msg !== undefined ? msg : '').concat(`\nFont Face ID Matches:\nExpected: ${baselineTextArr[i].R[k].TS[0]}\n  Actual: ${testFileTextArr[i].R[k].TS[0]}\n`);
                            } else {
                                msg = (msg !== undefined ? msg : '').concat(`\nFont Face ID Doesn't Match:\nExpected: ${baselineTextArr[i].R[k].TS[0]}\n  Actual: ${testFileTextArr[i].R[k].TS[0]}\n`);
                                status = 'failed';
                            }
                        }
    
                        if (baselineTextArr[i].R[k].TS[1] !== undefined) {
                            if (baselineTextArr[i].R[k].TS[1] === testFileTextArr[i].R[k].TS[1]) {
                                msg = (msg !== undefined ? msg : '').concat(`\nFont Size Matches:\nExpected: ${baselineTextArr[i].R[k].TS[1]}\n  Actual: ${testFileTextArr[i].R[k].TS[1]}\n`);
                            } else {
                                msg = (msg !== undefined ? msg : '').concat(`\nFont Size Doesn't Match:\nExpected: ${baselineTextArr[i].R[k].TS[1]}\n  Actual: ${testFileTextArr[i].R[k].TS[1]}\n`);
                                status = 'failed';
                            }
                        }
    
                        if (baselineTextArr[i].R[k].TS[2] !== undefined) {
                            if (baselineTextArr[i].R[k].TS[2] === testFileTextArr[i].R[k].TS[2]) {
                                msg = (msg !== undefined ? msg : '').concat(`\nFont Weight Matches:\nExpected: ${baselineTextArr[i].R[k].TS[2] === 1 ? 'Bold' : 'Normal'}\n  Actual: ${testFileTextArr[i].R[k].TS[2] === 1 ? 'Bold' : 'Normal'}\n`);
                            } else {
                                msg = (msg !== undefined ? msg : '').concat(`\nFont Weight Doesn't Match:\nExpected: ${baselineTextArr[i].R[k].TS[2] === 1 ? 'Bold' : 'Normal'}\n  Actual: ${testFileTextArr[i].R[k].TS[2] === 1 ? 'Bold' : 'Normal'}\n`);
                                status = 'failed';
                            }
                        }
    
                        if (baselineTextArr[i].R[k].TS[3] !== undefined) {
                            if (baselineTextArr[i].R[k].TS[3] === testFileTextArr[i].R[k].TS[3]) {
                                msg = (msg !== undefined ? msg : '').concat(`\nFont Style Matches:\nExpected: ${baselineTextArr[i].R[k].TS[3] === 1 ? 'Italic' : 'Normal'}\n  Actual: ${testFileTextArr[i].R[k].TS[3] === 1 ? 'Italic' : 'Normal'}\n`);
                            } else {
                                msg = (msg !== undefined ? msg : '').concat(`\nFont Style Doesn't Match:\nExpected: ${baselineTextArr[i].R[k].TS[3] === 1 ? 'Italic' : 'Normal'}\n  Actual: ${testFileTextArr[i].R[k].TS[3] === 1 ? 'Italic' : 'Normal'}\n`);
                                status = 'failed';
                            }
                        }
                    }
                }
            } else {
                msg = (msg !== undefined ? msg : '').concat(`\nText Object [R] Length Doesn't Match:\nExpected: ${baselineTextArr[i].R.length}\n  Actual: ${testFileTextArr[i].R.length}\n`);
                status = 'failed';
            }
        }
        baselineTextArr[i].pageNumber = testFileTextArr[i].pageNumber;
        endIndex = i + 1;
    }
    if (status === undefined) status = 'passed';
    if (status === 'failed') iterationObj.failed = true;
    await reporter.addChildStep(reportObj, `Verify ${type[0].toUpperCase().concat(type.substring(1))} - ${name}`, status, msg);
    // Reassign line numbers in testFileTextArr
    await reassignLineNumForTableSection(testFileTextArr, startIndex - 1, endIndex, name, type);
    // Calculate approximate Y value for all objects after table/section on same page
    updateYOfRemainingBaselineTextObj(baselineTextArr, testFileTextArr, endIndex, name, type);
};

const compareEachTextLine = async (baselineObj, testFileObj, configObj, iterationObj, reportObj) => {
    let baselineTextArr = await getTextArray(baselineObj);
    let testFileTextArr = await getTextArray(testFileObj);
    let j = 0;
    let currentPage = 0;
    let currentLine = 1;
    let status;
    let msg;
    let ddrStr = '';
    for (let i = 0; i < baselineTextArr.length; i++) {
        let ignoreWhiteSpace = false;
        if (baselineTextArr[i].pageNumber > currentPage) {
            if (currentPage !== 0 && status !== undefined) {
                await reporter.addChildStep(reportObj, `Verify Line # ${currentLine}`.concat(ddrStr ? ` [Dynamic Data From Object${ddrStr.includes(',') ? 's' : ''}: ${ddrStr}]` : ''), status, msg);
                status = undefined;
                msg = undefined;
                ddrStr = '';
            }
            currentPage = baselineTextArr[i].pageNumber;
            currentLine = 1;
            await reporter.addParentStep(reportObj, `Verify Page # ${currentPage}`, true);
            await compareHeaderFooter(baselineObj.formImage.Pages, testFileObj.formImage.Pages, currentPage, configObj, iterationObj, reportObj, 'header');
            await compareHeaderFooter(baselineObj.formImage.Pages, testFileObj.formImage.Pages, currentPage, configObj, iterationObj, reportObj, 'footer');
        }

        if (baselineTextArr[i].lineNumber !== undefined && testFileTextArr[i].lineNumber !== undefined && baselineTextArr[i].lineNumber !== testFileTextArr[i].lineNumber) {
            const result = await handleLineNumberMismatch(baselineTextArr, testFileTextArr, i, 0, msg, status, configObj, baselineObj, testFileObj);
            if (result.repeat) {
                i--;
                continue;
            }
        }

        if (baselineTextArr[i].lineNumber === currentLine) {
            if (msg) msg = msg.concat(`\n`).concat('='.repeat(111)).concat('\n\n');
        } else if (status !== undefined) {
            await reporter.addChildStep(reportObj, `Verify Line # ${currentLine}`.concat(ddrStr ? ` [Dynamic Data From Object${ddrStr.includes(',') ? 's' : ''}: ${ddrStr}]` : ''), status, msg);
            currentLine++;
            status = undefined;
            msg = undefined;
            ddrStr = '';
        }

        if (baselineTextArr[i].table || baselineTextArr[i].section) {
            const type = baselineTextArr[i].table ? 'table' : 'section';
            const name = type === 'table' ? baselineTextArr[i].table : baselineTextArr[i].section;
            await compareTableOrSection(baselineTextArr, testFileTextArr, i, reportObj, name, type, iterationObj, configObj, baselineObj, testFileObj);
            i = findLastIndex(baselineTextArr, obj => { if (obj[type] === name) return obj; });
            if (i === (baselineTextArr.length - 1) && baselineTextArr[i].pageNumber !== currentPage) {
                do {
                    currentPage++;
                    currentLine = 1;
                    await reporter.addParentStep(reportObj, `Verify Page # ${currentPage}`, true);
                    await compareHeaderFooter(baselineObj.formImage.Pages, testFileObj.formImage.Pages, currentPage, configObj, iterationObj, reportObj, 'header');
                    await compareHeaderFooter(baselineObj.formImage.Pages, testFileObj.formImage.Pages, currentPage, configObj, iterationObj, reportObj, 'footer');
                } while (currentPage !== baselineTextArr[i].pageNumber);
            }
            continue;
        }

        if (baselineTextArr[i].ddrStr) {
            ddrStr = ddrStr ? ddrStr.concat(', ').concat(baselineTextArr[i].ddrStr) : baselineTextArr[i].ddrStr;
        }

        await log(`--- Verifying Line # ${baselineTextArr[i].lineNumber}`, 3);
        await log(baselineTextArr[i], 3);

        if (baselineTextArr[i].x === testFileTextArr[i].x) {
            msg = (msg !== undefined ? msg : '').concat(`X-Coordinate Matches:\nExpected: ${baselineTextArr[i].x}\n  Actual: ${testFileTextArr[i].x}\n`);
        } else if (baselineTextArr[i].ignoreX) {
            msg = (msg !== undefined ? msg : '').concat(`Ignoring X-Coordinate As Baseline X-Coordinate Value Is No Longer Valid:\nBaseline: ${baselineTextArr[i].x}\n  Actual: ${testFileTextArr[i].x}\n`);
        } else {
            msg = (msg !== undefined ? msg : '').concat(`X-Coordinate Doesn't Match:\nExpected: ${baselineTextArr[i].x}\n  Actual: ${testFileTextArr[i].x}\n`);
            status = 'failed';
        }

        if (baselineTextArr[i].y === testFileTextArr[i].y) {
            msg = (msg !== undefined ? msg : '').concat(`\nY-Coordinate Matches:\nExpected: ${baselineTextArr[i].y}\n  Actual: ${testFileTextArr[i].y}\n`);
        } else if (baselineTextArr[i].ignoreY) {
            msg = (msg !== undefined ? msg : '').concat(`Ignoring Y-Coordinate As Baseline Y-Coordinate Value Is No Longer Valid:\nBaseline: ${baselineTextArr[i].y}\n  Actual: ${testFileTextArr[i].y}\n`);
        } else if (baselineTextArr[i].yIsApprox) {
            if (Math.abs(baselineTextArr[i].y - testFileTextArr[i].y) <= configObj.allowedYDiffWhenYIsApprox) {
                msg = (msg !== undefined ? msg : '').concat(`\nY-Coordinate Value Is Approximate And Is Within Allowed Range:\nApprox: ${baselineTextArr[i].y}\nActual: ${testFileTextArr[i].y}\n  Diff: ${Math.abs(testFileTextArr[i].y - baselineTextArr[i].y)}\n`);
            } else {
                msg = (msg !== undefined ? msg : '').concat(`\nY-Coordinate Value Is Approximate And Isn't Within Allowed Range:\nApprox: ${baselineTextArr[i].y}\nActual: ${testFileTextArr[i].y}\n  Diff: ${Math.abs(testFileTextArr[i].y - baselineTextArr[i].y)}\n`);
                if (!status) status = 'skipped';
            }
        } else {
            msg = (msg !== undefined ? msg : '').concat(`\nY-Coordinate Doesn't Match:\nExpected: ${baselineTextArr[i].y}\n  Actual: ${testFileTextArr[i].y}\n`);
            status = 'failed';
        }

        if (baselineTextArr[i].clr !== undefined) {
            if (baselineTextArr[i].clr === testFileTextArr[i].clr && baselineTextArr[i].clr !== -1) {
                msg = (msg !== undefined ? msg : '').concat(`\nColor Matches:\nExpected: ${baselineTextArr[i].clr}\n  Actual: ${testFileTextArr[i].clr}\n`);
            } else if (baselineTextArr[i].clr === -1 && testFileTextArr[i].clr === -1) {
                if (baselineTextArr[i].oc === testFileTextArr[i].oc) {
                    msg = (msg !== undefined ? msg : '').concat(`\nColor Matches:\nExpected: ${baselineTextArr[i].oc}\n  Actual: ${testFileTextArr[i].oc}\n`);
                } else {
                    msg = (msg !== undefined ? msg : '').concat(`\nColor Doesn't Match:\nExpected: ${baselineTextArr[i].oc}\n  Actual: ${testFileTextArr[i].oc}\n`);
                    status = 'failed';
                }
            } else {
                msg = (msg !== undefined ? msg : '').concat(`\nColor Doesn't Match:\nExpected: ${baselineTextArr[i].clr}\n  Actual: ${testFileTextArr[i].clr}\n`);
                status = 'failed';
            }
        }

        if (baselineTextArr[i].A !== undefined) {
            if (baselineTextArr[i].A === testFileTextArr[i].A) {
                msg = (msg !== undefined ? msg : '').concat(`\nAllignment Matches:\nExpected: ${baselineTextArr[i].A}\n  Actual: ${testFileTextArr[i].A}\n`);
            } else {
                msg = (msg !== undefined ? msg : '').concat(`\nAllignment Doesn't Match:\nExpected: ${baselineTextArr[i].A}\n  Actual: ${testFileTextArr[i].A}\n`);
                status = 'failed';
            }
        }

        if (baselineTextArr[i].R !== undefined) {
            if (baselineTextArr[i].R.length === testFileTextArr[i].R.length) {
                for (let k = 0; k < baselineTextArr[i].R.length; k++) {
                    const result = await checkForLineWrap(baselineTextArr, testFileTextArr, i, k, msg, status, configObj, baselineObj, testFileObj);
                    msg = result.msg;
                    status = result.status;
                    if (result.repeat) {
                        i--;
                        continue;
                    } else if (result.continue) {
                        if (baselineTextArr[i].R[k].T === testFileTextArr[i].R[k].T) {
                            msg = (msg !== undefined ? msg : '').concat(`\nText Matches:\nExpected: ${baselineTextArr[i].R[k].T}\n  Actual: ${testFileTextArr[i].R[k].T}\n`);
                        } else if (baselineTextArr[i].R[k].T.trim() === testFileTextArr[i].R[k].T.trim()) {
                            msg = (msg !== undefined ? msg : '').concat(`\nText Matches After Trimming. Please make sure beginning and/or trailing white spaces are not an issue:\nExpected: ${baselineTextArr[i].R[k].T}\n  Actual: ${testFileTextArr[i].R[k].T}\n`);
                            if (!status) status = 'skipped';
                        } else {
                            msg = (msg !== undefined ? msg : '').concat(`\nText Doesn't Match:\nExpected: ${baselineTextArr[i].R[k].T}\n  Actual: ${testFileTextArr[i].R[k].T}\n`);
                            status = 'failed';
                        }
                    }

                    if (baselineTextArr[i].R[k].S === testFileTextArr[i].R[k].S) {
                        msg = (msg !== undefined ? msg : '').concat(`\nStyle Matches:\nExpected: ${baselineTextArr[i].R[k].S}\n  Actual: ${testFileTextArr[i].R[k].S}\n`);
                    } else {
                        msg = (msg !== undefined ? msg : '').concat(`\nStyle Doesn't Match:\nExpected: ${baselineTextArr[i].R[k].S}\n  Actual: ${testFileTextArr[i].R[k].S}\n`);
                        status = 'failed';
                    }

                    if (baselineTextArr[i].R[k].TS[0] === testFileTextArr[i].R[k].TS[0]) {
                        msg = (msg !== undefined ? msg : '').concat(`\nFont Face ID Matches:\nExpected: ${baselineTextArr[i].R[k].TS[0]}\n  Actual: ${testFileTextArr[i].R[k].TS[0]}\n`);
                    } else {
                        msg = (msg !== undefined ? msg : '').concat(`\nFont Face ID Doesn't Match:\nExpected: ${baselineTextArr[i].R[k].TS[0]}\n  Actual: ${testFileTextArr[i].R[k].TS[0]}\n`);
                        status = 'failed';
                    }

                    if (baselineTextArr[i].R[k].TS[1] === testFileTextArr[i].R[k].TS[1]) {
                        msg = (msg !== undefined ? msg : '').concat(`\nFont Size Matches:\nExpected: ${baselineTextArr[i].R[k].TS[1]}\n  Actual: ${testFileTextArr[i].R[k].TS[1]}\n`);
                    } else {
                        msg = (msg !== undefined ? msg : '').concat(`\nFont Size Doesn't Match:\nExpected: ${baselineTextArr[i].R[k].TS[1]}\n  Actual: ${testFileTextArr[i].R[k].TS[1]}\n`);
                        status = 'failed';
                    }

                    if (baselineTextArr[i].R[k].TS[2] === testFileTextArr[i].R[k].TS[2]) {
                        msg = (msg !== undefined ? msg : '').concat(`\nFont Weight Matches:\nExpected: ${baselineTextArr[i].R[k].TS[2] === 1 ? 'Bold' : 'Normal'}\n  Actual: ${testFileTextArr[i].R[k].TS[2] === 1 ? 'Bold' : 'Normal'}\n`);
                    } else {
                        msg = (msg !== undefined ? msg : '').concat(`\nFont Weight Doesn't Match:\nExpected: ${baselineTextArr[i].R[k].TS[2] === 1 ? 'Bold' : 'Normal'}\n  Actual: ${testFileTextArr[i].R[k].TS[2] === 1 ? 'Bold' : 'Normal'}\n`);
                        status = 'failed';
                    }

                    if (baselineTextArr[i].R[k].TS[3] === testFileTextArr[i].R[k].TS[3]) {
                        msg = (msg !== undefined ? msg : '').concat(`\nFont Style Matches:\nExpected: ${baselineTextArr[i].R[k].TS[3] === 1 ? 'Italic' : 'Normal'}\n  Actual: ${testFileTextArr[i].R[k].TS[3] === 1 ? 'Italic' : 'Normal'}\n`);
                    } else {
                        msg = (msg !== undefined ? msg : '').concat(`\nFont Style Doesn't Match:\nExpected: ${baselineTextArr[i].R[k].TS[3] === 1 ? 'Italic' : 'Normal'}\n  Actual: ${testFileTextArr[i].R[k].TS[3] === 1 ? 'Italic' : 'Normal'}\n`);
                        status = 'failed';
                    }
                }
            } else {
                msg = (msg !== undefined ? msg : '').concat(`\nText Object [R] Length Doesn't Match:\nExpected: ${baselineTextArr[i].R.length}\n  Actual: ${testFileTextArr[i].R.length}\n`);
                status = 'failed';
            }
        }

        if (status === undefined) status = 'passed';
        if (status === 'failed') iterationObj.failed = true;
    }
    await reporter.addChildStep(reportObj, `Verify Line # ${currentLine}`.concat(ddrStr ? ` [Dynamic Data From Object${ddrStr.includes(',') ? 's' : ''}: ${ddrStr}]` : ''), status, msg);
};

const startComparison = async (baselineObj, testFileObj, configObj, iterationObj, reportObj) => {
    await compareCompleteText(baselineObj, testFileObj, configObj, iterationObj, reportObj);
    if (configObj.completeValidation !== false) {
        try {
            await compareEachTextLine(baselineObj, testFileObj, configObj, iterationObj, reportObj);
        } catch (e) {
            await reporter.addChildStep(reportObj, 'Unexpected Error Occurred', 'failed', e.stack);
        }
    }
};

export default {
    startComparison
}