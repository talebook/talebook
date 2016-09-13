'use strict';

module.exports = function(grunt) {

    return {
        chromeApp:{
        	MODE: 'chromeApp'
        },
      	ff:{
      		MODE: 'firefox'
      	},
      	ie: {
      		MODE: 'internet explorer'
      	},
      	chrome:{
      		MODE: 'chrome'
      	},
      	sauce:{
      		USE_SAUCE: 'true'
      	}
    };
};