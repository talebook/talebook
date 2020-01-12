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

define(['module', 'encryptionHandler'], function(module, EncryptionHandler){
	
	var isXhtmlFile = function(name){
		return name.lastIndexOf('.xhtml') == name.length - ('.xhtml'.length) || name.lastIndexOf('.html') == name.length - ('.html'.length);
	}

	var ContentTransformer = function(encryptionData){
		this.encryptionHandler = new EncryptionHandler(encryptionData);
	}

	ContentTransformer.prototype = {
		transformContent : function(name, data, callback){
			
            var decryptionFunction = this.encryptionHandler.getDecryptionFunctionForRelativePath(name);
			if (decryptionFunction){
				decryptionFunction(data, callback);
			}
			else if (isXhtmlFile(name)){
				var fileReader = new FileReader(),
					self = this;

				fileReader.onload = function(){
					var newContent = self._transformXhtml(this.result);
					callback(new Blob([newContent]));
				}
				fileReader.readAsText(data);
			}   
			else{
				callback(data);
			}            
		},

		_transformXhtml : function(contentDocumentHtml){

			var mathJaxUrl = module.config().mathJaxUrl,
				ersUrl = module.config().epubReadingSystemUrl;	

			if (ersUrl){
            	var scripts = "<script type=\"text/javascript\" src=\"" + ersUrl + "\"><\/script>";
            }

            if (mathJaxUrl && contentDocumentHtml.indexOf("<math") >= 0) {
                scripts += "<script type=\"text/javascript\" src=\"" + mathJaxUrl + "\"><\/script>";
            }

            var mangledContent = contentDocumentHtml.replace(/(<head.*?>)/, "$1" + scripts);
            return mangledContent;
		}
	}

	return ContentTransformer;
});