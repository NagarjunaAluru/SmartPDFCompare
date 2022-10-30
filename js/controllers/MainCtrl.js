angular.module('MainCtrl', []).controller('MainController',
    function ($scope, $rootScope, $http, socket, toaster) {
        $scope.appConfig = {
            clientName: "Demo Project"
        };
        $scope.appBusy = false;
        $scope.docCount = 0;
        $scope.docCompleted = 0;
        $scope.isbatchInProgress = false;
        $scope.isBatchCompleted = false;
        $scope.showReport = false;
        $scope.reportList = [];
        var _serverUrl = 'http://localhost:8080';


        $scope.resetBatch = function () {
            $scope.docCount = 0;
            $scope.docCompleted = 0;
            $http.get(_serverUrl + '/batchsize', {
                params: {}
            }).then(function (res) {
                $scope.docCount = res.data.count;
                $scope.isbatchInProgress = false;
                $scope.isBatchCompleted = false;
                $scope.batchReportLink = undefined;
                if (!$scope.$$phase) {
                    $scope.$apply();
                }
            });
        }

        $scope.updateDocumentsCount = function () {
            $scope.docCount = 0;
            $http.get(_serverUrl + '/batchsize', {
                params: {}
            }).then(function (res) {
                $scope.docCount = res.data.count;
                if (!$scope.$$phase) {
                    $scope.$apply();
                }
            });
        }

        $scope.updateReport = function () {
            $scope.reportList = [];
            $http.get(_serverUrl + '/resultlist', {
                params: {}
            }).then(function (res) {
                $scope.reportList = res.data;
                if (!$scope.$$phase) {
                    $scope.$apply();
                }
            });
        }

        $scope.startBatch = function (filename) {
            $scope.getlock4batch(function (lock) {
                if (lock.toString() == 'unlocked') {
                    toaster.pop('info', 'PDF Compare', 'PDF comparison started in batch mode!');
                    $scope.isbatchInProgress = true;
                    $http.post(_serverUrl + '/batchcompare', {
                        data: { mode: 'batch' }
                    }).then(function (res) {
                        // $scope.testResult = res.data.result;
                        // $scope.baselineFname = res.data.formDetails.bfname;
                        // $scope.formType = res.data.formDetails.type;
                        $scope.batchReportLink = res.data.reportlink.replace('./Results', '');
                        toaster.pop('success', 'PDF Compare', 'Validation completed!');
                        $scope.isbatchInProgress = false;
                        $scope.isBatchCompleted = true;
                    });
                } else {
                    toaster.pop('warning', 'PDF Compare', 'tool currently in use, please try after sometime.!');
                }
            });
        }

        /*Report*/
        $scope.openReport = function () {
            $scope.showReport = true;
            $scope.reportList = [];
            $http.get(_serverUrl + '/resultlist?' + new Date().getTime(), {
                params: {}
            }).then(function (res) {

                $scope.reportList = res.data.rlist;
                // if (!$scope.$$phase) {
                //     $scope.$apply();
                // }
            });
        }
        $scope.closeReport = function () {
            $scope.showReport = false;

        }

        $scope.toogleList = function (index) {
            if ($scope.reportList[index].show == 0) {
                $scope.reportList[index].show = 1;
            } else {
                $scope.reportList[index].show = 0;
            }

        }

        $scope.getlock4batch = function (lock) {
            $http.get(_serverUrl + '/getlock', {
                params: {}
            }).then(function (res) {
                lock(res.data.lock);
            });
        }

        /* Socket Events */
        socket.on('connect', function (data) {
            toaster.pop('info', 'PDFCompare Server', 'Your are connected!');
        });
        socket.on('connect_error', function (data) {
            toaster.pop('error', 'PDFCompare Server', 'Your connection to server is lost!');
        });
        socket.on('system:msg', function (data) {
            toaster.pop(data.context.type, data.context.title, data.msg);
        });
        socket.on('system:inputfoldersize', function (data) {
            $scope.docCount = data.count;
            if (!$scope.$$phase) {
                $scope.$apply();
            }
        });
        socket.on('system:resultfolderlist', function (data) {
            $scope.reportList = data.rlist;
            if (!$scope.$$phase) {
                $scope.$apply();
            }
        });
        socket.on('system:batchprogress', function (data) {
            $scope.docCompleted = data.progress;
            if (!$scope.$$phase) {
                $scope.$apply();
            }
        });
        socket.on('system:serverbusy', function (data) {
            if (data.appbusy == 'busy') {
                $scope.appBusy = true;
            } else {
                $scope.appBusy = false;
            }
            if (!$scope.$$phase) {
                $scope.$apply();
            }
        });
    });