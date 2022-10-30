/**
 * @name tools.js
 * @description contains utility functions.
 * @author Rajesh Kumar Mahato <rajesh-kumar.mahato@capgemini.com>
 * @requires jsonfile
 * @requires exceljs
 * @requires xml2js 
 * @requires fs
 * @requires .././config.js
 */

var jsonfile = require('jsonfile');
var fs = require('fs');
var config = require('.././config.js');
var Excel = require('exceljs');
var XML = require('xml2js');


module.exports.extractBaselineFileXref = function (testFileName) {
    return testFileName.split("_")[1];
};

module.exports.getBaselineFilenamebyTestPdfName = function (ufname) {
    var fname;
    switch (ufname) {
        case "INSU0001": //Isurance variant 1
            fname = "BATCH_INSU0001_Original_baseline.pdf";
            break;
        case "INSU0003": //Isurance variant 2
            fname = "BATCH_INSU0003_baseline.pdf";
            break;
        default:
            fname = "Unknown";
            console.log("Could not  identify Baseline File Name, based on document code :" + ufname);
            break;
    }
    console.log("Selected Baseline file : " + fname);
    return fname;
};

module.exports.getDynamicDataFilenamebyTestPdfName = function (ufname) {
    try {
        var dfname = ufname.split("_")[0] + ".json";
        if (fs.existsSync(config.config.dynamicDataDirectory + "\\" + dfname)) {
            return dfname;
        } else {
            return "Unknown";
        }

    } catch (e) {
        console.log("Invalid test filename format :" + ufname);
        return undefined;
    }
    var dfname;

    return fname;
};

module.exports.getFormType = function (baselineFileName) {
    var formType;
    switch (baselineFileName) {
        case "BATCH_INSU0001_Original_baseline.pdf":
            formType = "Demo Rule 1 (Word / PDF)";
            break;
        case "BATCH_INSU0003_baseline.pdf":
            formType = "Demo Rule 2 (Excel)";
            break;
        default:
            formType = "Unknown";
            console.log("Could not identify Form type, based on basline filename :" + baselineFileName);
            break;
    }
    return formType;
};

module.exports.isUpperCaseLettersNumbersOnly = function (str) {
    return decodeURIComponent(str).match(/^[0-9A-Z-#./ ]+$/) != null;
};

module.exports.hasWordNull = function (str) {
    return (str.toUpperCase()).match(/NULL/) != null;
};

module.exports.isValidDate = function (str) {
    var d = new Date(str);
    if (Object.prototype.toString.call(d) === "[object Date]") {
        // it is a date
        if (isNaN(d.getTime())) {  // d.valueOf() could also work
            return false;
        }
        else {
            return true;
        }
    }
    else {
        return false;
    }
};

module.exports.isValidFullName = function (str) {
    var strArray = str.split(" ");
    if (strArray.length < 2)
        return false;

    for (var i = 0; i < strArray.length; i++) {
        if (strArray[i].charAt(0) != strArray[i].charAt(0).toUpperCase())
            return false;
    }
    return true;
};

module.exports.isValidCityName = function (str) {
    return str.match(/^[a-zA-Z]+(?:[\s-][a-zA-Z]+)*$/) != null;
};

module.exports.getCityStateAndZip = function (str) {
    var strArray = str.split("%20");
    var zip = strArray.pop();
    var stateCode = strArray.pop();
    var city = strArray.join(" ").toString();
    return {
        zip: zip,
        stateCode: stateCode,
        city: city
    }
};

module.exports.isValidDollar = function (str) {
    return (str.toUpperCase()).match(/(?=.)^\$?(([1-9][0-9]{0,2}(,[0-9]{3})*)|0)?(\.[0-9]{1,2})?$/) != null;
};

module.exports.isValidWholeNumber = function (str) {
    return (str.toUpperCase()).match(/^\d+$/) != null;
};

module.exports.isValidMaskedBankAccountNumber = function (str) {
    return (str.toUpperCase()).match(/^X+\d{4}$/) != null;
};

module.exports.isValidWholecardNumber = function (str) {
    if (str.length == 16)
        return true;
    //  return (str.toUpperCase()).match(/^\d+$/) != null;
};

module.exports.isValidWholebankacNumber = function (str) {
    if (str.length == 10)
        return true;
};

module.exports.isTitleCase = function (str) {
    tempStr = str.toLowerCase().split(' ');
    for (var i = 0; i < tempStr.length; i++) {
        tempStr[i] = tempStr[i].charAt(0).toUpperCase() + tempStr[i].slice(1);
    }
    tempStr = tempStr.join(' ');
    return str == tempStr;
};

module.exports.isValidPhoneFormat = function (str) {
    if (isNaN(str.replace(new RegExp('-', 'g'), '')))
        return false;
    if (str.length == 12) {
        if (str.charAt(3) == '-'
            && str.charAt(7) == '-') {
            return true;
        } else {
            return false;
        }
    } else if (str.length == 14) {
        if (str.charAt(1) == '-'
            && str.charAt(5) == '-'
            && str.charAt(9) == '-') {
            return true;
        } else {
            return false;
        }
    } else {
        return false;
    }
};

module.exports.pretty = function (char) {
    return decodeURIComponent(char);
};

module.exports.arraysEqual = function (arr1, arr2) {
    if (arr1.length !== arr2.length)
        return false;
    for (var i = arr1.length; i--;) {
        if (arr1[i] !== arr2[i])
            return false;
    }

    return true;
}

module.exports.getDynamicData = function (dynamicDataFileName, callback) {

    ddType = dynamicDataFileName.split("/");
    ddType = dynamicDataFileName.split("/")[ddType.length - 1];
    ddType = ddType.split(".")[1].toString().toUpperCase();
    switch (ddType) {
        case "JSON":
            // read json file.
            try {
                var data = jsonfile.readFileSync(dynamicDataFileName);
                callback(data);
            } catch (e) {
                callback(undefined);
            }
            break;

        case "XLS":
        case "XLSX":
            // read excel file.
            try {
                var data = {};
                var workbook = new Excel.Workbook();
                workbook.xlsx.readFile(dynamicDataFileName)
                    .then(function () {
                        var worksheet = workbook.getWorksheet(1);
                        for (var i = 1; i <= 10000; i++) {
                            var row = worksheet.getRow(i);
                            if (row.getCell(1).value == null)
                                break;
                            var key = row.getCell(1).value;
                            var val = row.getCell(2).value;
                            data[key] = val.toString();
                        }
                        callback(data);
                    }).catch(function (err) {
                        console.dir(err);
                        callback(undefined);
                    });
            } catch (e) {
                callback(undefined);
            }
            break;

        case "XML":
            try {
                var parser = new XML.Parser();
                var jsonObj = {};
                fs.readFile(dynamicDataFileName, function (err, data) {
                    parser.parseString(data, function (err, result) {
                        if (err)
                            callback(undefined);
                        for (var i = 0; i < Object.keys(result.dynamicData).length; i++) {
                            jsonObj[Object.keys(result.dynamicData)[i]] = result.dynamicData[Object.keys(result.dynamicData)[i]][0].toString();
                        }
                        callback(jsonObj);
                    });
                });
            } catch (e) {
                console.log(e);
                callback(undefined);
            }
            break;

        case "TXT":
            try {
                var jsonObj = {};
                fs.readFile(dynamicDataFileName, function (err, data) {
                    if (err) callback(undefined);
                    var array = data.toString().split("\n");
                    debugger;
                    var headers = array[0].split("|");
                    for (var i = 1; i < array.length; i++) {
                        for (j = 0; j < headers.length; j++) {
                            if (array[i].length > 0)
                                jsonObj[headers[j].toString().replace('\r', '')] = array[i].split("|")[j].toString();
                        }
                    }
                    callback(jsonObj);
                });

            } catch (e) {
                console.log(e);
                callback(undefined);
            }
            break;

        default:
            callback(undefined);
    }
}

module.exports.makeBaselineJsonFromTXT = function (textFileNamewithPath, callback) {

    var Boxsets = [];
    var Fields = [];
    var Fills = [];
    var HLines = [];
    var Height = 0;
    var Texts = [];

    var VLines = [];


    try {
        fs.readFile(textFileNamewithPath, function (err, data) {
            if (err) callback(undefined);
            var lines = data.toString().split("\n");
            var metaDatas = [];
            var textDatas = [];

            //get all lines
            for (var i = 0; i < lines.length; i++) {
                var lineData = lines[i].split(">>");
                if (lineData.length == 1)
                    continue;
                if (lineData.length == 2 && parseInt(lineData[0]) == 0) {
                    metaDatas = lineData[1].split("|");
                }
                if (lineData.length == 2 && parseInt(lineData[0]) > 0) {
                    textDatas.push({
                        number: parseInt(lineData[0]),
                        data: lineData[1].toString().trim().replace("\r", "")
                    });
                }
            }

            //make meta info
            for (var i = 0; i < metaDatas.length; i++) {
                var elements = metaDatas[i].split(":");
                if (elements[0].toString().trim().toUpperCase() == "HEIGHT") {
                    Height = elements[1];
                }
            }

            //make texts 
            for (var i = 0; i < textDatas.length; i++) {

                var textEle = {
                    txtline: textDatas[i].number,
                    oc: '#000000',
                    x: 0,
                    y: 0,
                    w: 0,
                    sw: 0,
                    clr: 0,
                    A: 'left',
                    R:
                    [{
                        T: textDatas[i].data.toString(),
                        S: -1,
                        TS: [0, 0, 0, 0]
                    }]
                };
                Texts.push(textEle);
            }
            var rootObject = { Boxsets: Boxsets, Fields: Fields, Fills: Fills, HLines: HLines, Height: Height, Texts: Texts, VLines: VLines };
            callback({
                formImage: {
                    Pages: [rootObject]
                }
            });
        });
    } catch (e) {
        console.log(e);
        callback(undefined);
    }
}

module.exports.createBaselineJsonFromXml = function (xmlFileNamewithPath, callback) {
    try {
        fs.readFile(xmlFileNamewithPath, function (err, data) {
            if (err) {
                console.dir(err);
                callback(undefined);
            }
            XML.parseString(data, {
                'explicitArray': false,
                'explicitCharkey': true
            }, function (err, result) {
                if (err) {
                    console.dir(err);
                    callback(undefined);
                }

                var Boxsets = [];
                var Fields = [];
                var Fills = [];
                var HLines = [];
                var Height = result.Root.MetaData.Height['_'];
                var Texts = [];
                var VLines = [];

                var textDatas = result.Root.Body;
                //make texts
                for (var i in textDatas) {
                    var textEle = {
                        txtline: parseInt(i.replace("Line", "")),
                        oc: textDatas[i]['$'] !== undefined ? textDatas[i]['$']['color'] : '#000000',
                        x: textDatas[i]['$'] !== undefined ? textDatas[i]['$']['x'] : 0,
                        y: textDatas[i]['$'] !== undefined ? textDatas[i]['$']['y'] : 0,
                        w: 0,
                        sw: 0,
                        clr: 0,
                        A: 'left',
                        R: [{
                            T: textDatas[i]['_'],
                            S: -1,
                            TS: [0, textDatas[i]['$'] !== undefined ? textDatas[i]['$']['size'] : 0, 0, 0]
                        }]
                    };
                    Texts.push(textEle);
                }
                var rootJson = {
                    Boxsets: Boxsets,
                    Fields: Fields,
                    Fills: Fills,
                    HLines: HLines,
                    Height: Height,
                    Texts: Texts,
                    VLines: VLines
                };
                console.log(JSON.stringify(rootJson));
                callback({
                    formImage: {
                        Pages: [rootJson]
                    }
                });

            });
        });
    } catch (e) {
        console.log(e);
        callback(undefined);
    }
}

module.exports.getDynamicData_Json = function (dynamicDataFileName) {
    try {
        var data = jsonfile.readFileSync(dynamicDataFileName);
        return data;
    } catch (e) {
        return undefined;
    }

}


module.exports.matchCord = function (baselineVal, testVal) {
    var tolerance = 0.05;

    return baselineVal == testVal || Math.abs(baselineVal - testVal) < tolerance;
}

var isContentInBox = function (pdata, box) {
    return parseFloat(pdata.x) >= parseFloat(box.x1)
        && parseFloat(pdata.x) <= parseFloat(box.x2)
        && parseFloat(pdata.y) >= parseFloat(box.y1)
        && parseFloat(pdata.y) <= parseFloat(box.y2)
}

var getXYClean = function (data, str) {
    var cy = 0;
    var newdata = [];
    for (i = 0; i < data.Texts.length; i++) {
        if (parseInt(data.Texts[i].y) != cy) {
            cy = data.Texts[i].y;
            newdata.push(data.Texts[i]);
        } else {
            newdata[(newdata.length - 1)].R[0].T += data.Texts[i].R[0].T;
        }
    }

    for (var j = 0; j < newdata.length; j++) {
        if (newdata[j].R[0].T.match(new RegExp(str)) !== null) {
            return { x: newdata[j].x, y: newdata[j].y };
        }
    }

    return { x: 0, y: 999 };
}

var getXY = function (data, str) {
    for (var i in data.Texts) {
        var text = data.Texts[i];
        if (text.R[0].T.match(new RegExp(str)) !== null) {
            return { x: text.x, y: text.y };
        }
    }
    return { x: 0, y: 999 };
}




module.exports.extractLinesbyBox = function (bdata, tdata, box) {
    var counter = 0;
    var bl = {};
    var ut = {};
    var res = { bl, ut };

    for (var i in bdata.Texts) {
        var text = bdata.Texts[i];
        if (isContentInBox(text, box)) {
            try {
                if (text.y == bdata.Texts[i - 1].y) {
                    res.bl["line" + counter].R[0].T += text.R[0].T;
                } else {
                    counter++;
                    res.bl["line" + counter] = text;
                }
            } catch (e) {
                counter++;
                res.bl["line" + counter] = text;
            }

        }
    }

    counter = 0;
    for (var i in tdata.Texts) {
        var text = tdata.Texts[i];
        if (isContentInBox(text, box)) {
            try {
                if (text.y == tdata.Texts[i - 1].y) {
                    res.ut["line" + counter].R[0].T += text.R[0].T;
                } else {
                    counter++;
                    res.ut["line" + counter] = text;
                }
            } catch (e) {
                counter++;
                res.ut["line" + counter] = text;
            }
        }
    }
    return res;
}

module.exports.lg_extractLinesbyBox = function (lgdata, box) {
    var counter = 0;
    var lg = {};
    var res = { lg };

    for (var i in lgdata.Texts) {
        var text = lgdata.Texts[i];
        if (isContentInBox(text, box)) {
            counter++;
            res.lg["line" + counter] = text;
            res.lg["line" + counter].R[0].T = decodeURIComponent(text.R[0].T);
        }
    }
    return res;
}

module.exports.extractLinesbyTextBoundary = function (bdata, tdata, boundry) {
    var counter = 0;
    var startY;
    var endY;
    var bl = {};
    var ut = {};
    var res = { bl, ut };

    //baseline
    startY = 0;
    endY = 9999;
    startY = getXY(bdata, "Dear").y;
    endY = getXY(bdata, "Sincerely").y;

    for (var i in bdata.Texts) {
        var text = bdata.Texts[i];
        if (text.y > startY && text.y < endY) {
            if (text.y == bdata.Texts[i - 1].y && text.sw == bdata.Texts[i - 1].sw) {
                res.bl["line" + counter].R[0].T += text.R[0].T;
            } else {
                counter++;
                res.bl["line" + counter] = text;
            }
        }
    }

    //ut
    startY = 0;
    endY = 9999;
    startY = getXY(tdata, "Dear").y;
    endY = getXY(tdata, "Sincerely").y;
    counter = 0;
    for (var i in tdata.Texts) {
        var text = tdata.Texts[i];
        if (text.y > startY && text.y < endY) {
            if (text.y == tdata.Texts[i - 1].y && text.sw == tdata.Texts[i - 1].sw) {
                res.ut["line" + counter].R[0].T += text.R[0].T;
            } else {
                counter++;
                res.ut["line" + counter] = text;
            }
        }
    }

    return res;
}

module.exports.extractRichTextbyTextBoundary = function (bdata, tdata, boundry) {
    var counter = 0;
    var startY;
    var endY;
    var blLines = {};
    var blPLines = {};
    var blTLines = {};
    var blContentColors = [];
    var bParagraphs = {};
    var bCells = {};
    var bVLines = {};
    var bHLines = {};

    var utLines = {};
    var utPLines = {};
    var utTLines = {};
    var utContentColors = [];
    var uParagraphs = {};
    var uCells = {};
    var tVLines = {};
    var tHLines = {};

    var bl = { paragraphs: bParagraphs, cells: bCells, vlines: bVLines, hlines: bHLines };
    var ut = { paragraphs: uParagraphs, cells: uCells, vlines: tVLines, hlines: tHLines };
    var res = { bl, blContentColors, ut, utContentColors };

    var paraIndent = 3.2;

    //baseline
    startY = 0;
    endY = 9999;
    startY = getXY(bdata, boundry.start).y;
    endY = getXY(bdata, boundry.end).y;

    // get all vlines
    counter = 0;
    for (var i in bdata.VLines) {
        var line = bdata.VLines[i];
        if (line.y > startY && line.y < endY) {
            counter++;
            bVLines["vline" + counter] = line;
        }
    }

    // get all Hlines
    counter = 0;
    for (var i in bdata.HLines) {
        var line = bdata.HLines[i];
        if (line.y > startY && line.y < endY) {
            counter++;
            bHLines["hline" + counter] = line;
        }
    }

    //get all line and concate if y & sw matches
    counter = 0;
    for (var i in bdata.Texts) {
        var text = bdata.Texts[i];
        if (text.y > startY && text.y < endY) {
            if (text.y == bdata.Texts[i - 1].y && text.sw == bdata.Texts[i - 1].sw) {
                blLines["line" + counter].R[0].T += decodeURIComponent(text.R[0].T);
            } else {
                counter++;
                blLines["line" + counter] = text;
                blLines["line" + counter].R[0].T = decodeURIComponent(blLines["line" + counter].R[0].T);
            }
            if (text.oc != undefined)
                res.blContentColors.push(text.oc);
        }
    }

    //get all paragraph lines
    counter = 0;
    for (i = 1; i <= Object.keys(blLines).length; i++) {
        if (blLines["line" + i].x < paraIndent) {
            counter++;
            blPLines["pline" + counter] = blLines["line" + i];
        }
    }

    //get all tables lines
    counter = 0;
    for (i = 1; i <= Object.keys(blLines).length; i++) {
        if (blLines["line" + i].x > paraIndent) {
            counter++;
            blTLines["tline" + counter] = blLines["line" + i];
        }
    }

    //make paragraphs 
    counter = 0;
    for (i = 1; i <= Object.keys(blPLines).length; i++) {
        try {
            if ((blPLines["pline" + i].y - blPLines["pline" + (i - 1)].y) < 1) {
                bParagraphs["para" + counter].R[0].T += " " + blPLines["pline" + i].R[0].T;
            } else {
                counter++;
                bParagraphs["para" + counter] = blPLines["pline" + i];
            }
        } catch (e) {
            counter++;
            bParagraphs["para" + counter] = blPLines["pline" + i];
        }
    }

    //make cells
    counter = 0;
    for (i = 1; i <= Object.keys(blTLines).length; i += 2) {
        counter++;
        bCells["cell" + counter] = { label: blTLines["tline" + i], value: blTLines["tline" + (i + 1)] };
    }


    //test
    startY = 0;
    endY = 9999;
    startY = getXY(bdata, boundry.start).y;
    endY = getXY(bdata, boundry.end).y;

    // get all vlines
    counter = 0;
    for (var i in tdata.VLines) {
        var line = tdata.VLines[i];
        if (line.y > startY && line.y < endY) {
            counter++;
            tVLines["vline" + counter] = line;
        }
    }

    // get all Hlines
    counter = 0;
    for (var i in tdata.HLines) {
        var line = tdata.HLines[i];
        if (line.y > startY && line.y < endY) {
            counter++;
            tHLines["hline" + counter] = line;
        }
    }

    //get all line and concate if y & sw matches   
    counter = 0;
    for (var i in tdata.Texts) {
        var text = tdata.Texts[i];
        if (text.y > startY && text.y < endY) {
            if (text.y == tdata.Texts[i - 1].y && text.sw == tdata.Texts[i - 1].sw) {
                // var prevX = parseFloat(tdata.Texts[i - 1].x);
                // var currX = parseFloat(text.x);
                // var prevW = parseFloat(tdata.Texts[i - 1].w)/100;
                // var prevOffset = prevX + prevW;
                // var space = currX - prevOffset;
                // if(text.R[0].T == "e")
                //     space =space - 0.02;

                // console.log("Prev : text["+tdata.Texts[i - 1].R[0].T+"]");
                // console.log("prevX:"+prevX);
                // console.log("prevW:"+prevW);
                // console.log("currX:"+currX);
                // console.log("prevOffset:"+prevOffset);
                // console.log("space:"+space);

                // if(space > 0.17)
                //     utLines["line" + counter].R[0].T += " ";

                utLines["line" + counter].R[0].T += decodeURIComponent(text.R[0].T);
            } else {
                counter++;
                utLines["line" + counter] = text;
                utLines["line" + counter].R[0].T = decodeURIComponent(utLines["line" + counter].R[0].T);
            }
            if (text.oc != undefined)
                res.utContentColors.push(text.oc);
        }
    }
    //get all paragraph lines
    counter = 0;
    for (i = 1; i <= Object.keys(utLines).length; i++) {
        if (utLines["line" + i].x < paraIndent) {
            counter++;
            utPLines["pline" + counter] = utLines["line" + i];
        }
    }
    //get all tables lines
    counter = 0;
    for (i = 1; i <= Object.keys(utLines).length; i++) {
        if (utLines["line" + i].x > paraIndent) {
            counter++;
            utTLines["tline" + counter] = utLines["line" + i];
        }
    }
    //make paragraphs
    counter = 0;
    for (i = 1; i <= Object.keys(utPLines).length; i++) {
        try {
            if ((utPLines["pline" + i].y - utPLines["pline" + (i - 1)].y) < 1) {
                uParagraphs["para" + counter].R[0].T += " " + utPLines["pline" + i].R[0].T;
            } else {
                counter++;
                uParagraphs["para" + counter] = utPLines["pline" + i];
            }
        } catch (e) {
            counter++;
            uParagraphs["para" + counter] = utPLines["pline" + i];
        }
    }
    //make cells
    counter = 0;
    for (i = 1; i <= Object.keys(utTLines).length; i += 2) {
        counter++;
        uCells["cell" + counter] = { label: utTLines["tline" + i], value: utTLines["tline" + (i + 1)] };
    }

    return res;
}

module.exports.extractRichTextbyTextBoundaryandYOffset = function (bdata, tdata, boundry, Y) {
    var counter = 0;
    var startY;
    var endY;
    var blLines = {};
    var blPLines = {};
    var blTLines = {};
    var blContentColors = [];
    var bParagraphs = {};
    var bCells = {};
    var bVLines = {};
    var bHLines = {};

    var utLines = {};
    var utPLines = {};
    var utTLines = {};
    var utContentColors = [];
    var uParagraphs = {};
    var uCells = {};
    var tVLines = {};
    var tHLines = {};

    var bl = { paragraphs: bParagraphs, cells: bCells, vlines: bVLines, hlines: bHLines };
    var ut = { paragraphs: uParagraphs, cells: uCells, vlines: tVLines, hlines: tHLines };
    var res = { bl, blContentColors, ut, utContentColors };

    var paraIndent = 3.2;

    //baseline
    startY = 0;
    endY = 9999;
    startY = getXY(bdata, boundry.start).y;
    //endY = getXY(bdata, boundry.end).y;
    endY = Y;

    // get all vlines
    counter = 0;
    for (var i in bdata.VLines) {
        var line = bdata.VLines[i];
        if (line.y > startY && line.y < endY) {
            counter++;
            bVLines["vline" + counter] = line;
        }
    }

    // get all Hlines
    counter = 0;
    for (var i in bdata.HLines) {
        var line = bdata.HLines[i];
        if (line.y > startY && line.y < endY) {
            counter++;
            bHLines["hline" + counter] = line;
        }
    }

    //get all line and concate if y & sw matches
    counter = 0;
    for (var i in bdata.Texts) {
        var text = bdata.Texts[i];
        if (text.y > startY && text.y < endY) {
            if (text.y == bdata.Texts[i - 1].y && text.sw == bdata.Texts[i - 1].sw) {
                blLines["line" + counter].R[0].T += decodeURIComponent(text.R[0].T);
            } else {
                counter++;
                blLines["line" + counter] = text;
                blLines["line" + counter].R[0].T = decodeURIComponent(blLines["line" + counter].R[0].T);
            }
            if (text.oc != undefined)
                res.blContentColors.push(text.oc);
        }
    }

    //get all paragraph lines
    counter = 0;
    for (i = 1; i <= Object.keys(blLines).length; i++) {
        if (blLines["line" + i].x < paraIndent) {
            counter++;
            blPLines["pline" + counter] = blLines["line" + i];
        }
    }

    //get all tables lines
    counter = 0;
    for (i = 1; i <= Object.keys(blLines).length; i++) {
        if (blLines["line" + i].x > paraIndent) {
            counter++;
            blTLines["tline" + counter] = blLines["line" + i];
        }
    }

    //make paragraphs 
    counter = 0;
    for (i = 1; i <= Object.keys(blPLines).length; i++) {
        try {
            if ((blPLines["pline" + i].y - blPLines["pline" + (i - 1)].y) < 1) {
                bParagraphs["para" + counter].R[0].T += " " + blPLines["pline" + i].R[0].T;
            } else {
                counter++;
                bParagraphs["para" + counter] = blPLines["pline" + i];
            }
        } catch (e) {
            counter++;
            bParagraphs["para" + counter] = blPLines["pline" + i];
        }
    }

    //make cells
    counter = 0;
    for (i = 1; i <= Object.keys(blTLines).length; i += 2) {
        counter++;
        bCells["cell" + counter] = { label: blTLines["tline" + i], value: blTLines["tline" + (i + 1)] };
    }


    //test
    startY = 0;
    endY = 9999;
    startY = getXY(bdata, boundry.start).y;
    // endY = getXY(bdata, boundry.end).y;
    endY = Y;

    // get all vlines
    counter = 0;
    for (var i in tdata.VLines) {
        var line = tdata.VLines[i];
        if (line.y > startY && line.y < endY) {
            counter++;
            tVLines["vline" + counter] = line;
        }
    }

    // get all Hlines
    counter = 0;
    for (var i in tdata.HLines) {
        var line = tdata.HLines[i];
        if (line.y > startY && line.y < endY) {
            counter++;
            tHLines["hline" + counter] = line;
        }
    }

    //get all line and concate if y & sw matches   
    counter = 0;
    for (var i in tdata.Texts) {
        var text = tdata.Texts[i];
        if (text.y > startY && text.y < endY) {
            if (text.y == tdata.Texts[i - 1].y && text.sw == tdata.Texts[i - 1].sw) {
                // var prevX = parseFloat(tdata.Texts[i - 1].x);
                // var currX = parseFloat(text.x);
                // var prevW = parseFloat(tdata.Texts[i - 1].w)/100;
                // var prevOffset = prevX + prevW;
                // var space = currX - prevOffset;
                // if(text.R[0].T == "e")
                //     space =space - 0.02;

                // console.log("Prev : text["+tdata.Texts[i - 1].R[0].T+"]");
                // console.log("prevX:"+prevX);
                // console.log("prevW:"+prevW);
                // console.log("currX:"+currX);
                // console.log("prevOffset:"+prevOffset);
                // console.log("space:"+space);

                // if(space > 0.17)
                //     utLines["line" + counter].R[0].T += " ";

                utLines["line" + counter].R[0].T += decodeURIComponent(text.R[0].T);
            } else {
                counter++;
                utLines["line" + counter] = text;
                utLines["line" + counter].R[0].T = decodeURIComponent(utLines["line" + counter].R[0].T);
            }
            if (text.oc != undefined)
                res.utContentColors.push(text.oc);
        }
    }
    //get all paragraph lines
    counter = 0;
    for (i = 1; i <= Object.keys(utLines).length; i++) {
        if (utLines["line" + i].x < paraIndent) {
            counter++;
            utPLines["pline" + counter] = utLines["line" + i];
        }
    }
    //get all tables lines
    counter = 0;
    for (i = 1; i <= Object.keys(utLines).length; i++) {
        if (utLines["line" + i].x > paraIndent) {
            counter++;
            utTLines["tline" + counter] = utLines["line" + i];
        }
    }
    //make paragraphs
    counter = 0;
    for (i = 1; i <= Object.keys(utPLines).length; i++) {
        try {
            if ((utPLines["pline" + i].y - utPLines["pline" + (i - 1)].y) < 1) {
                uParagraphs["para" + counter].R[0].T += " " + utPLines["pline" + i].R[0].T;
            } else {
                counter++;
                uParagraphs["para" + counter] = utPLines["pline" + i];
            }
        } catch (e) {
            counter++;
            uParagraphs["para" + counter] = utPLines["pline" + i];
        }
    }
    //make cells
    counter = 0;
    for (i = 1; i <= Object.keys(utTLines).length; i += 2) {
        counter++;
        uCells["cell" + counter] = { label: utTLines["tline" + i], value: utTLines["tline" + (i + 1)] };
    }

    return res;
}

module.exports.extractLinesbyStartTextAndOffset = function (baselinePageData, utPageData, stext, yOffset) {
    var startY = 0;
    var sub = [];
    var ut = {};
    var res = { ut, sub };

    for (var i in utPageData.Texts) {
        var text = utPageData.Texts[i];
        if (text.R[0].T.match(new RegExp(stext))) {
            ut.line1 = text;
            startY = text.y;
        }
    }

    for (var j in utPageData.Texts) {
        var text = utPageData.Texts[j];
        if (text.y > startY && text.y < yOffset && text.R[0].TS[1] > 8) {
            sub.push({
                text: decodeURIComponent(text.R[0].T).trim(),
                size: text.R[0].TS[1],
                color: text.oc,
                x: text.x,
                y: text.y
            });
        }
    }

    for (var k = 1; k < sub.length; k++) {
        if (sub[k - 1].y == sub[k].y) {
            sub[k - 1].text += sub[k].text;
            sub.splice(k, 1);
        }
    }
    for (var k = 1; k < sub.length; k++) {
        if (sub[k - 1].y == sub[k].y) {
            sub[k - 1].text += sub[k].text;
            sub.splice(k, 1);
        }
    }

    return res;
}

module.exports.extractLinesbyStartOffsets = function (baselinePageData, utPageData, yMin, yMax) {
    var startY = 0;
    var sub = [];
    var ut = {};
    var res = { ut, sub };
    var pObj;

    for (var j in utPageData.Texts) {
        var text = utPageData.Texts[j];
        if (text.y > yMin && text.y < yMax && text.R[0].TS[1] > 44) {
            if (parseInt(text.R[0].TS[1]) > 56 && parseInt(text.R[0].TS[1]) < 60) {
                pObj = text;
            }

            sub.push({
                text: decodeURIComponent(text.R[0].T).trim(),
                size: text.R[0].TS[1],
                color: text.oc,
                x: text.x,
                y: text.y
            });
        }
    }

    for (var k = 1; k < sub.length; k++) {
        if (sub[k - 1].y == sub[k].y) {
            sub[k - 1].text += sub[k].text;
            sub.splice(k, 1);
            k--;
        }
    }

    try {

        for (var k = 0; k < sub.length; k++) {
            if (parseInt(sub[k].size) > 56 && parseInt(sub[k].size) < 60) {
                ut.line1 = {
                    R: [{
                        S: -1, T: sub[k].text,
                        TS: [0, sub[k].size, 0, 0]
                    }],
                    oc: pObj.oc,
                    sw: pObj.sw,
                    w: pObj.w,
                    x: pObj.x,
                    y: pObj.y
                };
                sub.splice(k, 1);
            }
        }

    } catch (e) { }

    return res;
}

module.exports.extractLinesbyStartTextSizeAndOffset = function (baselinePageData, utPageData, stext, sSize, yOffset) {
    var startY = 0;
    var sub = [];
    var ut = {};
    var res = { ut, sub };

    for (var i in utPageData.Texts) {
        var text = utPageData.Texts[i];
        if (text.R[0].T.match(new RegExp(stext)) && text.R[0].TS[1] == sSize) {
            ut.line1 = text;
            startY = text.y;
        }
    }

    for (var j in utPageData.Texts) {
        var text = utPageData.Texts[j];
        if (text.y > startY && text.y < yOffset && text.R[0].TS[1] > 8) {
            sub.push({
                text: decodeURIComponent(text.R[0].T).trim(),
                size: text.R[0].TS[1],
                color: text.oc,
                x: text.x,
                y: text.y
            });
        }
    }

    for (var k = 1; k < sub.length; k++) {
        if (sub[k - 1].y == sub[k].y) {
            sub[k - 1].text += sub[k].text;
            sub.splice(k, 1);
        }
    }
    for (var k = 1; k < sub.length; k++) {
        if (sub[k - 1].y == sub[k].y) {
            sub[k - 1].text += sub[k].text;
            sub.splice(k, 1);
        }
    }
    return res;
}

module.exports.extractLinesbyOffsets = function (baselinePageData, utPageData, sOffset, eOffset) {
    var startY = sOffset;
    var sub = [];
    var ut = {};
    var res = { ut, sub };
    var counter = 0;


    for (var j in utPageData.Texts) {
        var text = utPageData.Texts[j];
        if (text.y > startY && text.y < eOffset && text.R[0].TS[1] > 8) {
            if (counter == 0) {
                ut.line1 = text;
                counter++;
            } else {
                sub.push({
                    text: decodeURIComponent(text.R[0].T).trim(),
                    size: text.R[0].TS[1],
                    color: text.oc,
                    x: text.x,
                    y: text.y
                });
            }
        }
    }

    for (var rpt = 1; rpt < 20; rpt++) {
        for (var k = 1; k < sub.length; k++) {
            if (sub[k - 1].y == sub[k].y) {
                sub[k - 1].text += sub[k].text;
                sub.splice(k, 1);
            }
        }
    }

    return res;
}

module.exports.maskX = function (content) {
    var temp = content.replace(new RegExp("[0-9]", "g"), "");
    temp = temp.replace(new RegExp("January", "g"), "");
    temp = temp.replace(new RegExp("February", "g"), "");
    temp = temp.replace(new RegExp("March", "g"), "");
    temp = temp.replace(new RegExp("April", "g"), "");
    temp = temp.replace(new RegExp("May", "g"), "");
    temp = temp.replace(new RegExp("June", "g"), "");
    temp = temp.replace(new RegExp("July", "g"), "");
    temp = temp.replace(new RegExp("August", "g"), "");
    temp = temp.replace(new RegExp("September", "g"), "");
    temp = temp.replace(new RegExp("October", "g"), "");
    temp = temp.replace(new RegExp("November", "g"), "");
    temp = temp.replace(new RegExp("December", "g"), "");
    return temp;
}

module.exports.pullText = function (str, startStr, endStr) {
    try {
        return str.substring(str.indexOf(startStr), str.indexOf(endStr)).replace(startStr, "").trim();
    } catch (e) {
        return null;
    }
}

module.exports.pullTextbyStartChar = function (str, startStr) {
    try {
        return str.substring(str.indexOf(startStr), str.length).replace(startStr, "").trim();
    } catch (e) {
        return null;
    }
}

module.exports.extractLinesbyStartTextClean = function (bdata, tdata, stext, tLines) {
    var counter = 0;
    var startY;
    var bl = {};
    var ut = {};
    var res = { bl, ut };

    //baseline
    counter = 0;
    startY = 0;
    startY = getXYClean(bdata, new RegExp(stext)).y;

    for (var i in bdata.Texts) {
        if (i == 0)
            continue;
        var text = bdata.Texts[i];
        if (text.y >= startY) {
            counter++;
            bl["line" + counter] = text;
            bl["line" + counter].R[0].T = decodeURIComponent(bl["line" + counter].R[0].T);
        }
        if (counter >= tLines)
            break;
    }

    //ut
    counter = 0;
    startY = 0;
    startY = getXYClean(tdata, new RegExp(stext)).y;

    for (var i in tdata.Texts) {
        if (i == 0)
            continue;
        var text = tdata.Texts[i];
        if (text.y >= startY) {
            counter++;
            ut["line" + counter] = text;
            ut["line" + counter].R[0].T = decodeURIComponent(ut["line" + counter].R[0].T);
        }
        if (counter >= tLines)
            break;
    }
    return res;
}

module.exports.extractLinesbyStartText = function (bdata, tdata, stext, tLines) {
    var counter = 0;
    var startY;
    var bl = {};
    var ut = {};
    var res = { bl, ut };

    //baseline
    counter = 0;
    startY = 0;
    startY = getXY(bdata, new RegExp(stext)).y;

    for (var i in bdata.Texts) {
        var text = bdata.Texts[i];
        if (text.y >= startY) {
            try {
                if (text.y == bdata.Texts[i - 1].y && text.sw == bdata.Texts[i - 1].sw) {
                    bl["line" + counter].R[0].T += decodeURIComponent(text.R[0].T);
                } else {
                    counter++;
                    bl["line" + counter] = text;
                    bl["line" + counter].R[0].T = decodeURIComponent(bl["line" + counter].R[0].T);
                }
            } catch (e) {
                // counter++;
                // bl["line" + counter] = text;
            };
        }
        if (counter >= tLines)
            break;
    }

    //ut
    counter = 0;
    startY = 0;
    startY = getXY(tdata, new RegExp(stext)).y;

    for (var i in tdata.Texts) {
        var text = tdata.Texts[i];
        if (text.y >= startY) {
            try {
                if (text.y == tdata.Texts[i - 1].y && text.sw == tdata.Texts[i - 1].sw) {
                    ut["line" + counter].R[0].T += decodeURIComponent(text.R[0].T);
                } else {
                    counter++;
                    ut["line" + counter] = text;
                    ut["line" + counter].R[0].T = decodeURIComponent(ut["line" + counter].R[0].T);
                }
            } catch (e) {
                // counter++;
                // ut["line" + counter] = text;
            }

        }
        if (counter >= tLines)
            break;
    }
    return res;
}

module.exports.makeFormsImageData = function (formImage) {

    var mergedFormImage = formImage;

    for (var i = 1; i < formImage.Pages.length; i++) {
        for (var j = 0; j < formImage.Pages[i].Boxsets.length; j++) {
            mergedFormImage.Pages[0].Boxsets.push(formImage.Pages[i].Boxsets[j]);
        }
        for (var j = 0; j < formImage.Pages[i].Fields.length; j++) {
            mergedFormImage.Pages[0].Fields.push(formImage.Pages[i].Fields[j]);
        }
        for (var j = 0; j < formImage.Pages[i].Fills.length; j++) {
            mergedFormImage.Pages[0].Fills.push(formImage.Pages[i].Fills[j]);
        }
        for (var j = 0; j < formImage.Pages[i].HLines.length; j++) {
            mergedFormImage.Pages[0].HLines.push(formImage.Pages[i].HLines[j]);
        }
        for (var j = 0; j < formImage.Pages[i].Texts.length; j++) {
            formImage.Pages[i].Texts[j]["pn"] = i;
            mergedFormImage.Pages[0].Texts.push(formImage.Pages[i].Texts[j]);
        }
        for (var j = 0; j < formImage.Pages[i].VLines.length; j++) {
            mergedFormImage.Pages[0].VLines.push(formImage.Pages[i].VLines[j]);
        }
    }
    return mergedFormImage;
}

/** */
module.exports.extractLinesbyBoxandPage = function (bdata, tdata, box, pageNumber) {
    var counter = 0;
    var bl = {};
    var ut = {};
    var res = { bl, ut };

    for (var i = 0; i < bdata.Texts.length; i++) {

        var text = bdata.Texts[i];
        text.x = clip(text.x, 10);
        text.y = clip(text.y, 10);
        text.R[0].TS[1] = roundUp(text.R[0].TS[1], 10);
        if (isContentInBoxandPage(text, box, pageNumber)) {
            try {
                if (bdata.Texts[i - 1].y == text.y
                    && bdata.Texts[i - 1].R[0].TS[1] == text.R[0].TS[1]
                    && bdata.Texts[i - 1].R[0].TS[2] == text.R[0].TS[2]) {
                    res.bl["line" + counter].R[0].T += text.R[0].T;
                    res.bl["line" + counter].R[0].T = decodeURIComponent(res.bl["line" + counter].R[0].T);
                    bdata.Texts.splice(i, 1);
                    i--;
                } else {
                    if (decodeURIComponent(text.R[0].T).trim() == "")
                        continue;
                    counter++;
                    res.bl["line" + counter] = text;
                    res.bl["line" + counter].R[0].T = text.R[0].T;
                    res.bl["line" + counter].R[0].T = decodeURIComponent(res.bl["line" + counter].R[0].T);
                }
            } catch (e) {
                if (decodeURIComponent(text.R[0].T).trim() == "")
                    continue;
                counter++;
                res.bl["line" + counter] = text;
                res.bl["line" + counter].R[0].T = text.R[0].T;
                res.bl["line" + counter].R[0].T = decodeURIComponent(res.bl["line" + counter].R[0].T);
            }
        }
    }

    var counter = 0;
    for (var i = 0; i < tdata.Texts.length; i++) {
        var text = tdata.Texts[i];
        text.x = clip(text.x, 10);
        text.y = clip(text.y, 10);
        text.R[0].TS[1] = roundUp(text.R[0].TS[1], 10);
        if (isContentInBoxandPage(text, box, pageNumber)) {
            try {
                if (tdata.Texts[i - 1].y == text.y
                    && tdata.Texts[i - 1].R[0].TS[1] == text.R[0].TS[1]
                    && tdata.Texts[i - 1].R[0].TS[2] == text.R[0].TS[2]) {
                    res.ut["line" + counter].R[0].T += text.R[0].T;
                    res.ut["line" + counter].R[0].T = decodeURIComponent(res.ut["line" + counter].R[0].T);
                    tdata.Texts.splice(i, 1);
                    i--;
                } else {
                    if (decodeURIComponent(text.R[0].T).trim() == "")
                        continue;
                    counter++;
                    res.ut["line" + counter] = text;
                    res.ut["line" + counter].R[0].T = text.R[0].T;
                    res.ut["line" + counter].R[0].T = decodeURIComponent(res.ut["line" + counter].R[0].T);
                }
            } catch (e) {
                if (decodeURIComponent(text.R[0].T).trim() == "")
                    continue;
                counter++;
                res.ut["line" + counter] = text;
                res.ut["line" + counter].R[0].T = text.R[0].T;
                res.ut["line" + counter].R[0].T = decodeURIComponent(res.ut["line" + counter].R[0].T);
            }
        }
    }

    return res;
}

module.exports.extractAllLinesbyPage = function (bdata, tdata, pageNumber) {
    var box = { x1: -1, x2: 99, y1: -1, y2: 99 };
    var counter = 0;
    var bl = {};
    var ut = {};
    var res = { bl, ut };

    for (var i = 0; i < bdata.Texts.length; i++) {
        var text = bdata.Texts[i];
        res.bl["line" + text.txtline] = text;
    }

    var counter = 0;
    for (var i = 0; i < tdata.Texts.length; i++) {
        var text = tdata.Texts[i];
        text.x = clip(text.x, 10);
        text.y = clip(text.y, 10);
        text.R[0].TS[1] = roundUp(text.R[0].TS[1], 10);
        if (isContentInBoxandPage(text, box, pageNumber)) {
            try {
                if (tdata.Texts[i - 1].y == text.y
                    && tdata.Texts[i - 1].R[0].TS[1] == text.R[0].TS[1]
                    && tdata.Texts[i - 1].R[0].TS[2] == text.R[0].TS[2]) {
                    res.ut["line" + counter].R[0].T += text.R[0].T;
                    res.ut["line" + counter].R[0].T = decodeURIComponent(res.ut["line" + counter].R[0].T);
                    tdata.Texts.splice(i, 1);
                    i--;
                } else {
                    if (decodeURIComponent(text.R[0].T).trim() == "")
                        continue;
                    counter++;
                    res.ut["line" + counter] = text;
                    res.ut["line" + counter].R[0].T = text.R[0].T;
                    res.ut["line" + counter].R[0].T = decodeURIComponent(res.ut["line" + counter].R[0].T);
                }
            } catch (e) {
                if (decodeURIComponent(text.R[0].T).trim() == "")
                    continue;
                counter++;
                res.ut["line" + counter] = text;
                res.ut["line" + counter].R[0].T = text.R[0].T;
                res.ut["line" + counter].R[0].T = decodeURIComponent(res.ut["line" + counter].R[0].T);
            }
        }
    }

    return res;
}
module.exports.extractSimpleParagraphsbyBoxandPage = function (bdata, tdata, box, pageNumber) {
    var counter = 0;
    var bl_lines = {};
    var ut_lines = {};
    var bParagraphs = {};
    var uParagraphs = {};
    var bl = { paragraphs: bParagraphs };
    var ut = { paragraphs: uParagraphs };
    var res = { bl, ut };

    counter = 0;
    for (var i in bdata.Texts) {
        var text = bdata.Texts[i];
        text.x = clip(text.x, 10);
        text.y = clip(text.y, 10);
        text.R[0].TS[1] = roundUp(text.R[0].TS[1], 10);
        if (isContentInBoxandPage(text, box, pageNumber)) {
            counter++;
            bl_lines["line" + counter] = text;
            bl_lines["line" + counter].R[0].T = text.R[0].T;
        }
    }

    counter = 0;
    for (i = 1; i <= Object.keys(bl_lines).length; i++) {
        try {
            if ((bl_lines["line" + i].y - bl_lines["line" + (i - 1)].y) < 0.8) {
                bParagraphs["para" + counter].R[0].T += "" + bl_lines["line" + i].R[0].T;
            } else {
                counter++;
                bParagraphs["para" + counter] = bl_lines["line" + i];
            }
        } catch (e) {
            counter++;
            bParagraphs["para" + counter] = bl_lines["line" + i];
        }
    }

    counter = 0;
    for (var i in tdata.Texts) {
        var text = tdata.Texts[i];
        text.x = clip(text.x, 10);
        text.y = clip(text.y, 10);
        text.R[0].TS[1] = roundUp(text.R[0].TS[1], 10);
        if (isContentInBoxandPage(text, box, pageNumber)) {
            counter++;
            ut_lines["line" + counter] = text;
            ut_lines["line" + counter].R[0].T = text.R[0].T;
        }
    }

    counter = 0;
    for (i = 1; i <= Object.keys(ut_lines).length; i++) {
        try {
            if ((ut_lines["line" + i].y - ut_lines["line" + (i - 1)].y) < 0.8) {
                uParagraphs["para" + counter].R[0].T += "" + ut_lines["line" + i].R[0].T;
            } else {
                counter++;
                uParagraphs["para" + counter] = ut_lines["line" + i];
            }
        } catch (e) {
            counter++;
            uParagraphs["para" + counter] = ut_lines["line" + i];
        }
    }

    return res;
}

var isContentInBoxandPage = function (pdata, box, page) {
    if (pdata.pn === undefined)
        pdata.pn = 0;

    if (pdata.pn != page)
        return false;

    return parseFloat(pdata.x) >= parseFloat(box.x1)
        && parseFloat(pdata.x) <= parseFloat(box.x2)
        && parseFloat(pdata.y) >= parseFloat(box.y1)
        && parseFloat(pdata.y) <= parseFloat(box.y2)
}

var roundUp = function (num, precision) {
    return Math.ceil(num * precision) / precision
}

var clip = function (num, precision) {
    var temp = parseInt(num * precision);
    return temp / precision;
}

/**Checkpoint Combo Functions */
module.exports.testLine = function (cpname, contentType, bdata, tdata, reporter) {

    var result = true;
    switch (contentType.split("-")[0]) {

        //Content Match
        case "any":
            if (!allege(tdata.R[0].T.trim().length != 0,
                "CP : " + cpname + " Any Content Match :",
                bdata.R[0].T,
                tdata.R[0].T,
                reporter))
                result = false;
            break;
        case "static":
            if (!allege(bdata.R[0].T.trim().toUpperCase() == tdata.R[0].T.trim().toUpperCase(),
                "CP : " + cpname + " Content Match :",
                bdata.R[0].T,
                tdata.R[0].T,
                reporter))
                result = false;
            break;
        case "equal":
            if (!allege(bdata.trim().toUpperCase() == tdata.R[0].T.trim().toUpperCase(),
                "CP : " + cpname + " Content Match :",
                bdata,
                tdata.R[0].T,
                reporter))
                result = false;
            return result;
        case "masked_equal":
            if (!allege(bdata.trim().toUpperCase() == tdata.R[0].T.trim().toUpperCase(),
                "CP : " + cpname + " Content Match :",
                bdata,
                tdata.R[0].T,
                reporter))
                result = false;
            return result;
        case "notequal":
            if (!allege(bdata.trim().toUpperCase() != tdata.R[0].T.trim().toUpperCase(),
                "CP : " + cpname + " Content Match :",
                "not " + bdata,
                tdata.R[0].T,
                reporter))
                result = false;
            return result;
        case "masked_static":
            if (!allege(this.maskX(bdata.R[0].T).trim().toUpperCase() == this.maskX(tdata.R[0].T).trim().toUpperCase(),
                "CP : " + cpname + " Masked Content Match :",
                bdata.R[0].T,
                tdata.R[0].T,
                reporter))
                result = false;
            break;
        case "stmt_lob":
            if (!allege("Auto insurance".trim().toUpperCase() == tdata.R[0].T.trim().toUpperCase()
                || "Home insurance".trim().toUpperCase() == tdata.R[0].T.trim().toUpperCase()
                || "Umbrella insurance".trim().toUpperCase() == tdata.R[0].T.trim().toUpperCase(),
                "CP : " + cpname + " Content Matched in [Auto insurance | Home insurance | Umbrella insurance] :",
                "Auto insurance or Home insurance or Umbrella insurance",
                tdata.R[0].T,
                reporter))
                result = false;
            break;
        case "vanilla_lob":
            if (!allege("Auto".trim().toUpperCase() == tdata.trim().toUpperCase()
                || "Home".trim().toUpperCase() == tdata.trim().toUpperCase()
                || "Umbrella".trim().toUpperCase() == tdata.trim().toUpperCase(),
                "CP : " + cpname + " Content Matched in [Auto | Home | Umbrella] :",
                "Auto or Home or Umbrella ",
                tdata,
                reporter))
                result = false;
            return result;
        case "vanilla_number":
            if (!allege(this.isValidWholeNumber(tdata.trim()),
                "CP : " + cpname + " Content is Valid Number",
                "[0-9] ",
                tdata,
                reporter))
                result = false;
            return result;
        case "policy":
            if (!allege((tdata.R[0].T.trim().length == 10
                || tdata.R[0].T.trim().length == 11)
                && tdata.R[0].T.trim().split("-").length == 3
                && this.isValidWholeNumber(tdata.R[0].T.trim().replace(new RegExp("-", "g"), "")),
                "CP : " + cpname + " Policy Content Format Match :",
                bdata.R[0].T,
                tdata.R[0].T,
                reporter))
                result = false;
            break;
        case "policy_number":
            if (!allege(this.isValidWholeNumber(tdata.trim()) && (tdata.trim().length == 8 || tdata.trim().length == 9),
                "CP : " + cpname + " Content is Valid Policy Number",
                "[0-9] Length 8 or 9 ",
                tdata,
                reporter))
                result = false;
            return result;
        case "policy_smt_description":
            if (!allege(tdata.trim().split(" ").length > 1
                && tdata.trim().match(new RegExp("– Underwritten by")) != null,
                "CP : " + cpname + " Content is Valid Policy Description",
                "more than 2 words; should contain [– Underwritten by]",
                tdata,
                reporter))
                result = false;
            return result;
        case "date":
            if (!allege(this.isValidDate(tdata.R[0].T),
                "CP : " + cpname + " Content Format(Date) Match :",
                bdata.R[0].T,
                tdata.R[0].T,
                reporter))
                result = false;
            break;
        case "vanilla_date":
            if (!allege(this.isValidDate(tdata),
                "CP : " + cpname + " Content Format(Date) Match :",
                "is valid date (Month, day year)",
                tdata,
                reporter))
                result = false;
            return result;
        case "amount":
            if (!allege(this.isValidDollar(tdata.R[0].T),
                "CP : " + cpname + " Content Format($Amount) Match :",
                bdata.R[0].T,
                tdata.R[0].T,
                reporter))
                result = false;
            break;
        case "vanilla_amount":
            if (!allege(this.isValidDollar(tdata),
                "CP : " + cpname + " Content Format($Amount) Match :",
                "[$X.XX]",
                tdata,
                reporter))
                result = false;
            return result;
        case "billing_account":
            if (!allege(this.isValidBillingAccount(tdata.R[0].T.trim()),
                "CP : " + cpname + " Content Format(AXXXXXXXXX) Match :",
                bdata.R[0].T,
                tdata.R[0].T,
                reporter))
                result = false;
            break;

        case "full_name":
            if (!allege(this.isValidFullName(tdata.R[0].T.trim()),
                "CP : " + cpname + " Content Format(John Smith) Match :",
                bdata.R[0].T,
                tdata.R[0].T,
                reporter))
                result = false;
            break;

        case "phone_number":
            if (!allege(this.isValidPhoneFormat(tdata.R[0].T.trim()),
                "CP : " + cpname + " Content Format(X-XX-XXX-XXXX) Match :",
                bdata.R[0].T,
                tdata.R[0].T,
                reporter))
                result = false;
            break;

        case "address_line_1":
            if (!allege(this.isValidAddressLine1(tdata.R[0].T.trim()),
                "CP : " + cpname + " Content Format(Street Name) Match :",
                bdata.R[0].T,
                tdata.R[0].T,
                reporter))
                result = false;
            break;

        case "address_line_2":

            if (!allege(this.isValidAddressLine2(tdata.R[0].T.trim()),
                "CP : " + cpname + " Content Format(City, ST. XXXXX) Match :",
                bdata.R[0].T,
                tdata.R[0].T,
                reporter))
                result = false;

            var bl_resolved = this.resolveAddressLine2(bdata.R[0].T);
            var ut_resolved = this.resolveAddressLine2(tdata.R[0].T);

            if (!allege(this.isValidCityName(ut_resolved.city.trim()),
                "CP : " + cpname + " City Content Match :",
                bl_resolved.city,
                ut_resolved.city,
                reporter))
                result = false;

            if (!allege(this.isValidStateCode(ut_resolved.stateCode.trim()),
                "CP : " + cpname + " State Content Match :",
                bl_resolved.stateCode,
                ut_resolved.stateCode,
                reporter))
                result = false;

            if (!allege(this.isValidZipCode(ut_resolved.zip.trim()),
                "CP : " + cpname + " Zip Content Match :",
                bl_resolved.zip,
                ut_resolved.zip,
                reporter))
                result = false;
            break;

        case "address_line_2_USPS":

            if (!allege(this.isValidAddressLine2_USPS(tdata.R[0].T.trim()),
                "CP : " + cpname + " Content Format(City ST XXXXX) Match :",
                bdata.R[0].T,
                tdata.R[0].T,
                reporter))
                result = false;

            var bl_resolved = this.resolveAddressLine2(bdata.R[0].T);
            var ut_resolved = this.resolveAddressLine2(tdata.R[0].T);

            if (!allege(this.isValidCityName(ut_resolved.city.trim()),
                "CP : " + cpname + " City Content Match :",
                bl_resolved.city,
                ut_resolved.city,
                reporter))
                result = false;

            if (!allege(this.isValidStateCode(ut_resolved.stateCode.trim()),
                "CP : " + cpname + " State Content Match :",
                bl_resolved.stateCode,
                ut_resolved.stateCode,
                reporter))
                result = false;

            if (!allege(this.isValidZipCode(ut_resolved.zip.trim()),
                "CP : " + cpname + " Zip Content Match :",
                bl_resolved.zip,
                ut_resolved.zip,
                reporter))
                result = false;
            break;


        case "email_p1":
            if (!allege(this.isValidEmail_p1(tdata.R[0].T.trim()),
                "CP : " + cpname + " Content Format(lowercase) Match :",
                bdata.R[0].T,
                tdata.R[0].T,
                reporter))
                result = false;
            break;

        case "email_p2":
            if (!allege(this.isValidEmail_p2(tdata.R[0].T.trim()),
                "CP : " + cpname + " Content Format(@lowercase.lowercase) Match :",
                bdata.R[0].T,
                tdata.R[0].T,
                reporter))
                result = false;
            break;

        default:
            reporter.criticalError("CP : " + cpname + " Test Line :", "Content Type not in dictionary.");
            break;
    }

    //Text Position Match
    if (contentType.split("-")[1] === undefined) {
        if (!allege(bdata.x == tdata.x
            && bdata.y == tdata.y,
            "CP : " + cpname + " Position Match :",
            "(x:" + bdata.x + ", y:" + bdata.y + ")",
            "(x:" + tdata.x + ", y:" + tdata.y + ")",
            reporter))
            result = false;
    } else if (contentType.split("-")[1].match(new RegExp("p")) != null) {
        //skip position match
        reporter.skipped("CP : " + cpname + " Position Match :", "Position match skipped", "as per rule -p");
    } else if (contentType.split("-")[1].match(new RegExp("x")) != null) {
        //skip position match
        reporter.skipped("CP : " + cpname + " Position Match :", "Position match skipped", "as per rule -x");
        if (!allege(bdata.y == tdata.y,
            "CP : " + cpname + " Y Position Match :",
            "(y:" + bdata.y + ")",
            "(y:" + tdata.y + ")",
            reporter))
            result = false;
    } else if (contentType.split("-")[1].match(new RegExp("y")) != null) {
        //skip position match
        reporter.skipped("CP : " + cpname + " Position Match :", "Position match skipped", "as per rule -y");
        if (!allege(bdata.x == tdata.x,
            "CP : " + cpname + " X Position Match :",
            "(x:" + bdata.x + ")",
            "(x:" + tdata.x + ")",
            reporter))
            result = false;
    } else {
        if (!allege(bdata.x == tdata.x
            && bdata.y == tdata.y,
            "CP : " + cpname + " Position Match :",
            "(x:" + bdata.x + ", y:" + bdata.y + ")",
            "(x:" + tdata.x + ", y:" + tdata.y + ")",
            reporter))
            result = false;
    }
    //Text Style Match
    if (!allege(bdata.R[0].TS[0] == tdata.R[0].TS[0]
        && bdata.R[0].TS[1] == tdata.R[0].TS[1]
        && bdata.R[0].TS[2] == tdata.R[0].TS[2]
        && bdata.R[0].TS[3] == tdata.R[0].TS[3],
        "CP : " + cpname + " Text Style Match :",
        "(Font ID:" + bdata.R[0].TS[0] + ", Size:" + bdata.R[0].TS[1] + ", Bold:" + bdata.R[0].TS[2] + ", Italic:" + bdata.R[0].TS[3] + ")",
        "(Font ID:" + tdata.R[0].TS[0] + ", Size:" + tdata.R[0].TS[1] + ", Bold:" + tdata.R[0].TS[2] + ", Italic:" + tdata.R[0].TS[3] + ")",
        reporter))
        result = false;

    //Text color Match
    if (!allege(bdata.oc == tdata.oc,
        "CP : " + cpname + " Color Match :",
        "(HEX):" + (bdata.oc === undefined ? 'default' : bdata.oc),
        "(HEX):" + (tdata.oc === undefined ? 'default' : tdata.oc),
        reporter))
        result = false;

    return result;
}

//new function to report checkpoint
var allege = function (condition, message, expected, actual, rptObj) {
    if (condition) {
        rptObj.pass(message, expected, actual);
        return true;
    } else {
        rptObj.fail(message, expected, actual);
        return false;
    }
}
