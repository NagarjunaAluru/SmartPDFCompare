angular.module('fileUpload', ['ngFileUpload'])
    .controller('SingleModeCtrl', ['Upload', '$window', '$scope', 'toaster', '$rootScope', '$http',
        function (Upload, $window, $scope, toaster, $rootScope, $http) {

            var vm = this;
            $scope.rules = [{ name: 'Demo Rule 1 (Word / PDF)', code: 'INSU0001' },
            { name: 'Demo Rule 2 (Excel)', code: 'INSU0003' },
            { name: 'Demo Rule 3 (XML/TXT)', code: 'INSU0004' }];
            $scope.currentStep = 1;
            $scope.singleDocCount = 0;
            $scope.isCompareInProgress = false;
            $scope.isTestCompleted = false;
            $scope.testResult = undefined;

            $scope.testFname = undefined;
            $scope.baselineFname = undefined;
            $scope.dynamicDataFname = undefined;
            $scope.ruleName = undefined;

            $scope.reportLink = undefined;
            var _serverUrl = 'http://localhost:8080';

            vm.reset = function () {
                $scope.currentStep = 1;

                $scope.singleDocCount = 0;
                $scope.isCompareInProgress = false;
                $scope.isTestCompleted = false;
                $scope.testResult = undefined;

                $scope.testFname = undefined;
                $scope.baselineFname = undefined;
                $scope.dynamicDataFname = undefined;
                $scope.ruleName = undefined;

                $scope.reportLink = undefined;
            }


            //Test PDF upload
            vm.uploadTestFile = function () {
                if (vm.upload_form.testfile.$valid && vm.testfile) {
                    $scope.testFname = vm.testfile.name;
                    console.log("vm.testfile.name is "+vm.testfile.name);
                    if ($scope.testFname.split(".")[1].toString().toUpperCase() == "PDF") {
                        vm.sendTestFile(vm.testfile);
                    } else {
                        //toaster.pop('error', 'Invalid File Type', 'Only PFD Documents allowed.');
                    }
                }
            }

            vm.sendTestFile = function (file) {
                console.log("vm.testfile passed to function is "+file);
                console.log("_serverUrl + '/uploadtestfile' is "+_serverUrl + '/uploadtestfile');
                $scope.getlock(function (lock) {
                    if (lock.toString() == 'unlocked') {
                        Upload.upload({
                            url: _serverUrl + '/uploadtestfile',
                            data: { file: file 
                            }
                        }).then(function (resp) {
                            console.log("resp.data.error_code value is "+resp.data.error_code)
                            if (resp.data.error_code === 0) {
                                $scope.getNextStep();
                                toaster.pop('success', 'PDF upload', 'document was uploaded!');
                            } else {
                                toaster.pop('error', 'PDF upload', 'error occured while uploading document!');
                            }
                        }, function (resp) {
                            toaster.pop('error', 'PDF upload error', resp.status);
                        });
                    } else {
                        toaster.pop('warning', 'PDF upload', 'tool currently in use, please try after sometime.!');
                    }
                });

            };

            //Baseline doc upload
            vm.uploadBaselineFile = function () {
                console.log("vm.upload_form.baselinefile.$valid is "+vm.upload_form.baselinefile.$valid);
                console.log("vm.baselinefile is "+vm.baselinefile);
                if (vm.upload_form.baselinefile.$valid && vm.baselinefile) {
                    $scope.baselineFname = vm.baselinefile.name;
                    console.log("$scope.baselineFname is "+$scope.baselineFname);
                    console.log("vm.baselinefile.name is "+vm.baselinefile.name);
                    if ($scope.baselineFname.split(".")[1].toString().toUpperCase() == "DOC"
                        || $scope.baselineFname.split(".")[1].toString().toUpperCase() == "DOCX"
                        || $scope.baselineFname.split(".")[1].toString().toUpperCase() == "XLS"
                        || $scope.baselineFname.split(".")[1].toString().toUpperCase() == "XLSX"
                        || $scope.baselineFname.split(".")[1].toString().toUpperCase() == "XML"
                        || $scope.baselineFname.split(".")[1].toString().toUpperCase() == "TXT"
                        || $scope.baselineFname.split(".")[1].toString().toUpperCase() == "PDF") {
                        vm.sendBaselineFile(vm.baselinefile);
                    } else {
                        toaster.pop('error', 'Invalid File Type', 'Allowed File types are Word (doc, docx), Excel(xls, xlsx), XML, TXT & PDF');
                    }
                } else {
                    //toaster.pop('error', 'Invalid File Type', 'Allowed File types are Word (doc, docx), Excel(xls, xlsx) & PDF');
                }
            }

            vm.sendBaselineFile = function (file) {
                console.log("vm.testfile passed to base function is "+file);
                console.log("_serverUrl + '/uploadbaselinefile' is "+_serverUrl + '/uploadbaselinefile');
                $scope.getlock(function (lock) {
                    if (lock.toString() == 'unlocked') {
                        Upload.upload({
                            url: _serverUrl + '/uploadbaselinefile',
                            data: { file: file }
                        }).then(function (resp) {
                            console.log("Baseline resp.data.error_code is "+resp.data.error_code);
                            if (resp.data.error_code === 0) {
                                $scope.getNextStep();
                                toaster.pop('success', 'Baseline File upload', 'document was uploaded!');
                            } else {
                                toaster.pop('error', 'Baseline File upload', 'error occured while uploading document!');
                            }
                        }, function (resp) {
                            toaster.pop('error', 'Baseline File upload error', resp.status);
                        });
                    } else {
                        toaster.pop('warning', 'Baseline File upload', 'tool currently in use, please try after sometime.!');
                    }
                });

            };

            //DD doc upload
            vm.uploadDynamicData = function () {
                if (vm.upload_form.dynamicdata.$valid && vm.dynamicdata) {
                    $scope.dynamicDataFname = vm.dynamicdata.name;


                    if ($scope.dynamicDataFname.split(".")[1].toString().toUpperCase() == "XML"
                        || $scope.dynamicDataFname.split(".")[1].toString().toUpperCase() == "TXT"
                        || $scope.dynamicDataFname.split(".")[1].toString().toUpperCase() == "XLS"
                        || $scope.dynamicDataFname.split(".")[1].toString().toUpperCase() == "XLSX"
                        || $scope.dynamicDataFname.split(".")[1].toString().toUpperCase() == "JSON") {

                        vm.sendDynamicData(vm.dynamicdata);
                    } else {
                        toaster.pop('error', 'Invalid File Type', 'Allowed File types are Excel(xls, xlsx), xml & txt');
                    }

                } else {
                    //toaster.pop('error', 'Invalid File Type', 'Allowed File types are Excel(xls, xlsx), xml & txt');
                }
            }

            vm.sendDynamicData = function (file) {
                $scope.getlock(function (lock) {
                    if (lock.toString() == 'unlocked') {
                        Upload.upload({
                            url: _serverUrl + '/uploaddynamicdatafile',
                            data: { file: file }
                        }).then(function (resp) {
                            if (resp.data.error_code === 0) {
                                $scope.getNextStep();
                                toaster.pop('success', 'Dynamic Data File upload', 'document was uploaded!');
                            } else {
                                toaster.pop('error', 'Dynamic Data File upload', 'error occured while uploading document!');
                            }
                        }, function (resp) {
                            toaster.pop('error', 'Dynamic Data File upload error', resp.status);
                        });
                    } else {
                        toaster.pop('warning', 'Dynamic Data File upload', 'tool currently in use, please try after sometime.!');
                    }
                });

            };

            $scope.getNextStep = function () {
                switch ($scope.currentStep) {
                    case 1:
                        $scope.currentStep = 2;
                        break;
                    case 2:
                        $scope.currentStep = 3;
                        break;
                    case 3:
                        $scope.currentStep = 4;
                        break;
                    case 4:
                        if (vm.selectedRule === undefined || vm.selectedRule == 'None') {
                            toaster.pop('error', 'Invalid Rule Name', 'Please Select a Rule name from dropdown!');
                            break;
                        }
                        $scope.ruleName = vm.selectedRule;
                        $scope.currentStep = 5;
                        break;
                    case 5:
                        $scope.currentStep = 6;
                        break;
                }

                console.log($scope.currentStep);
            }

            vm.startCompare = function () {
                $scope.getlock(function (lock) {
                    if (lock.toString() == 'unlocked') {
                        toaster.pop('info', 'PDF Compare', 'Validation Started for ' + $scope.testFname);
                        $scope.isCompareInProgress = true;
                        $http.post(_serverUrl + '/singlecompare', {
                            data: {
                                testFname: $scope.testFname,
                                baselineFname: $scope.baselineFname,
                                dynamicDataFname: $scope.dynamicDataFname,
                                ruleName: $scope.ruleName
                            }
                        }).then(function (res) {
                            $scope.testResult = res.data.result;
                            $scope.reportLink = res.data.reportlink.replace('./Results', '');
                            toaster.pop('success', 'PDF Compare', 'Validation completed for ' + $scope.testFname);
                            $scope.isCompareInProgress = false;
                            $scope.isTestCompleted = true;
                            $scope.getNextStep();
                        });
                    } else {
                        toaster.pop('warning', 'PDF Compare', 'tool currently in use, please try after sometime.!');
                    }
                });
            }

            $scope.getlock = function (lock) {
                $http.get(_serverUrl + '/getlock', {
                    params: {}
                }).then(function (res) {
                    lock(res.data.lock);
                });
            }
        }]);