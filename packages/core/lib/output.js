"use strict";

var map = require("lodash.mapvalues"),

    relative = require("./relative.js");

exports.join = function(output) {
    return map(output, (classes) => classes.join(" "));
};

exports.compositions = function(cwd, processor) {
    var json = {};
    
    Object.keys(processor.files)
        .sort()
        .forEach((file) =>
            (json[relative(cwd, file)] = exports.join(processor.files[file].exports))
        );
    
    return json;
};
