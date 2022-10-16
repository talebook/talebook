// inflate is required by zip but won't work if inflate is loaded before zip. Just explicitly adding it here since there is
// no way to include it in the dependency chain that makes sense.
define(['zip', 'module', 'workers/Messages', 'inflate'], function(zip, module, Messages){
	var config = module.config();

	zip.useWebWorkers = false;

	EpubUnzipper = function(options){
		this.options = options;
		this.inflated = {};
			//this.client = new RemoteStorage.BaseClient(remoteStorage, '/readium/');
	}

	EpubUnzipper.prototype = {
		_markProgress : function(entry, blob){
			this.byteCount += entry.uncompressedSize;
			this._storeFile(entry, blob);

			this.options.progress(Math.round(this.byteCount/this.numBytes * 75), Messages.PROGRESS_EXTRACTING, this.byteCount + '/' + this.numBytes);
			//console.log(this.byteCount/this.numBytes);
			if (this.byteCount == this.numBytes){
				this.options.success(this.inflated);
			}	
		},
		extractAll : function(){
			var buf = this.options.buf,
				self = this;
			
			zip.createReader(new zip.BlobReader(buf), function(reader){
				reader.getEntries(function(entries){
					self.entries = entries;
					var toExtract = [];
					self.numBytes =0;
					for (var i = 0; i < entries.length; i++){
						if (!entries[i].directory){
							toExtract.push(entries[i]);
							self.numBytes += entries[i].uncompressedSize;
						}
					}
					self.numFiles = toExtract.length;
					self.byteCount = 0;
					toExtract.forEach(function(entry){
						entry.getData(new zip.BlobWriter(), self._markProgress.bind(self, entry));
					});
				});
			}, this.options.error);	
		},
		
		_storeFile : function(entry, blob){
			// var fileReader = new FileReader()
			// 	self = this;
			// fileReader.onload = function() {
			//     self.client.storeFile(self._getMimeType(entry.filename), rootName + '/' + entry.filename, this.result);
			// };
			// fileReader.readAsArrayBuffer(blob);
			this.inflated[entry.filename] = blob;
		},
		
	}
	return EpubUnzipper;
})