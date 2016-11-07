define([], function(){
	var StaticStorageManager = {
		
		saveFile : function(path, blob, success, error){
			success()
		},
		
		deleteFile : function(path, success, error){
			success();
			
		},

		getPathUrl : function(path){
			if (path == '/epub_library.json')
			{
				return 'epub_content/epub_library.json';
			}
			return path;
		},
		initStorage: function(success, error){
			success();
		}
	}
	return StaticStorageManager;
});
