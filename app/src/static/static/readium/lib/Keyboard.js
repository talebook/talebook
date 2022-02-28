define(['i18n/Strings', 'keymaster', 'storage/Settings'], function(Strings, key, Settings){

    var keyBindings = {};

            //https://github.com/termi/DOM-Keyboard-Event-Level-3-polyfill
            //https://gist.github.com/termi/4654819
            void function() {//closure

            var global = this
              , _initKeyboardEvent_type = (function( e ) {
            		try {
            			e.initKeyboardEvent(
            				"keyup" // in DOMString typeArg
            				, false // in boolean canBubbleArg
            				, false // in boolean cancelableArg
            				, global // in views::AbstractView viewArg
            				, "+" // [test]in DOMString keyIdentifierArg | webkit event.keyIdentifier | IE9 event.key
            				, 3 // [test]in unsigned long keyLocationArg | webkit event.keyIdentifier | IE9 event.location
            				, true // [test]in boolean ctrlKeyArg | webkit event.shiftKey | old webkit event.ctrlKey | IE9 event.modifiersList
            				, false // [test]shift | alt
            				, true // [test]shift | alt
            				, false // meta
            				, false // altGraphKey
            			);
		
		
		
            			/*
            			// Safari and IE9 throw Error here due keyCode, charCode and which is readonly
            			// Uncomment this code block if you need legacy properties
            			delete e.keyCode;
            			_Object_defineProperty(e, {writable: true, configurable: true, value: 9})
            			delete e.charCode;
            			_Object_defineProperty(e, {writable: true, configurable: true, value: 9})
            			delete e.which;
            			_Object_defineProperty(e, {writable: true, configurable: true, value: 9})
            			*/
		
            			return ((e["keyIdentifier"] || e["key"]) == "+" && (e["keyLocation"] || e["location"]) == 3) && (
            				e.ctrlKey ?
            					e.altKey ? // webkit
            						1
            						:
            						3
            					:
            					e.shiftKey ?
            						2 // webkit
            						:
            						4 // IE9
            				) || 9 // FireFox|w3c
            				;
            		}
            		catch ( __e__ ) { _initKeyboardEvent_type = 0 }
            	})( document.createEvent( "KeyboardEvent" ) )

            	, _keyboardEvent_properties_dictionary = {
            		"char": "",
            		"key": "",
            		"location": 0,
            		"ctrlKey": false,
            		"shiftKey": false,
            		"altKey": false,
            		"metaKey": false,
            		"repeat": false,
            		"locale": "",

            		"detail": 0,
            		"bubbles": false,
            		"cancelable": false,
	
            		//legacy properties
            		"keyCode": 0,
            		"charCode": 0,
            		"which": 0
            	}

            	, own = Function.prototype.call.bind(Object.prototype.hasOwnProperty)

            	, _Object_defineProperty = Object.defineProperty || function(obj, prop, val) {
            		if( "value" in val ) {
            			obj[prop] = val["value"];
            		}
            	}
            ;

            function crossBrowser_initKeyboardEvent(type, dict) {
            	var e;
            	if( _initKeyboardEvent_type ) {
            		e = document.createEvent( "KeyboardEvent" );
            	}
            	else {
            		e = document.createEvent( "Event" );
            	}

                // // Chromium Hack
                // try
                // {
                // Object.defineProperty(e, 'keyCode', {
                //             get : function() {
                //                 return this.keyCodeVal;
                //             }
                // });     
                // }catch(){}
                // 
                // try
                // {
                // Object.defineProperty(e, 'which', {
                //             get : function() {
                //                 return this.keyCodeVal;
                //             }
                // });
                // }catch(){} 

            
            	var _prop_name
            		, localDict = {};

            	for( _prop_name in _keyboardEvent_properties_dictionary ) if(own(_keyboardEvent_properties_dictionary, _prop_name) ) {
            		localDict[_prop_name] = (own(dict, _prop_name) && dict || _keyboardEvent_properties_dictionary)[_prop_name];
            	}

            	var _ctrlKey = localDict["ctrlKey"]
            		, _shiftKey = localDict["shiftKey"]
            		, _altKey = localDict["altKey"]
            		, _metaKey = localDict["metaKey"]
            		, _altGraphKey = localDict["altGraphKey"]

            		, _modifiersListArg = _initKeyboardEvent_type > 3 ? (
            			(_ctrlKey ? "Control" : "")
            				+ (_shiftKey ? " Shift" : "")
            				+ (_altKey ? " Alt" : "")
            				+ (_metaKey ? " Meta" : "")
            				+ (_altGraphKey ? " AltGraph" : "")
            			).trim() : null

            		, _key = localDict["key"] + ""
            		, _char = localDict["char"] + ""
            		, _location = localDict["location"]
            		, _keyCode = localDict["keyCode"] || (localDict["keyCode"] = _key && _key.charCodeAt( 0 ) || 0)
            		, _charCode = localDict["charCode"] || (localDict["charCode"] = _char && _char.charCodeAt( 0 ) || 0)

            		, _bubbles = localDict["bubbles"]
            		, _cancelable = localDict["cancelable"]

            		, _repeat = localDict["repeat"]
            		, _locale = localDict["locale"]
            		, _view = global
            	;

            	localDict["which"] || (localDict["which"] = localDict["keyCode"]);

                //e.keyCodeVal = _keyCode;
            
            	if( "initKeyEvent" in e ) {//FF
            		//https://developer.mozilla.org/en/DOM/event.initKeyEvent
            		e.initKeyEvent( type, _bubbles, _cancelable, _view, _ctrlKey, _altKey, _shiftKey, _metaKey, _keyCode, _charCode );
            	}
            	else if(  _initKeyboardEvent_type && "initKeyboardEvent" in e ) {//https://developer.mozilla.org/en/DOM/KeyboardEvent#initKeyboardEvent()
            		if( _initKeyboardEvent_type == 1 ) { // webkit
            			//http://stackoverflow.com/a/8490774/1437207
            			//https://bugs.webkit.org/show_bug.cgi?id=13368
            			e.initKeyboardEvent( type, _bubbles, _cancelable, _view, _key, _location, _ctrlKey, _shiftKey, _altKey, _metaKey, _altGraphKey );
            		}
            		else if( _initKeyboardEvent_type == 2 ) { // old webkit
            			//http://code.google.com/p/chromium/issues/detail?id=52408
            			e.initKeyboardEvent( type, _bubbles, _cancelable, _view, _ctrlKey, _altKey, _shiftKey, _metaKey, _keyCode, _charCode );
            		}
            		else if( _initKeyboardEvent_type == 3 ) { // webkit
            			e.initKeyboardEvent( type, _bubbles, _cancelable, _view, _key, _location, _ctrlKey, _altKey, _shiftKey, _metaKey, _altGraphKey );
            		}
            		else if( _initKeyboardEvent_type == 4 ) { // IE9
            			//http://msdn.microsoft.com/en-us/library/ie/ff975297(v=vs.85).aspx
            			e.initKeyboardEvent( type, _bubbles, _cancelable, _view, _key, _location, _modifiersListArg, _repeat, _locale );
            		}
            		else { // FireFox|w3c
            			//http://www.w3.org/TR/DOM-Level-3-Events/#events-KeyboardEvent-initKeyboardEvent
            			//https://developer.mozilla.org/en/DOM/KeyboardEvent#initKeyboardEvent()
            			e.initKeyboardEvent( type, _bubbles, _cancelable, _view, _char, _key, _location, _modifiersListArg, _repeat, _locale );
            		}
            	}
            	else {
            		e.initEvent(type, _bubbles, _cancelable)
            	}

            	for( _prop_name in _keyboardEvent_properties_dictionary )if( own( _keyboardEvent_properties_dictionary, _prop_name ) ) {
            		if( e[_prop_name] != localDict[_prop_name] ) {
            			try {
            				delete e[_prop_name];
            				_Object_defineProperty( e, _prop_name, { writable: true, "value": localDict[_prop_name] } );
            			}
            			catch(ex) {
            				//Some properties is read-only
// console.debug("PROP EX: " + ex);
// e[_prop_name] = _keyCode;
// console.debug("PROP AFTER: " + e[_prop_name]);
            			}
		
            		}
            	}

            	return e;
            }

            //export
            global.crossBrowser_initKeyboardEvent = crossBrowser_initKeyboardEvent;

            }.call(window);
            
            
	Keyboard = {	
        resetToDefaults: function()
        {
            // reset current scheme to defaultOptions
            for (prop in Keyboard.defaultOptions)
            {
                if (!Keyboard.defaultOptions.hasOwnProperty(prop)) continue;

                if (typeof Keyboard.defaultOptions[prop] !== 'string') continue;

                Keyboard[prop] = Keyboard.defaultOptions[prop];
            }
        },
        resetAccessKeys: function()
        {
            // reset access keys
            var extractAccessKey = function(keyboardShortcut)
            {
                if (!keyboardShortcut || !keyboardShortcut.length) return "";

                var char = keyboardShortcut[keyboardShortcut.length-1];
                if (/^[a-z0-9]+$/i.test(char)) return char;

                return "";
            };
            Keyboard.accesskeys = {};
            for (prop in Keyboard)
            {
                if (!Keyboard.hasOwnProperty(prop)) continue;

                var str = Keyboard[prop];

                if (typeof str !== 'string') continue;

                Keyboard.accesskeys[prop] = extractAccessKey(str);
            }
        },
        applySettings: function(json)
        {
            this.resetToDefaults();
            
            if (json && json.keyboard)
            {
                // override with user options
                for (prop in Keyboard)
                {
                    if (!Keyboard.hasOwnProperty(prop)) continue;
    
                    if (typeof Keyboard[prop] !== 'string') continue;
            
                    if (typeof json.keyboard[prop] !== 'string') continue;
    
                    Keyboard[prop] = json.keyboard[prop];
                }
            }

            this.resetAccessKeys();
        },
        dispatch: function(target, e)
        {
            //THIS FUNCTION NOT REACHED WHEN e.stopPropagation(); INVOKED IN IFRAME's HTML
            
            if (e.cancelBubble)
            {
                //WHEN e.cancelBubble = true IN IFRAME's HTML's own event callback
                return;
            }
            
            if (e.defaultPrevented)
            {
                //WHEN e.preventDefault() INVOKED IN IFRAME's HTML
                return;
            }
            
            if (typeof e.returnValue !== "undefined" && !e.returnValue)
            {
                //WHEN e.returnValue = false IN IFRAME's HTML's own event callback
                return;
            }
            
            var source = e.srcElement || e.target;
            if (source)
            {
                var parent = source;
                while (parent)
                {
                    var name = parent.nodeName;
                    if (name === "input" || name === "textarea")
                    {
                        return;
                    }
                    
                    if (parent.getAttribute)
                    {
                        var ce = parent.getAttribute("contenteditable");
                        if (ce === "true" || ce === "contenteditable")
                        {
                            return;
                        }
                    }
                 
                    if (parent.classList && parent.classList.contains("keyboard-input"))
                    {
                        return;
                    }
                    
                    parent = parent.parentNode;
                }
            }
            
            
            // //var newE = jQuery.extend(true, {}, e);// deep copy
            // var newE = $.extend($.Event(e.type), {}, e);
            // 
            // newE.preventDefault();
            // newE.stopPropagation();
            // newE.stopImmediatePropagation();
            // 
            // newE.originalEvent.bubbles = false;
            // newE.originalEvent.srcElement = document.documentElement;
            // newE.originalEvent.target = document.documentElement;
            // newE.originalEvent.view = window;
            
            var ev = crossBrowser_initKeyboardEvent(e.type, {
                "bubbles": true,
                "cancelable": false,
                
                "keyCode": e.keyCode,
                "charCode": e.charCode,
                "which": e.which,
                
                "ctrlKey": e.ctrlKey,
                "shiftKey": e.shiftKey,
                "altKey": e.altKey,
                "metaKey": e.metaKey,
                
                //https://developer.mozilla.org/en-US/docs/Web/API/event.which
                "char": e.char ? e.char : String.fromCharCode(e.charCode), // lower/upper case-sensitive
                "key": e.key ? e.key : e.keyCode // case-insensitive
            });

            //$(target).trigger(e);
            target.dispatchEvent(ev);
        },
        scope: function(scope)
        {
            if (!scope) alert("!SCOPE ACTIVATE!");
            
            key.setScope(scope);
        },
        on: function(keys, scope, callback)
        {
            if (!keys) console.error("!KEYS!");
            
            if (!keyBindings.hasOwnProperty(scope))
            {
                keyBindings[scope] = [];
            }
            keyBindings[scope].push(keys);
            
            key.unbind(keys, scope);
            key(keys, scope, function()
            {
                $(document.body).addClass("keyboard");
                callback();
            });
        },
        off: function(scope)
        {
            if (!scope) alert("!SCOPE OFF!");
            
            if (!keyBindings.hasOwnProperty(scope)) return;
            
            for (k in keyBindings[scope])
            {
                key.unbind(k, scope);
            }
        },
        i18n:
        {
            ShowSettingsModal: Strings.settings,
        
            SettingsModalSave: Strings.settings + " - " + Strings.i18n_save_changes,
            SettingsModalClose: Strings.settings + " - " + Strings.i18n_close,
        
            PagePrevious: Strings.i18n_page_previous,
            PageNext: Strings.i18n_page_next,
            PagePreviousAlt: Strings.i18n_page_previous + " (access key)",
            PageNextAlt: Strings.i18n_page_next + " (access key)",
        
            ToolbarShow: Strings.i18n_toolbar_show,
            ToolbarHide: Strings.i18n_toolbar_hide,
        
            FullScreenToggle: Strings.enter_fullscreen + " / " + Strings.exit_fullscreen,
        
            SwitchToLibrary: Strings.view_library,
        
            TocShowHideToggle: Strings.toc,
        
            NightTheme: Strings.i18n_arabian_nights,
        
            //MediaOverlaysPlayPauseAlt: Strings.i18n_audio_play + " / " + Strings.i18n_audio_pause,
            MediaOverlaysPlayPause: Strings.i18n_audio_play + " / " + Strings.i18n_audio_pause,
            
            MediaOverlaysPrevious: Strings.i18n_audio_previous,
            MediaOverlaysNext: Strings.i18n_audio_next,
        
            MediaOverlaysEscape: Strings.i18n_audio_esc,
        
            MediaOverlaysRateIncrease: Strings.i18n_audio_rate_increase,
            MediaOverlaysRateDecrease: Strings.i18n_audio_rate_decrease,
            //MediaOverlaysRateIncreaseAlt: "",
            //MediaOverlaysRateDecreaseAlt: "",
            MediaOverlaysRateReset: Strings.i18n_audio_rate_reset,
        
            MediaOverlaysVolumeIncrease: Strings.i18n_audio_volume_increase,
            MediaOverlaysVolumeDecrease: Strings.i18n_audio_volume_decrease,
            //MediaOverlaysVolumeIncreaseAlt: "",
            //MediaOverlaysVolumeDecreaseAlt: "",
            MediaOverlaysVolumeMuteToggle: Strings.i18n_audio_mute + " / " + Strings.i18n_audio_unmute,
        
            MediaOverlaysAdvancedPanelShowHide: Strings.i18n_audio_expand,
            
            BackgroundAudioPlayPause: Strings.i18n_audio_play_background + " / " + Strings.i18n_audio_pause_background
        },
        defaultOptions:  {},
        accesskeys: {}, // single key strokes are dynamically populated, based on the full shortcuts below:
        ShowSettingsModal: 'o', //accesskey'ed
        
        SettingsModalSave: 's', //accesskey'ed
        SettingsModalClose: 'c', //accesskey'ed
        
        PagePrevious: 'left', // ALT BELOW
        PageNext: 'right', // ALT BELOW
        PagePreviousAlt: '1', //accesskey'ed
        PageNextAlt: '2', //accesskey'ed
        
        ToolbarShow: 'v', //accesskey'ed
        ToolbarHide: 'x', //accesskey'ed
        
        FullScreenToggle: 'h', //accesskey'ed
        
        SwitchToLibrary: 'b', //accesskey'ed
        
        TocShowHideToggle: 't', //accesskey'ed
        
        NightTheme: 'n', //accesskey'ed
        
        MediaOverlaysEscape: 'r', //accesskey'ed
        
        //MediaOverlaysPlayPauseAlt: 'p', // ALT BELOW
        MediaOverlaysPlayPause: 'm', //accesskey'ed
        
        MediaOverlaysRateIncrease: 'l', //accesskey'ed
        MediaOverlaysRateDecrease: 'j', //accesskey'ed
        //MediaOverlaysRateIncreaseAlt: 'F8', //??
        //MediaOverlaysRateDecreaseAlt: 'shift+F8', //??
        MediaOverlaysRateReset: 'k', //accesskey'ed
        
        MediaOverlaysVolumeIncrease: 'w', //accesskey'ed
        MediaOverlaysVolumeDecrease: 'q', //accesskey'ed
        //MediaOverlaysVolumeIncreaseAlt: 'F7', //??
        //MediaOverlaysVolumeDecreaseAlt: 'shift+F7', //??
        MediaOverlaysVolumeMuteToggle: 'a', //accesskey'ed
        
        MediaOverlaysPrevious: 'y', //accesskey'ed
        MediaOverlaysNext: 'u', //accesskey'ed
        
        MediaOverlaysAdvancedPanelShowHide: 'g', //accesskey'ed
        
        BackgroundAudioPlayPause: 'd'
	};

    try
    {
        // reset defaultOptions with the hard-coded values
        Keyboard.defaultOptions = {};
        for (prop in Keyboard)
        {
            if (!Keyboard.hasOwnProperty(prop)) continue;

            if (typeof Keyboard[prop] !== 'string') continue;

            Keyboard.defaultOptions[prop] = Keyboard[prop];
        }
        
        // too early (async reader.options storage lookup)
        // Settings.get('reader', function(json)
        // {
        //    Keyboard.applySettings(json);
        // }); 
        
        //unnecessary
        //Keyboard.resetToDefaults();
        
        //necessary!
        Keyboard.resetAccessKeys();
    }
    catch(e)
    {
        console.error(e);
    }
    
	return Keyboard;
});