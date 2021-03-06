"use strict";

var processor = require("postcss-selector-parser"),

    identifiers = require("../lib/identifiers.js"),

    reuse  = "Unable to re-use the same selector for global & local",
    plugin = "modular-css-scoping";

// Validate whether a selector should be renamed, returns the key to use
function rename(current, thing) {
    if(thing.type === "class" ||
       thing.type === "id" ||
       (current.name && current.name.search(identifiers.keyframes) > -1)) {
        return thing.value;
    }

    return false;
}

module.exports = (css, result) => {
    var classes   = Object.create(null),
        keyframes = Object.create(null),
        globals   = Object.create(null),
        parser, current, lookup;

    parser = processor((selectors) => {
        var pseudos = [];

        selectors.walkPseudos((node) => {
            if(node.value !== ":global") {
                return;
            }

            if(!node.length || !node.first.length) {
                throw current.error(":global(...) must not be empty", { word : ":global" });
            }

            // Can't remove here, see #277 or postcss/postcss-selector-parser#105
            pseudos.push(node);
        });

        pseudos.forEach((node) => {
            // Replace the :global(...) with its contents
            node.replaceWith(processor.selector({
                nodes  : node.nodes,
                source : node.source
            }));

            node.walk((child) => {
                var key = rename(current, child);

                if(!key) {
                    return;
                }

                // Don't allow local/global overlap (but globals can overlap each other nbd)
                if(key in lookup && !globals[key]) {
                    throw current.error(reuse, { word : key });
                }

                globals[key] = true;
                
                if(result.opts.exportGlobals !== false) {
                    lookup[key] = [ child.value ];
                }
                
                child.ignore = true;
            });
        });

        selectors.walk((node) => {
            var key = rename(current, node);

            if(!key || node.ignore) {
                return;
            }

            // Don't allow local/global overlap
            if(key in globals) {
                throw current.error(reuse, { word : key });
            }

            node.value = result.opts.namer(result.opts.from, node.value);

            lookup[key] = [ node.value ];

            return;
        });
    });

    // Walk all rules and save off rewritten selectors
    css.walkRules((rule) => {
        // Save closure ref to this rule
        current = rule;
        lookup = classes;

        rule.selector = parser.process(rule.selector).result;
    });

    // Also scope @keyframes rules so they don't leak globally
    css.walkAtRules(identifiers.keyframes, (rule) => {
        // Save closure ref to this rule
        current = rule;

        lookup = keyframes;

        rule.params = parser.process(rule.params).result;
    });

    if(Object.keys(keyframes).length) {
        result.messages.push({
            type      : "modular-css",
            plugin    : plugin,
            keyframes : keyframes
        });
    }

    if(Object.keys(classes).length) {
        result.messages.push({
            type    : "modular-css",
            plugin  : plugin,
            classes : classes
        });
    }
};

module.exports.postcssPlugin = plugin;
