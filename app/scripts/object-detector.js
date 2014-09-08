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

var reasoner; // global

$( document ).ready(function() {

    var source = $('#objects-template').html();
    var template = Handlebars.compile(source);

    var obj_list = $('#objects-list');

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

    obj_list.html(template({
       status: 'loading'
    }));

    reasoner = (function() {

        // use the reasoner to get all the locations
        var reasonerService = new ROSLIB.Service({
            ros : ros,
            name : '/reasoner/query_srv',
            serviceType : 'psi/Query'
        });

        // public API
        return {
            query: function (term_string, callback) {
                var request = new ROSLIB.ServiceRequest({
                    term: {
                        term_string: term_string,
                    },
                });

                reasonerService.callService(request, function(result) {
                    callback(result);
                });
            }
        }

    })();


    // generate the data for the template
    function generateButtonData(locations) {
        return locations.map(function (o) {
            var c = random_color();
            return {
                color: c, name: o
            };
        });
    }



    reasoner.query('load_database(~/catkin_ws/src/trunk/tue_knowledge/prolog/locations.pl)', function () {
        reasoner.query('waypoint(A,B)', function (result) {
            //console.log(JSON.stringify(result, null, '\t'));
            console.log(result);

            result = result.binding_sets.map(function (binding_set) {
                var bindings = _.findWhere(binding_set.bindings, {variable: 'A'});
                var str = bindings.value.root.constant.str;
                return str;
            });

            var result = _.filter(result, function (str) {
                return str != '';
            });

            var data = generateButtonData(result);
            // generate the buttons
            obj_list.html(template(data));
        });
    });
});
