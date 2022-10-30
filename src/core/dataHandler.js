import { findIndex, findLastIndex, merge, filter, find } from 'lodash';
import { log } from './logger';

const findIndexFromText = (textArr, textToSearch, placement) => {
    let index = findIndex(textArr, obj => { if (obj.R[0].T === textToSearch) return obj; });
    if (index === -1)
        index = findIndex(textArr, obj => { if (obj.R[0].T.includes(textToSearch)) return obj; });
    if (index === -1)
        index = findIndex(textArr, obj => { if (obj.R[0].T.replace(/[\s]/g, '') === textToSearch.replace(/[\s]/g, '')) return obj; });
    if (index === -1)
        index = findIndex(textArr, obj => { if (obj.R[0].T.replace(/[\s]/g, '').includes(textToSearch.replace(/[\s]/g, ''))) return obj; });
    if (index !== -1) {
        if (placement === 'before') return findLastIndex(textArr, obj => { if (obj.pageNumber === textArr[index].pageNumber && obj.lineNumber === textArr[index].lineNumber) return obj; });
        else return index;
    }
    return index;
};

const reassignLineNumForTableSection = async (textArr, beforeTextObjIndex, afterTextObjIndex, name, type) => {
    await log(`Reassigning Line Numbers For ${type} '${name}' - Started`, 3);
    const startPageNum = textArr[beforeTextObjIndex + 1].pageNumber;
    const endPageNum = textArr[afterTextObjIndex].pageNumber;
    let startLineNum = endPageNum !== startPageNum ? 1 : 0;
    for (let i = beforeTextObjIndex + 1; i < afterTextObjIndex; i++) {
        if (!startLineNum && textArr[i].lineNumber) {
            startLineNum = textArr[i].lineNumber;
        }
        delete textArr[i].lineNumber;
        textArr[i][type] = name;
    }
    if (!startLineNum) startLineNum = textArr[afterTextObjIndex].lineNumber;
    const diff = textArr[afterTextObjIndex].lineNumber - startLineNum;
    for (let i = afterTextObjIndex; i < textArr.length && textArr[i].pageNumber === endPageNum; i++) {
        if (textArr[i].lineNumber) textArr[i].lineNumber -= diff;
    }
    await log(`Reassigning Line Numbers For ${type} '${name}' - Completed`, 3);
};

const deleteExistingData = async (jsonObj, name, type) => {
    await log(`Deleting existing data for ${type} '${name}' - Started`, 3);
    const pageObjArray = jsonObj.formImage.Pages;
    for (let pageInd = 0; pageInd < pageObjArray.length; pageInd++) {
        const textArrForPage = pageObjArray[pageInd].Texts;
        for (let i = 0; i < textArrForPage.length; i++) {
            if (textArrForPage[i][type] === name) {
                textArrForPage.splice(i, 1);
                i--;
            }
        }
    }
    await log(`Deleting existing data for ${type} '${name}' - Completed`, 3);
};

const addData = async (jsonObj, dataObj, name, type) => {
    await log(`Adding Data For ${type} '${name}' - Started`, 3);
    if (dataObj.data === undefined) return;
    dataObj.data.forEach(element => { element[type] = name });
    const pageObjArray = jsonObj.formImage.Pages;
    let startAddingData = false;
    let pageNumber;
    pageIteratorLoop:
    for (let pageInd = 0; pageInd < pageObjArray.length; pageInd++) {
        const textArrForPage = pageObjArray[pageInd].Texts;
        for (let i = 0; i < textArrForPage.length; i++) {
            if (textArrForPage[i].tempStart) {
                startAddingData = true;
                pageNumber = (i === textArrForPage.length - 1) ? textArrForPage[i].pageNumber + 1 : textArrForPage[i].pageNumber;
                delete textArrForPage[i].tempStart;
                continue;
            }
            if (startAddingData) {
                for (let j = 0; j < dataObj.data.length; j++) {
                    textArrForPage.splice(i + j, 0, merge({
                        ignoreX: (dataObj.data)[j].x ? false : true,
                        ignoreY: (dataObj.data)[j].y ? false : true,
                        A: (dataObj.data)[j].A || (dataObj.data)[j].alignment,
                        R: [
                            {
                                T: (dataObj.data)[j].expectedText || (dataObj.data)[j].text,
                                TS: [
                                    (dataObj.data)[j].fontFaceId || (dataObj.data)[j].fontFaceID,
                                    (dataObj.data)[j].fontSize,
                                    (dataObj.data)[j].bold ? 1 : undefined,
                                    (dataObj.data)[j].italic ? 1 : undefined
                                ]
                            }
                        ],
                        pageNumber,
                    }, (dataObj.data)[j]));
                }
                break pageIteratorLoop;
            }
        }
    }
    await log(`Adding Data For ${type} '${name}' - Completed`, 3);
};

const identifyTableOrSection = async (jsonObj, tableSectionObj, objName) => {
    const type = objName.substring(0, objName.indexOf('-')).toLowerCase();
    const name = objName.substring(objName.indexOf('-') + 1);
    await log(`Identifying Elements For ${type}: ${name}`, 2);
    const pageObjArray = jsonObj.formImage.Pages;
    let textArr = [];
    let beforeTextObjIndex = -1;
    let afterTextObjIndex = -1;
    for (let i = 0; i < pageObjArray.length; i++) {
        textArr = textArr.concat(filter(pageObjArray[i].Texts, obj => { if (!obj.header && !obj.footer && obj.pageNumber && obj.lineNumber) return obj; }));
    }
    if (tableSectionObj.identifier.startsAfterText) {
        beforeTextObjIndex = findIndexFromText(textArr, tableSectionObj.identifier.startsAfterText, 'before');
        if (beforeTextObjIndex === -1) throw new Error(`Cannot indentify elements for ${type} - '${name}': startsAfterText '${tableSectionObj.identifier.startsAfterText}' not found`);
    }
    if (tableSectionObj.identifier.endsBeforeText) {
        afterTextObjIndex = findIndexFromText(textArr.slice(beforeTextObjIndex + 1), tableSectionObj.identifier.endsBeforeText, 'after');
        if (afterTextObjIndex === -1) throw new Error(`Cannot indentify elements for ${type} - '${name}': endsBeforeText '${tableSectionObj.identifier.endsBeforeText}' not found`);
        else afterTextObjIndex += beforeTextObjIndex + 1;
    }
    
    await reassignLineNumForTableSection(textArr, beforeTextObjIndex, afterTextObjIndex, name, type);

    textArr[beforeTextObjIndex].tempStart = true;
    // Delete what is already there in baseline for this table or section (can add a flag to retain these values if needed)
    await deleteExistingData(jsonObj, name, type);
    // Add elements for table or section from dynamic data file
    await addData(jsonObj, tableSectionObj, name, type);
};

const replaceTextInTextsArray = async (textsArr, dynamicDataObj, objName) => {
    const baselineText = dynamicDataObj[objName].baselineText;
    const expectedText = dynamicDataObj[objName].expectedText;
    for (let j = 0; j < textsArr.length; j++) {
        const rObjArray = textsArr[j].R;
        for (let k = 0; k < rObjArray.length; k++) {
            if ((dynamicDataObj[objName].exactMatch && (rObjArray[k].T === baselineText)) || (!dynamicDataObj[objName].exactMatch && rObjArray[k].T.includes(baselineText))) {
                rObjArray[k].T = await rObjArray[k].T.replace(baselineText, expectedText === undefined ? baselineText : expectedText);
                Object.assign(textsArr[j], dynamicDataObj[objName]);
                if (expectedText !== undefined) {
                    if (!textsArr[j].ddrStr) {
                        textsArr[j].ddrStr = objName;
                    } else {
                        textsArr[j].ddrStr = `${textsArr[j].ddrStr}, ${objName}`;
                    }
                    for (let x = j + 1; x < textsArr.length; x++) {
                        if (textsArr[x].pageNumber === textsArr[j].pageNumber && textsArr[x].lineNumber === textsArr[j].lineNumber) {
                            textsArr[x].ignoreX = true;
                        } else {
                            break;
                        }
                    }
                }
                return true;
            }
        }
    }
    return false;
};

const replaceDynamicDataInBaselineObj = async (baselineObj, dynamicDataObj, configObj) => {
    const pageObjArray = baselineObj.formImage.Pages;
    for (const objName in dynamicDataObj) {
        await log(`Replacing dynamic data for object: ${objName}`, 3);
        if (/^section-/ig.test(objName) || /^table-/ig.test(objName)) {
            await identifyTableOrSection(baselineObj, dynamicDataObj[objName], objName);
        } else {
            let replaced = false;
            if (configObj.validatePageLineOnDynamicDataReplacement) {
                if (/^header/ig.test(objName) || /^footer/ig.test(objName) || dynamicDataObj[objName].header || dynamicDataObj[objName].footer) {
                    for (let i = 0; i < pageObjArray.length; i++) {
                        const textsArr = pageObjArray[i].Texts;
                        const objArr = filter(textsArr, { [(/^header/ig.test(objName) || dynamicDataObj[objName].header) ? 'header' : 'footer']: true });
                        if (!await replaceTextInTextsArray(objArr, dynamicDataObj, objName))
                            throw new Error(`Error replacing baseline text with dynamic data for ${objName} on Page # ${i + 1} - Could not find '${dynamicDataObj[objName].baselineText}' text:\n${JSON.stringify(baselineObj, null, '  ')}`);
                    }
                    replaced = true;
                } else {
                    const pageNumber = /^page[\d]+/ig.test(objName) ? parseInt(/page([\d]+)/ig.exec(objName)[1]) : 1;
                    const lineNumber = /line[\d]+/ig.test(objName) ? parseInt(/line([\d]+)/ig.exec(objName)[1]) : 0;
                    const textsArr = pageObjArray[pageNumber - 1].Texts;
                    const header = /header/ig.test(objName);
                    const footer = /footer/ig.test(objName);
                    let objArr;
                    if (/^title/ig.test(objName)) objArr = filter(textsArr, { title: true });
                    else if (lineNumber !== 0) objArr = filter(textsArr, { lineNumber });
                    else if (header) objArr = filter(textsArr, { header });
                    else if (footer) objArr = filter(textsArr, { footer });
                    replaced = await replaceTextInTextsArray(objArr, dynamicDataObj, objName);
                }
            } else {
                for (let i = 0; i < pageObjArray.length; i++) {
                    const textsArr = pageObjArray[i].Texts;
                    replaced = await replaceTextInTextsArray(textsArr, dynamicDataObj, objName);
                    if (/^header/ig.test(objName) || /^footer/ig.test(objName) || dynamicDataObj[objName].header || dynamicDataObj[objName].footer) {
                        if (!replaced) throw new Error(`Error replacing baseline text with dynamic data for ${objName} on Page # ${i + 1} - Could not find '${dynamicDataObj[objName].baselineText}' text:\n${JSON.stringify(baselineObj, null, '  ')}`);
                    } else if (replaced) break;
                }
            }
            if (!replaced) throw new Error(`Error replacing baseline content with dynamic data for ${objName} - Could not find '${dynamicDataObj[objName].baselineText}' in baseline object:\n${JSON.stringify(baselineObj, null, '  ')}`);
        }
    }
};

const ignoreXOfOtherObjsFromSameLine = (baselineTextArr, indexOfLastObjFromSameLine, i) => {
    for (let index = indexOfLastObjFromSameLine + 2; index < baselineTextArr.length; index++) {
        if (baselineTextArr[index].pageNumber === baselineTextArr[i + 1].pageNumber && baselineTextArr[index].lineNumber === baselineTextArr[i + 1].lineNumber) {
            baselineTextArr[index].ignoreX = true;
            baselineTextArr[index].mayMoveToNextLine = true;
        } else {
            break;
        }
    }
};

const moveRestObjFromThisLineToNextLine = (baselineTextArr, indexOfLastObjFromSameLine, i, refObj, configObj) => {
    for (let index = i + 1; index <= indexOfLastObjFromSameLine; index++) {
        baselineTextArr[index].ignoreX = true;
        baselineTextArr[index].y = refObj.y;
        baselineTextArr[index].lineNumber = refObj.lineNumber;
        baselineTextArr[index][refObj.lineNumber !== 1 ? 'movedToNextLine' : 'movedToNextPage'] = true;
        baselineTextArr[index].pageNumber = refObj.pageNumber;
    }
    if (objectsMerged(baselineTextArr[indexOfLastObjFromSameLine], baselineTextArr[indexOfLastObjFromSameLine + 1], configObj)) {
        baselineTextArr.splice(indexOfLastObjFromSameLine + 1, 1);
    }
};

const addObjAndMoveRestToNextLine = (baselineTextArr, indexOfLastObjFromSameLine, i, refObj, remText, configObj) => {
    moveRestObjFromThisLineToNextLine(baselineTextArr, indexOfLastObjFromSameLine, i, refObj, configObj);
    baselineTextArr.splice(i + 1, 0, {
        x: refObj.x,
        y: refObj.y,
        yIsApprox: true,
        w: 0, // Check if width can be calculated based on remText
        sw: baselineTextArr[i].sw,
        clr: baselineTextArr[i].clr,
        oc: baselineTextArr[i].oc,
        A: baselineTextArr[i].A,
        R: [{
            T: remText,
            S: baselineTextArr[i].R[0].S,
            TS: [baselineTextArr[i].R[0].TS[0], baselineTextArr[i].R[0].TS[1], baselineTextArr[i].R[0].TS[2], baselineTextArr[i].R[0].TS[3]]
        }],
        pageNumber: refObj.pageNumber,
        lineNumber: refObj.lineNumber,
    });
};

const getApproxYOfNewLine = (textArrObj, configObj) => textArrObj.y + (textArrObj.yDiffWithPrevLine > 2 * configObj.averageYdiffBetweenLines ? configObj.averageYdiffBetweenLines : textArrObj.yDiffWithPrevLine);

const addNewLine = (baselineTextArr, firstObjCurrentLine, i, configObj, remText) => {
    let stopUpdatingY = false;
    baselineTextArr.splice(i + 1, 0, {
        x: firstObjCurrentLine.x,
        y: getApproxYOfNewLine(baselineTextArr[i], configObj),
        yIsApprox: true,
        manuallyAddedElement: true,
        w: 0, // Check if width can be calculated based on remText
        sw: baselineTextArr[i].sw,
        clr: baselineTextArr[i].clr,
        oc: baselineTextArr[i].oc,
        A: baselineTextArr[i].A,
        R: [{
            T: remText,
            S: baselineTextArr[i].R[0].S,
            TS: [baselineTextArr[i].R[0].TS[0], baselineTextArr[i].R[0].TS[1], baselineTextArr[i].R[0].TS[2], baselineTextArr[i].R[0].TS[3]]
        }],
        pageNumber: baselineTextArr[i].pageNumber,
        lineNumber: baselineTextArr[i].lineNumber + 1
    });

    for (let index = i + 2; index < baselineTextArr.length; index++) {
        if (baselineTextArr[index].pageNumber === baselineTextArr[i].pageNumber) {
            let oldY = baselineTextArr[index].y;
            if (baselineTextArr[index].yIsFixed) stopUpdatingY = true;
            if (baselineTextArr[index].lineNumber !== undefined) {
                baselineTextArr[index].lineNumber++;
                if (baselineTextArr[index].lineNumber === baselineTextArr[i + 1].lineNumber) {
                    baselineTextArr[index].y = baselineTextArr[i + 1].y;
                    baselineTextArr[index].ignoreX = true;
                    baselineTextArr[index].yIsApprox = true;
                    continue;
                }
            }
            if (!stopUpdatingY && (oldY !== undefined)) {
                baselineTextArr[index].y = (baselineTextArr[index - 1].y ? baselineTextArr[index - 1].y : getApproxYOfNewLine(baselineTextArr[index], configObj)) + baselineTextArr[index].yDiffWithPrevLine;
                baselineTextArr[index].yIsApprox = true;
            }
            while ((index < baselineTextArr.length - 1) && baselineTextArr[index + 1].y === oldY) {
                if (baselineTextArr[index].lineNumber !== undefined) {
                    baselineTextArr[index + 1].lineNumber = baselineTextArr[index].lineNumber;
                }
                if (!stopUpdatingY && (oldY !== undefined)) {
                    baselineTextArr[index + 1].y = baselineTextArr[index].y;
                    baselineTextArr[index + 1].yIsApprox = true;
                }
                index++;
            }
        } else {
            break;
        }
    }
};

const addNewPage = (docObj) => {
    const newPageObj = {
        Height: docObj.formImage.Pages[docObj.formImage.Pages.length - 1].Height,
        HLines: [],
        VLines: [],
        Fills: [],
        Texts: [],
        Fields: [],
        Boxsets: [],
        minY: docObj.formImage.Pages[docObj.formImage.Pages.length - 1].minY,
        maxY: docObj.formImage.Pages[docObj.formImage.Pages.length - 1].maxY,
        minX: docObj.formImage.Pages[docObj.formImage.Pages.length - 1].minX,
        maxX: docObj.formImage.Pages[docObj.formImage.Pages.length - 1].maxX,
        pageNumber: docObj.formImage.Pages[docObj.formImage.Pages.length - 1].pageNumber + 1,
    };
    docObj.formImage.Pages.push(newPageObj);
};

const updateYPageLineNumsForNewLine = (baselineTextArr, i, baselineObj, configObj) => {
    const minY = baselineObj.formImage.Pages[baselineObj.formImage.Pages.length - 1].minY;
    const maxY = baselineObj.formImage.Pages[baselineObj.formImage.Pages.length - 1].maxY;
    for (let index = i + 1; index < baselineTextArr.length; index++) {
        baselineTextArr[index].pageNumber = baselineTextArr[i].pageNumber + 1;
        baselineTextArr[index].lineNumber = 1;
        baselineTextArr[index].movedToNextPage = true;
        baselineTextArr[index].y = maxY - baselineTextArr[i].y + minY;
        baselineTextArr[index].yDiffWithPrevLine = baselineTextArr[index].y;
        baselineObj.formImage.Pages[baselineObj.formImage.Pages.length - 1].Texts.push(baselineTextArr[index]);
    }
};

const handleLineBreak = async (baselineTextArr, testFileTextArr, i, k, msg, status, configObj, baselineObj, testFileObj) => {
    let newMsg = msg;
    let newStatus = status;
    let remText = baselineTextArr[i].R[k].T.replace(testFileTextArr[i].R[k].T, '');

    if (configObj.noWhiteSpaceAtBeginningOfLine) remText = remText.trimStart();

    const indexOfLastObjFromSameLine = findLastIndex(baselineTextArr, obj => { if (obj.pageNumber === baselineTextArr[i].pageNumber && obj.lineNumber === baselineTextArr[i].lineNumber) return obj; });
    const indexOfFirstObjFromFirstLineNextPage = findIndex(baselineTextArr, obj => { if (obj.pageNumber === baselineTextArr[i].pageNumber + 1 && obj.lineNumber === 1) return obj; });
    const firstObjForNextLineSamePage = find(baselineTextArr, obj => { if (obj.pageNumber === baselineTextArr[i].pageNumber && obj.lineNumber === baselineTextArr[i].lineNumber + 1) return obj; });
    const firstObjCurrentLine = find(baselineTextArr, obj => { if (obj.pageNumber === baselineTextArr[i].pageNumber && obj.lineNumber === baselineTextArr[i].lineNumber) return obj; });

    if (indexOfLastObjFromSameLine < baselineTextArr.length - 1 && baselineTextArr[indexOfLastObjFromSameLine + 1].R !== undefined && !baselineTextArr[indexOfLastObjFromSameLine + 1].table && firstObjForNextLineSamePage !== undefined && baselineTextArr[indexOfLastObjFromSameLine + 1].lineNumber === firstObjForNextLineSamePage.lineNumber && firstObjForNextLineSamePage.yDiffWithPrevLine <= 1.5 * configObj.averageYdiffBetweenLines) {
        // If you are here, it means next line is within range (within same paragraph)
        if (indexOfLastObjFromSameLine === i && firstObjForNextLineSamePage.clr === baselineTextArr[i].clr && firstObjForNextLineSamePage.A === baselineTextArr[i].A && firstObjForNextLineSamePage.R[0].S === baselineTextArr[i].R[k].S && firstObjForNextLineSamePage.R[0].TS[0] === baselineTextArr[i].R[k].TS[0] && firstObjForNextLineSamePage.R[0].TS[1] === baselineTextArr[i].R[k].TS[1] && firstObjForNextLineSamePage.R[0].TS[2] === baselineTextArr[i].R[k].TS[2] && firstObjForNextLineSamePage.R[0].TS[3] === baselineTextArr[i].R[k].TS[3]) {
            await log(`Merging remaining text to first object of next line : ${remText}`, 3);
            firstObjForNextLineSamePage.R[0].T = remText.concat(firstObjForNextLineSamePage.R[0].T);
            firstObjForNextLineSamePage.textFromPrevLine = true;
        } else {
            await log('Adding an object containing remaining text and rest of the objects from the same line to beginning of next line', 3);
            addObjAndMoveRestToNextLine(baselineTextArr, indexOfLastObjFromSameLine, i, firstObjForNextLineSamePage, remText, configObj);
        }
        ignoreXOfOtherObjsFromSameLine(baselineTextArr, indexOfLastObjFromSameLine, i);
        newMsg = newMsg.concat(`\nText Matches Partially - Line Breaks Due To Dynamic Content Added To This Line Or Some Of The Previous Lines - Expecting Remaining Text In Next Line:\n Expected: ${baselineTextArr[i].R[k].T}\n   Actual: ${testFileTextArr[i].R[k].T}\nRemaining: ${remText}\n`);
    } else if (indexOfLastObjFromSameLine + 1 === indexOfFirstObjFromFirstLineNextPage) {
        // If you are here, it means current line is last line of current page and there is a next line in starting of next page
        const firstObjNextPage = baselineTextArr[indexOfFirstObjFromFirstLineNextPage];
        if (indexOfLastObjFromSameLine === i && firstObjNextPage.clr === baselineTextArr[i].clr && firstObjNextPage.A === baselineTextArr[i].A && firstObjNextPage.R[0].S === baselineTextArr[i].R[k].S && firstObjNextPage.R[0].TS[0] === baselineTextArr[i].R[k].TS[0] && firstObjNextPage.R[0].TS[1] === baselineTextArr[i].R[k].TS[1] && firstObjNextPage.R[0].TS[2] === baselineTextArr[i].R[k].TS[2] && firstObjNextPage.R[0].TS[3] === baselineTextArr[i].R[k].TS[3]) {
            await log(`Merging remaining text to first object of first line on next page : ${remText}`, 3);
            firstObjNextPage.R[0].T = remText.concat(firstObjNextPage.R[0].T);
            firstObjNextPage.textFromPrevLine = true;
        } else {
            await log('Adding an object containing remaining text and rest of the objects from the current line to beginning of first line on next page', 3);
            addObjAndMoveRestToNextLine(baselineTextArr, indexOfLastObjFromSameLine, i, firstObjNextPage, remText, configObj);
        }
        ignoreXOfOtherObjsFromSameLine(baselineTextArr, indexOfLastObjFromSameLine, i);
        newMsg = newMsg.concat(`\nText Matches Partially - Line Breaks Due To Dynamic Content Added To This Line Or Some Of The Previous Lines - Expecting Remaining Text In First Line Of Next Page:\n Expected: ${baselineTextArr[i].R[k].T}\n   Actual: ${testFileTextArr[i].R[k].T}\nRemaining: ${remText}\n`);
    } else if (indexOfLastObjFromSameLine === baselineTextArr.length - 1) {
        // If you are here, it means current line is last line of whole document
        if (getApproxYOfNewLine(baselineTextArr[i], configObj) < baselineObj.maxY) {
            await log('Current line is last line of last page of the document - adding a new line on last page as space is available', 3);
            addNewLine(baselineTextArr, firstObjCurrentLine, i, configObj, remText);
            newMsg = newMsg.concat(`\nText Matches Partially - Line Breaks Due To Dynamic Content Added To This Line Or Some Of The Previous Lines - Expecting Remaining Text In A New Line:\n Expected: ${baselineTextArr[i].R[k].T}\n   Actual: ${testFileTextArr[i].R[k].T}\nRemaining: ${remText}\n`);
        } else {
            await log('Current line is last line of last page of the document - adding a new page and a new line as first line on the new page as space is not available to add new line on current page', 3);
            addNewPage(baselineObj, configObj);
            addNewLine(baselineTextArr, firstObjCurrentLine, i, configObj, remText);
            updateYPageLineNumsForNewLine(baselineTextArr, i, baselineObj, configObj);
        }
    } else {
        // If you are here, it means new line has to be added as section break is present after current line (as defined by presence of HLine or imaginary HLine or table or more than usual yDiff)
        if (getApproxYOfNewLine(baselineTextArr[i], configObj) < baselineObj.formImage.Pages[baselineTextArr[i].pageNumber - 1].maxY) {
            await log('Section break is present after current line - adding a new line as space is available', 3);
            addNewLine(baselineTextArr, firstObjCurrentLine, i, configObj, remText);
            newMsg = newMsg.concat(`\nText Matches Partially - Line Breaks Due To Dynamic Content Added To This Line Or Some Of The Previous Lines - Expecting Remaining Text In A New Line:\n Expected: ${baselineTextArr[i].R[k].T}\n   Actual: ${testFileTextArr[i].R[k].T}\nRemaining: ${remText}\n`);
        } else {
            await log('Section break is present after current line - adding a new line as first line on next page as space is NOT available to add new line on same page', 3);
            // Pending
        }
    }
    if (newStatus !== 'failed') newStatus = 'skipped';
    return { msg: newMsg, status: newStatus };
};

const handleLineMerge = async (baselineTextArr, testFileTextArr, i, k, msg, status, configObj, baselineObj, testFileObj) => {
    let newMsg = msg;
    let newStatus = status;
    let remText = testFileTextArr[i].R[k].T.replace(baselineTextArr[i].R[k].T, '');

    const indexOfLastObjFromSameLine = findLastIndex(baselineTextArr, obj => { if (obj.pageNumber === baselineTextArr[i].pageNumber && obj.lineNumber === baselineTextArr[i].lineNumber) return obj; });
    const indexOfFirstObjFromFirstLineNextPage = findIndex(baselineTextArr, obj => { if (obj.pageNumber === baselineTextArr[i].pageNumber + 1 && obj.lineNumber === 1) return obj; });
    const firstObjForNextLineSamePage = find(baselineTextArr, obj => { if (obj.pageNumber === baselineTextArr[i].pageNumber && obj.lineNumber === baselineTextArr[i].lineNumber + 1) return obj; });
    const firstObjCurrentLine = find(baselineTextArr, obj => { if (obj.pageNumber === baselineTextArr[i].pageNumber && obj.lineNumber === baselineTextArr[i].lineNumber) return obj; });

    if (indexOfLastObjFromSameLine < baselineTextArr.length - 1 && baselineTextArr[indexOfLastObjFromSameLine + 1].R !== undefined && !baselineTextArr[indexOfLastObjFromSameLine + 1].table && firstObjForNextLineSamePage !== undefined && baselineTextArr[indexOfLastObjFromSameLine + 1].lineNumber === firstObjForNextLineSamePage.lineNumber && firstObjForNextLineSamePage.yDiffWithPrevLine <= 1.5 * configObj.averageYdiffBetweenLines) {
        // If you are here, it means next line is within range (within same paragraph)
        if (!firstObjForNextLineSamePage.R[0].T.startsWith(remText)) {
            newMsg = newMsg.concat(`\nText contains some verbiage which is not expected:\nExpected: ${baselineTextArr[i].R[k].T}\n  Actual: ${testFileTextArr[i].R[k].T}\n   Extra: ${remText}\n`);
            newStatus = 'failed';
            return { msg: newMsg, status: newStatus };
        }
        if (configObj.noWhiteSpaceAtBeginningOfLine) remText = remText.trimStart();
        if (indexOfLastObjFromSameLine === i && firstObjForNextLineSamePage.clr === baselineTextArr[i].clr && firstObjForNextLineSamePage.A === baselineTextArr[i].A && firstObjForNextLineSamePage.R[0].S === baselineTextArr[i].R[k].S && firstObjForNextLineSamePage.R[0].TS[0] === baselineTextArr[i].R[k].TS[0] && firstObjForNextLineSamePage.R[0].TS[1] === baselineTextArr[i].R[k].TS[1] && firstObjForNextLineSamePage.R[0].TS[2] === baselineTextArr[i].R[k].TS[2] && firstObjForNextLineSamePage.R[0].TS[3] === baselineTextArr[i].R[k].TS[3]) {
            await log(`Merging some text from first object of next line : ${remText}`, 3);
            newMsg = newMsg.concat(`\nText Matches Partially - Line Merged Due To Dynamic Content Added To This Line Or Some Of The Previous Lines - Some Initial Text From Next Line Moved To This Line:\nExpected: ${baselineTextArr[i].R[k].T}\n  Actual: ${testFileTextArr[i].R[k].T}\n   Extra: ${remText}\n`);
            newStatus = 'skipped';
            baselineTextArr[i].textFromNextLine = true;
            firstObjForNextLineSamePage.R[0].T = firstObjForNextLineSamePage.R[0].T.replace(remText, '');
            if (configObj.noWhiteSpaceAtBeginningOfLine) firstObjForNextLineSamePage.R[0].T = firstObjForNextLineSamePage.R[0].T.trimStart();
            firstObjForNextLineSamePage.movedSomeTextToPrevLine = true;
            return { msg: newMsg, status: newStatus };
        }
    }
};

const moveObjectsFromCurrentPageToNextPage = async (baselineTextArr, i, configObj, baselineObj) => {
    const indexOfFirstObjForCurrentLine = findIndex(baselineTextArr, { pageNumber: baselineTextArr[i].pageNumber, lineNumber: baselineTextArr[i].lineNumber });
    const indexOfFirstObjForFirstLineNextPage = findIndex(baselineTextArr, { pageNumber: baselineTextArr[i].pageNumber + 1, lineNumber: 1 });
    const indexOfLastObjCurrentPage = findLastIndex(baselineTextArr, { pageNumber: baselineTextArr[i].pageNumber });
    const lineNum = baselineTextArr[i].lineNumber;
    if (indexOfFirstObjForCurrentLine !== i) {
        ignoreXOfOtherObjsFromSameLine(baselineTextArr, i - 2, i - 1);
    }
    for (let index = i; index <= indexOfLastObjCurrentPage; index++) {
        baselineTextArr[index].pageNumber++;
        const oldY = baselineTextArr[index].y;
        if (index === i) {
            baselineTextArr[index].y = indexOfFirstObjForFirstLineNextPage !== -1 ? baselineTextArr[indexOfFirstObjForFirstLineNextPage].y : baselineObj.formImage.Pages[baselineTextArr[i].pageNumber - 2].minY + configObj.averageYdiffBetweenLines/2;
            baselineTextArr[index].yIsApprox = true;
            baselineTextArr[index].yDiffWithPrevLine =  baselineTextArr[index].y;
        } else if (oldY !== undefined) {
            baselineTextArr[index].y = (baselineTextArr[index - 1].y !== undefined ? baselineTextArr[index - 1].y : getApproxYOfNewLine(baselineTextArr[index], configObj)) + baselineTextArr[index].yDiffWithPrevLine;
            baselineTextArr[index].yIsApprox = true;
        }
        if (baselineTextArr[index].lineNumber !== undefined) {
            baselineTextArr[index].lineNumber = baselineTextArr[index].lineNumber - lineNum + 1;
        }
        while ((index < indexOfLastObjCurrentPage) && baselineTextArr[index + 1].y === oldY && oldY !== undefined) {
            baselineTextArr[index + 1].lineNumber = baselineTextArr[index].lineNumber;
            baselineTextArr[index + 1].y = baselineTextArr[index].y;
            baselineTextArr[index + 1].yIsApprox = true;
            index++;
        }
    }
    let numOfNewLines = 0;
    for (let i = indexOfLastObjCurrentPage; baselineTextArr[i].pageNumber === baselineTextArr[indexOfLastObjCurrentPage].pageNumber; i--) {
        if (baselineTextArr[i].lineNumber) {
            numOfNewLines = baselineTextArr[i].lineNumber;
            break;
        }
    }
    if (indexOfFirstObjForFirstLineNextPage === -1) return;
    for (let index = indexOfFirstObjForFirstLineNextPage; index < baselineTextArr.length; index++) {
        if (baselineTextArr[index].pageNumber === baselineTextArr[indexOfFirstObjForFirstLineNextPage].pageNumber) {
            const oldY = baselineTextArr[index].y;
            if (index === indexOfFirstObjForFirstLineNextPage) {
                baselineTextArr[indexOfFirstObjForFirstLineNextPage].yDiffWithPrevLine = configObj.averageYdiffBetweenLines;
            }
            if (oldY !== undefined) {
                baselineTextArr[index].y = baselineTextArr[index - 1].y + baselineTextArr[index].yDiffWithPrevLine;
                baselineTextArr[index].yIsApprox = true;
            }
            if (baselineTextArr[index].lineNumber) baselineTextArr[index].lineNumber += numOfNewLines;
            while ((index < baselineTextArr.length - 1) && baselineTextArr[index + 1].y === oldY && oldY !== undefined) {
                baselineTextArr[index + 1].y = baselineTextArr[index].y;
                baselineTextArr[index + 1].yIsApprox = true;
                if (baselineTextArr[index + 1].lineNumber) baselineTextArr[index + 1].lineNumber = baselineTextArr[index].lineNumber;
                index++;
            }
        } else {
            break;
        }
    }
};

const handleLineNumberMismatch = async (baselineTextArr, testFileTextArr, i, k, msg, status, configObj, baselineObj, testFileObj) => {
    const indexOfLastObjFromSameLine = findLastIndex(baselineTextArr, obj => { if (obj.pageNumber === baselineTextArr[i].pageNumber && obj.lineNumber === baselineTextArr[i].lineNumber) return obj; });
    if (testFileTextArr[i].lineNumber === baselineTextArr[i].lineNumber + 1) {
        const refObj = find(baselineTextArr, obj => { if (obj.pageNumber === baselineTextArr[i].pageNumber && obj.lineNumber === baselineTextArr[i].lineNumber + 1) return obj; });
        if (refObj !== undefined) {
            // Below line takes care of moving current object as well, because i-1 is passed.
            if (baselineTextArr[indexOfLastObjFromSameLine + 1].lineNumber !== undefined) {
                moveRestObjFromThisLineToNextLine(baselineTextArr, indexOfLastObjFromSameLine, i - 1, refObj, configObj);
            } else {
                // Instead of calling below method, may need to add a new line and move rest obj from this line to it
                moveRestObjFromThisLineToNextLine(baselineTextArr, indexOfLastObjFromSameLine, i - 1, refObj, configObj);
                msg = (msg !== undefined ? msg : '').concat('***** May see some issue because of pending implementation when remaining text has to be considered a new line because next line is table/section\n')
            }           
            ignoreXOfOtherObjsFromSameLine(baselineTextArr, indexOfLastObjFromSameLine - 1, i);
            return { msg, status, repeat: true };
        }
    } else if (baselineTextArr[i].lineNumber === testFileTextArr[i].lineNumber + 1) {
        // Implementation Pending
        return { msg, status };
    } else if (testFileTextArr[i].lineNumber === 1) {
        if (testFileTextArr[i].pageNumber === baselineTextArr[i].pageNumber + 1) {
            await moveObjectsFromCurrentPageToNextPage(baselineTextArr, i, configObj, baselineObj);
            return { msg, status, repeat: true };
        } else {
            throw new Error(`Unexpected Mismatch In Line Numbers:\nBaseline\nText: ${baselineTextArr[i].R[k].T}\nPage # ${baselineTextArr[i].pageNumber}\nLine # ${baselineTextArr[i].lineNumber}\n\nActual\nText: ${testFileTextArr[i].R[k].T}\nPage # ${testFileTextArr[i].pageNumber}\nLine # ${testFileTextArr[i].lineNumber}`);
        }
    } else if (baselineTextArr[i].lineNumber === 1) {
        // Implementation Pending
        return { msg, status };
    } else {
        throw new Error(`Unexpected Mismatch In Line Numbers For Text: ${baselineTextArr[i].R[k].T}\nBaseline Doc Line # ${baselineTextArr[i].lineNumber}\n  Actual Doc Line # ${testFileTextArr[i].lineNumber}`);
    }
};

const objectsMerged = (obj1, obj2, configObj) => {
    if (!configObj.doNotMergeObj && obj1.y === obj2.y && obj1.clr === obj2.clr && obj1.A === obj2.A && (obj1.x + obj1.w / configObj.wToXCoversionFactor + configObj.maxXDiffForObjMerge >= obj2.x)) {
        if (obj1.R.length === 1 && obj2.R.length === 1 && obj1.R[0].S === obj2.R[0].S && obj1.R[0].TS[0] === obj2.R[0].TS[0] && obj1.R[0].TS[1] === obj2.R[0].TS[1] && obj1.R[0].TS[2] === obj2.R[0].TS[2] && obj1.R[0].TS[3] === obj2.R[0].TS[3]) {
            obj1.w += obj2.w;
            obj1.objMerged = obj1.objMerged === undefined ? 1 : obj1.objMerged + 1;
            obj1.R[0].T = obj1.R[0].T.concat(obj2.R[0].T);
            return true;
        }
        else
            return false;
    } else
        return false;
};

export default {
    replaceDynamicDataInBaselineObj,
    handleLineBreak,
    handleLineMerge,
    handleLineNumberMismatch,
    objectsMerged,
    reassignLineNumForTableSection,
}