define(function(){
    
    // localStorage may be disabled due to zero-quota issues (e.g. iPad in private browsing mode)
    var _isLocalStorageEnabled = undefined;
    var isLocalStorageEnabled = function() {
        if (_isLocalStorageEnabled) return true;
        if (typeof _isLocalStorageEnabled === "undefined") {
            _isLocalStorageEnabled = false;
            if (localStorage) {
                try {
                    localStorage.setItem("_isLocalStorageEnabled", "?");
                    localStorage.removeItem("_isLocalStorageEnabled");
                    _isLocalStorageEnabled = true;
                } catch(e) {
                }
            }
            return _isLocalStorageEnabled;
        } else {
            return false;
        }
    };
    
	Settings = {
		put : function(key, val, callback){
            if (!isLocalStorageEnabled()) {
                if (callback) callback();
                return;
            }
            
            var val = JSON.stringify(val);
			localStorage[key] = val;
            
			if (callback){
				callback();
			}
		},
		get : function(key, callback){
            if (!isLocalStorageEnabled()) {
                if (callback) callback(null);
                return;
            }
            
			var val = localStorage[key];
			if (val){
				callback(JSON.parse(val));
			}
			else{
				callback(null);
			}
			
		},
		getMultiple : function(keys, callback){
            if (!isLocalStorageEnabled()) {
                if (callback) callback({});
                return;
            }
            
			var retVal = {};
			for (var i = 0; i < keys.length; i++){
				if (localStorage[keys[i]]){
					retVal[keys[i]] = localStorage[keys[i]];
				}
			}
			callback(retVal);
		}
	}
	return Settings;
})