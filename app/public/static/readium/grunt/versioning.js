//  Copyright (c) 2014 Readium Foundation and/or its licensees. All rights reserved.
//  
//  Redistribution and use in source and binary forms, with or without modification, 
//  are permitted provided that the following conditions are met:
//  1. Redistributions of source code must retain the above copyright notice, this 
//  list of conditions and the following disclaimer.
//  2. Redistributions in binary form must reproduce the above copyright notice, 
//  this list of conditions and the following disclaimer in the documentation and/or 
//  other materials provided with the distribution.
//  3. Neither the name of the organization nor the names of its contributors may be 
//  used to endorse or promote products derived from this software without specific 
//  prior written permission.

'use strict';

module.exports = function(grunt) {

    grunt.registerTask("versioning", function() {
        var git = require('gift'),
            fs = require('fs');

        var done = this.async();
        
        var myRepo = git('.');

        var buildVersion = function(branchName, sha){

            var pkgJson = fs.readFileSync('package.json', 'utf-8');
            var pkg = JSON.parse(pkgJson);

            //var version = pkg.version + '.' + sha;
            myRepo.status(function(err, status){
                var obj = {
                    version: pkg.version,
                    chromeVersion: '2.' + pkg.version.substring(2),
                    sha: sha,
                    clean: status.clean,
                    release: branchName.indexOf('release/') == 0,
                    timestamp: Date.now() 
                }
                fs.writeFileSync('build/version.json', JSON.stringify(obj));
                done();
            });
        }

        // work around a bug in gift that blows it up on a detached head
        var ref = fs.readFileSync('.git/HEAD', 'utf-8');
        if (ref.indexOf('ref: ') == 0){
            myRepo.branch(function(err, head){
                //console.log(head.name);
                var sha = head.commit.id;
                var branchName = head.name;

                buildVersion(branchName, sha);
            });
        }
        else{
            buildVersion('', ref.substring(0, ref.length - 1));
        }
        
    });

    grunt.registerTask('updateChromeManifest', function(){
        var fs = require('fs'),
            path = require('path');
        
        var done = this.async();

        var manifest = require(path.join(process.cwd(), 'chrome-app/manifest.json')),
            version = require(path.join(process.cwd(), 'build/version.json'));

        manifest.version = version.chromeVersion;

        var finish = function(){
            fs.writeFileSync('build/chrome-app/manifest.json', JSON.stringify(manifest));
            done()
        }

        if (!version.release){
            manifest.name = 'Readium (Development Build)';

            var mediumStream = fs.createReadStream('chrome-app/icons/devBuild/medium.png');
            mediumStream.pipe(fs.createWriteStream('build/chrome-app/icons/medium.png'));
            mediumStream.on('end', function(){
                var largeStream = fs.createReadStream('chrome-app/icons/devBuild/large.png');
                largeStream.pipe(fs.createWriteStream('build/chrome-app/icons/large.png'));
                largeStream.on('end', finish);
            });
        }
        else{
            finish();
        }
        
    });

    return {};
};