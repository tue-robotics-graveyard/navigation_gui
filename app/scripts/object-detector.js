'use strict';

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

  // receive list of locations
  var inTopic = new ROSLIB.Topic({
    ros : ros,
    name : '/locations_list',
    messageType : 'std_msgs/String'
  });

  inTopic.subscribe(function (msg) {
    console.log(msg);
  });

  // this is the topic we will publish clicks to
  var outTopic = new ROSLIB.Topic({
    ros : ros,
    name : '/nav_goal',
    messageType : 'std_msgs/String'
  });

  // publish the innerHTML of a button on that topic
  obj_list.on('click', 'button', function (e) {
    var name = $(e.currentTarget).html().trim();
    console.log('click', name);
    outTopic.publish({data:name});
  });

  obj_list.html(template({
     status: 'loading'
  }));

  // generate the data for the template
  function generateButtonData(locations) {
    return locations.map(function (o) {
      var c = random_color();
      return {
        color: c, name: o
      };
    });
  }

  var locations = ['asdf', 'omg']
  var data = generateButtonData(locations);
  obj_list.html(template(data));
});
