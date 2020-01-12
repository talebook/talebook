define(['remotestorage', 'jquery'], function(rs, $){

	var client;

	var getMimeType = function(name){
		var idx = name.lastIndexOf('.');
		if (idx != -1){
			var ext = name.substring(idx + 1);
			if (ext == "html" || ext=="xhtml"){
				return "text/html";
			}
			else if (ext == "xml"){
				return "text/xml";
			}
			else if (ext == "opf"){
				return "text/xml";
			}
			else if (ext == "ncx"){
				return "text/xml";
			}
			else if (ext == "jpg" || ext == "jpeg"){
				return "image/jpeg";
			}
			else if (ext == "png"){
				return "image/png";
			}
			else if (ext == "gif"){
				return "image/gif";
			}
			else if (ext == "svg"){
				return "image/svg+xml";
			}
			else if (ext == "tif" || ext == "tiff"){
				return "image/tiff";
			}
		}
		return "application/octet-stream"
	};

	var RemoteStorageManager = {
		
		saveFile : function(path, blob, success, error){
			var fileReader = new FileReader();
            fileReader.onload = function() {
                client.storeFile(getMimeType(path), path, this.result).then(success);
            };
            fileReader.readAsArrayBuffer(blob);
		},
		
		deleteFile : function(path, success, error){
			if (path.charAt(path.length - 1) == '/'){
				client.getListing(path).then(function(listing){
					var count = listing.length;
					listing.forEach(function(item){
						RemoteStorageManager.deleteFile(path + item, function(){
							if (!--count) success();
						});
					});
				});
			}
			else{
				client.remove(path).then(success);
			}
			
		},

		getPathUrl : function(path){
			return client.getItemURL(path);
		}
	}

	$(window).bind('libraryUIReady', function(){
		// $('#add-epub-dialog .modal-body form').prepend('<div class="form-group"><div id="readium-rs-widget" style="position:relative; height:42px;" class="col-sm-9"></div></div>');
		// $('#epub-upload-div').hide();
		$('.icon-settings').before('<div id="rs-container" class="btn"></div>')
		remoteStorage.access.claim('readium', 'rw');
		remoteStorage.widget.display('rs-container');
		remoteStorage.on('ready', function(){
			// $.ajaxPrefilter(function(options, originalOptions, jqXhr){
			// 	var wireClient = remoteStorage.remote;
			// 	if (wireClient.href && wireClient.token){
			// 		if (options.url.indexOf(wireClient.href) == 0){
			// 			var headers = options.headers || {};
			// 			headers['Authorization'] = 'Bearer ' + wireClient.token;
			// 			options.headers = headers;
			// 		}
			// 	}
			// });
			$(window).trigger('storageReady');
		});
		client = remoteStorage.scope('/public/readium/');
	});

	return RemoteStorageManager
});