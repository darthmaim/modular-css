"use strict";

var from       = require("from2-string"),
    shell      = require("shelljs"),
    browserify = require("browserify"),
    watchify   = require("watchify"),
    
    read = require("test-utils/read.js")(__dirname),

    bundle = require("./lib/bundle.js"),
    plugin = require("../browserify.js");

describe("/browserify.js", () => {
    describe("/issues", () => {
        describe("/58", () => {
            afterAll(() => {
                shell.rm("-rf", "./packages/browserify/test/output/issues");
                shell.rm("./packages/browserify/test/specimens/issues/58/other.css");
            });
            
            it("should update when CSS dependencies change", (done) => {
                var build = browserify();
                
                shell.cp("-f",
                    "./packages/browserify/test/specimens/issues/58/1.css",
                    "./packages/browserify/test/specimens/issues/58/other.css"
                );
                
                build.add(from("require('./packages/browserify/test/specimens/issues/58/issue.css');"));

                build.plugin(watchify);
                build.plugin(plugin, {
                    css : "./packages/browserify/test/output/issues/58.css"
                });

                build.on("update", () => {
                    bundle(build)
                        .then((out) => {
                            expect(out).toMatchSnapshot();
                        
                            expect(read("./issues/58.css")).toMatchSnapshot();
                        
                            build.close();
                        
                            done();
                        });
                });

                bundle(build)
                    .then((out) => {
                        expect(out).toMatchSnapshot();
                        
                        shell.cp("-f",
                            "./packages/browserify/test/specimens/issues/58/2.css",
                            "./packages/browserify/test/specimens/issues/58/other.css"
                        );
                    });
            }, 10000);
        });
    });
});
