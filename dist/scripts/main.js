/**
* Maintains the connection to the Rosbridge server
*
* this package:
* - connect to ros
* - poll for lost connections
* - show dialog on connection problems
**/

/*global $:false */

// configuration
var rosUrl = 'ws://' + window.location.hostname + ':9090';
var pingInterval = 5000;  // ms. The time between pings
var pingTimeout = 2000;     // ms. If ros doesn't respond within this period of time, close the connection

// global variables
var ros;

// code wrapper
(function () {
"use strict";

// initialize the connection to rosbridge
function init() {
  initConnectionManager();
  initPingService();

  console.log('ros-connect-amigo initialized');
}

var buttonReconnect;
var modalReconnect;
function initConnectionManager() {
  // get the html elements
  buttonReconnect = $('#reconnect');
  modalReconnect  = $('#modalConnectionLost');

  buttonReconnect.click(function(e) {
    ros.connect(rosUrl);
  });

  // Connecting to ROS.
  ros = new ROSLIB.Ros({
    url : rosUrl
  });

  ros.addListener('connection', function(e) {
    console.log('rosbridge connection made');
    buttonReconnect.button('loading');
  });

  ros.addListener('close', function(e) {
    console.log('rosbridge connection closed');
    buttonReconnect.button('reset');
    modalReconnect.modal('show');
  });

  ros.addListener('error', function(e) {
    console.log('rosbridge connection error');
  });

  ros.addListener('ping.ok', function(e) {
    console.log('rosbridge ping with %i ms', e);
    modalReconnect.modal('hide');
  });

  ros.addListener('ping.timeout', function(e) {
    console.log('rosbridge ping timeout of %i ms', e);
    ros.close();
  });
}

var pingClient;

function initPingService() {
  // initialize the ping service to node_alive
  pingClient = new ROSLIB.Service({
    ros : ros,
    name : '/get_alive_nodes',
    serviceType : 'node_alive/ListNodesAlive'
  });

  var pingId;
  ros.addListener('connection', function() {
    setTimeout(pingNodesAlive, pingTimeout);
    pingId = setInterval(pingNodesAlive, pingInterval);
  });
  ros.addListener('close', function() {
    clearInterval(pingId);
  });
}

function pingNodesAlive() {

  var request = new ROSLIB.ServiceRequest({});
  var start = new Date();

  setTimeout(function() {
    if (start != -1) { // check if already received a response
      ros.emit('ping.timeout', pingTimeout);
    }
  }, pingTimeout);

  pingClient.callService(request, function(result) {
    //console.log('Result for service call: ', result);
    var diff = new Date() - start;
    start = -1;

    ros.emit('ping.ok', diff);
  });
}

// when the dom is ready, start the code
$(document).ready(init);

// end wrapper
}());

var color_map = {};

var known_objects = [
    "kitchen",
    "door",
    "cabinet",
    "wall",
];

var random_color = (function() {
    // this is code for generating random colors
    var golden_ratio_conjugate = 0.618033988749895;
    var h = 0.3; // use random start value

    function random_color(){
        h += golden_ratio_conjugate;
        h %= 1;
        return get_color(h, 0.7, 0.8);
    }

    function get_color(h, s, l) {
        h = Math.floor(h*360);
        s = Math.floor(s*100);
        l = Math.floor(l*100);
        return 'hsl(' + h + ',' + s + '%,' + l + '%)';
    }

    return random_color;
})();

$( document ).ready(function() {

    var source = $('#objects-template').html();
    var template = Handlebars.compile(source);

    var obj_list = $('#objects-list');

    // generate the data for the template
    var data = known_objects.map(function (o) {
        var c;
        if (color_map[o]) {
            c = color_map[o];
        } else {
            c = color_map[o] = random_color();
        }
        return {
            color: c, name: o
        };
    });

    // generate the buttons
    obj_list.html(template(data));

    // this is the topic we will publish clicks to
    var trigger = new ROSLIB.Topic({
        ros : ros,
        name : '/trigger',
        messageType : 'std_msgs/String'
    });

    // publish the innerHTML of a button on that topic
    obj_list.on('click', 'button', function (e) {
        var name = $(e.currentTarget).html().trim();
        console.log('click', name);
        trigger.publish({data:name});
    });

});
