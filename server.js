/**
 * @name pdfCompare-webapp
 * @module server.js
 * @author rmahato
 */

import { config } from './config.js';
//import tools from './src/tools.js';
import express  from 'express';
var app = express();
import path from 'path';
//import  http from 'http';
//const pdfindex = require("./pdfcont.js");
import { compareSinglepdf,getResolvedPath,compareBatchpdf } from './pdfcont.js';

import { Server } from 'socket.io';
import { createServer } from 'http';

const server = createServer(app); 
const io = new Server(server);

// var server = http.createServer(app)
//var io = require('socket.io')(server)
//import { io } from server 

//var server = require('http').Server(app);
//var io = require('socket.io')(server);
var lock = false;
//import { getReportPath } from './src/core/reporter.js';


//var pdfcompareSingle = require("./index-web.js");
//var pdfcompareBatch = require("./batch-web.js");

import  fs, { watch, readdir, readdirSync } from 'fs';
import pkg from 'body-parser';
const { bodyParser, json, urlencoded } = pkg;
import methodOverride from 'method-override';
import multer, { diskStorage } from 'multer';
//import { pdfindex } from "./pdfcont.js";
var port = process.env.PORT || config.toolServerPort;

var testFileStorage = diskStorage({
    // destination: function (req, file, cb) {
    //     cb(null, configuration.config.testPDFDirectory)
    // },
    // filename: function (req, file, cb) {
    //     cb(null, file.originalname);
    // }
});

var baselineFileStorage = diskStorage({
    // destination: function (req, file, cb) {
    //     cb(null, configuration.config.baselinePDFDirectory)
    // },
    // filename: function (req, file, cb) {
    //     cb(null, file.originalname);
    // }
});

var dynamicdataFileStorage = diskStorage({
    // destination: function (req, file, cb) {
    //     cb(null, configuration.config.dynamicDataDirectory)
    // },
    // filename: function (req, file, cb) {
    //     cb(null, file.originalname);
    // }
});

var testFileUpload = multer({ storage: testFileStorage }).single('file');
// console.log("testFileUpload path is "+testFileUpload);
var baselineFileUpload = multer({ storage: baselineFileStorage }).single('file');
// console.log("baselineFileUpload path is "+baselineFileUpload);
var dynamicdataFileUpload = multer({ storage: dynamicdataFileStorage }).single('file');
// console.log("dynamicdataFileUpload path is "+dynamicdataFileUpload);


app.use(json());
app.use(json({ type: 'application/vnd.api+json' }));
app.use(urlencoded({ extended: true }));
app.use(methodOverride('X-HTTP-Method-Override'));
// app.use(express(path.__dirname + '/public'));
// app.use(express(path.__dirname + '/reports'));
app.use(express.static('public'));
app.use(express.static('reports'));
server.listen(port);
server.timeout = 20 * 60 * 1000;
//Express routing:

app.get('/resultlist', function (req, res) {
    getResultFolderList(function (rlist) {
        res.send({ rlist: rlist });
    })
});

app.get('/getlock', function (req, res) {
    res.send({ lock: lock ? 'locked' : 'unlocked' });
});

app.get('/batchsize', function (req, res) {
    getInputFolderSize(function (count) {
        res.send({ count: count });
    })
});

app.post('/uploadtestfile', function (req, res) {
    testFileUpload(req, res, function (err) {
        if (err) {
            console.log(err);
            res.json({ error_code: 1, err_desc: err });
            return;
        }
        // var testFileName = req.file.filename;
        // console.log("testFileName is "+testFileName);
        // var baselineXref = tools.extractBaselineFileXref(testFileName);
        // console.log("baselineXref is "+baselineXref);
        // var dynamicDataFname = tools.getDynamicDataFilenamebyTestPdfName(testFileName);
        // console.log("dynamicDataFname is "+dynamicDataFname);
        // var baselineFileName = tools.getBaselineFilenamebyTestPdfName(baselineXref);
        // console.log("baselineFileName is "+baselineFileName);
        res.json({
            error_code: 0,
            err_desc: null,
            // baselineFileName: baselineFileName,
            // dynamicDataFname: dynamicDataFname
        });
     });
});

app.post('/uploadbaselinefile', function (req, res) {
    baselineFileUpload(req, res, function (err) {
        if (err) {
            console.log(err);
            res.json({ error_code: 1, err_desc: err });
            return;
        }
        res.json({ error_code: 0, err_desc: null });
    });
});

app.post('/uploaddynamicdatafile', function (req, res) {
    dynamicdataFileUpload(req, res, function (err) {
        if (err) {
            console.log(err);
            res.json({ error_code: 1, err_desc: err });
            return;
        }
        res.json({ error_code: 0, err_desc: null });
    });
});

app.post('/singlecompare', async (req, res) => {
    if (!lock) {
        console.log("req.body.data.testFname before"+ req.body.data.testFname);
        console.log("req.body.data.baselineFname before"+ req.body.data.baselineFname);
        lock = true;
        io.emit('system:serverbusy', { appbusy: 'busy' });
        console.log("$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$4");
        console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
        
    //     const resolvedConfigPath = await getResolvedPath(undefined, 'config');
    //     const resolvedTestfilePath = await getResolvedPath(req.body.data.testFname, 'file');
    //     console.log("resolvedTestfilePath is "+resolvedTestfilePath);
    //     const resolvedBaselinePath = await getResolvedPath(req.body.data.baselineFname, 'baseline');
    //     console.log("resolvedBaselinePath is "+resolvedBaselinePath);
    //     const resolvedDynamicDataPath = await getResolvedPath(req.body.data.dynamicDataFname, 'dynamic-data');
    //     var remoteExecInput = {
    //         testFname: resolvedTestfilePath,
    //         baselineFname: resolvedBaselinePath,
    //         dynamicDataFname: resolvedDynamicDataPath,
    //         configFname: resolvedConfigPath
    //     };
    //     await compareSinglepdf(remoteExecInput);
    //    // await console.log("After Single  PDF");
        
    //         res.send({
    //             reportlink: getReportPath(),
    //             result: "",
    //             formDetails: ""
    //         });
    //         lock = false;
    //         io.emit('system:serverbusy', { appbusy: 'free' });
      
        // var remoteExecInput = {
        //     testFname: req.body.data.testFname,
        //     baselineFname: req.body.data.baselineFname,
        //     dynamicDataFname: req.body.data.dynamicDataFname,
        //     ruleName: req.body.data.ruleName
        // };
        // pdfcompareSingle.remoteExec(remoteExecInput, function (result, rpt) {
        //     res.send({
        //         reportlink: rpt.output,
        //         result: result.result,
        //         formDetails: result.checkpoints.formDetails
        //     });
        //     lock = false;
        //     io.emit('system:serverbusy', { appbusy: 'free' });
        // });
    }
});
app.post('/batchcompare', async function (req, res) {
    lock = true;
    io.emit('system:serverbusy', { appbusy: 'busy' });
    await compareBatchpdf(io);

    // pdfcompareBatch.remoteExec(io, function (rptlink) {
        res.send({
            reportlink: "C:\\Vaibhav\\CompareTool\\compare-pdf\\reports"
        });
        lock = false;
        io.emit('system:serverbusy', { appbusy: 'free' });
    // }, function (progress) {
    //     io.emit('system:batchprogress', { progress: progress });
    // });
});

app.get('/', function (req, res) {
    res.sendfile('public/views/index.html');
});

fs.watch(config.testPDFDirectory, { encoding: 'buffer' }, function (eventType, filename) {
    getInputFolderSize(function (count) {
        io.emit('system:inputfoldersize', { count: count });
    });
});

var getInputFolderSize = function (callback) {
    var count = 0;
    readdir(config.testPDFDirectory, function (err, files) {
        files.forEach(function (file) {
            count++;
        });
        callback(count);
    });
}

var getResultFolderList = function (callback) {
    try {
        var resultFolderList = [];
        var fldrArray = readdirSync(config.testResultDirectory);
        fldrArray.forEach(function (folder) {
            
            var fileArray = readdirSync(config.testResultDirectory + "/" + folder);
            var fileList = [];
            fileArray.forEach(function (file) {
                fileList.push({ file: file });
            });
            resultFolderList.push({ folder: folder, files: fileList, show: 0 });
        });
        console.dir(resultFolderList)
        callback(resultFolderList);
    } catch (e) {
        console.dir(e);
        callback({});
    }
}
console.log(config.toolName + ' ' + config.toolVersion + ' running on ' + port);