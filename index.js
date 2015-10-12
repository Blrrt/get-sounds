#!/usr/bin/env node

'use strict';

var _ = require('lodash');
var async = require('async');
var cheerio = require('cheerio');
var fs = require('fs');
var mkdirp = require('mkdirp');
var path = require('path');
var request = require('superagent');
var yargs = require('yargs');

var args = yargs
  .demand('name')
  .describe('name', 'Specify the name of a person or thing to get')
  .example('node soundboard --name="Arnold Schwarzenegger"');

var name = _.kebabCase(args.argv.name).trim();
var url = 'https://celebdial.com/c/' + name;

console.log('Checking "' + url + '"');

request
  .get(url)
  .end(function (err, res) {
    if (!res && err) return console.error(err);
    if (res.status === 404) return console.error('Nothing found');
    if (!res.ok) console.error('Something went wrong');

    var $ = cheerio.load(res.text);
    var outputDir = path.join(__dirname, 'sounds', name);

    var sounds = $('.snd').map(function () {
      return {
        id: $(this).attr('id'),
        name: $(this).text()
      };
    });

    if (!sounds.length) {
      return console.log('No sounds found');
    }

    mkdirp(outputDir, function (err) {
      if (err) return console.error('Error creating directory "' + outputDir + '"');

      async.each(sounds,
        function (sound, done) {
          var inputUrl = 'https://soundboardz.storage.googleapis.com/' + sound.id + '.mp3';
          var outputPath = path.join(outputDir, sound.name + '.mp3');
          var outputStream = fs.createWriteStream(outputPath);
          console.log('Downloading "' + inputUrl + '"');

          request
            .get(inputUrl)
            .pipe(outputStream)
            .on('finish', done)
            .on('error', function () {
              done('Error downloading "' + inputUrl + '"');
            });
        },
        function (err) {
          if (err) return console.error(err);
          console.log('Downloaded ' + sounds.length + ' sounds');
        }
      );
    });
  });
