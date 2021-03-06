#!/usr/bin/env node
/*
Automatically grade files for the presence of specified HTML tags/attributes.
Uses commander.js and cheerio. Teaches command line application development
and basic DOM parsing.

References:

 + cheerio
   - https://github.com/MatthewMueller/cheerio
   - http://encosia.com/cheerio-faster-windows-friendly-alternative-jsdom/
   - http://maxogden.com/scraping-with-node.html

 + commander.js
   - https://github.com/visionmedia/commander.js
   - http://tjholowaychuk.com/post/9103188408/commander-js-nodejs-command-line-interfaces-made-easy

 + JSON
   - http://en.wikipedia.org/wiki/JSON
   - https://developer.mozilla.org/en-US/docs/JSON
   - https://developer.mozilla.org/en-US/docs/JSON#JSON_in_Firefox_2
*/

var fs = require('fs');
var util = require('util');
var rest = require('restler');
var program = require('commander');
var cheerio = require('cheerio');
var HTMLFILE_DEFAULT = "index.html";
var CHECKSFILE_DEFAULT = "checks.json";

var assertFileExists = function(infile) {
    var instr = infile.toString();
    if(!fs.existsSync(instr)) {
        console.log("%s does not exist. Exiting.", instr);
        process.exit(1); // http://nodejs.org/api/process.html#process_process_exit_code
    }
    return instr;
};

var cheerioHtmlFile = function(htmlfile) {
    return cheerio.load(fs.readFileSync(htmlfile));
};

var loadChecks = function(checksfile) {
    return JSON.parse(fs.readFileSync(checksfile));
};

/* Uses the criteria specified in checksFile to check the HTML data in inputString,
   which may come from reading in a file or loading a URL.
 */
var checkString = function(inputString, checksfile) {
    $ = cheerio.load(inputString);
    var checks = loadChecks(checksfile).sort();
    var out = {};
    for(var ii in checks) {
        var present = $(checks[ii]).length > 0;
        out[checks[ii]] = present;
    }
    return out;
};

var clone = function(fn) {
    // Workaround for commander.js issue.
    // http://stackoverflow.com/a/6772648
    return fn.bind({});
};

var doStuff = function(data, checksFile) {
    var checkJson = checkString(data, checksFile);
    var outJson = JSON.stringify(checkJson, null, 4);
    console.log(outJson);
};

if(require.main == module) {
    /*  Providing a default value for an option seems to mean that the
        respective option is specified every time, and has a valid value.
        This is a problem if I have two possible inputs (a file and a URL)
        because then even if neither is specified, both are deemed to have
        default values, and so the program will attempt to check both the
        default file and the default URL. If only a URL is specified on the
        command line (and no file is set), the program will attempt to check
        the default file anyway. If only a file is specified (and no URL is
        set), the program will attempt to access and check the default URL
        anyway.
        Solution: get rid of default values for both options.
     */
    program
        .option('-f, --file <html_file>', 'Path to index.html')
        .option('-c, --checks <check_file>', 'Path to checks.json', clone(assertFileExists), CHECKSFILE_DEFAULT)
        .option('-u, --url <check_url>', 'The URL to be checked')
        .parse(process.argv);
    if(program.file && program.url) {
        console.error("Specify either a file or a URL to be checked, but NOT both.");
        process.exit(2);
    } else if(program.file) {
        // util.puts(program.file);
        fs.readFile(program.file, function(error, data) {
            if(error) {
                throw error;
            }
            doStuff(data, program.checks);
        });
    } else if(program.url) {
        // util.puts(program.url);
        rest.get(program.url).on('complete', function(data) {
            if (data instanceof Error) {
                sys.puts('Error: ' + data.message);
                this.retry(5000); // try again after 5 sec
            } else {
                doStuff(data, program.checks);
            }
        });
    } else {
        console.error("Neither a file, not a URL were specified - nothing to do.");
    }
} else {
    exports.checkString = checkString;
}
