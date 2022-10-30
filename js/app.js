// public/js/app.js
angular.module('pdfcompare', [
    'ngRoute',
    'appRoutes',
    'MainCtrl',
    'ngMaterial',
    'ngFileUpload',
    'fileUpload',
    'batchmodeCtrl',
    'toaster'
]).factory('socket', ['$rootScope', function ($rootScope) {
    var socket = io.connect('http://localhost:8080');
    return {
      on: function (eventName, callback) {
        socket.on(eventName, callback);
      },
      emit: function (eventName, data) {
        socket.emit(eventName, data);
      }
    };
  }]);
