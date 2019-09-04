define(['hgn!templates/settings-keyboard-item.html', 'i18n/Strings', 'Dialogs', 'storage/Settings', 'Keyboard'], function(KeyboardItem, Strings, Dialogs, Settings, Keyboard){

    
    var checkKeyboardShortcuts = function($focusedInput, typing)
    {
        var duplicate = false;
        var invalid = false;

        var $keyboardList = $("#keyboard-list");
    
        var wasAlert = $keyboardList.hasClass("atLeastOneInvalidOrDuplicateShortcut");
    
        $keyboardList.removeClass("atLeastOneInvalidOrDuplicateShortcut");
        
        var alertInvalidKeyboard = $("#invalid_keyboard_shortcut_ALERT")[0];
        
        alertInvalidKeyboard.removeAttribute("role");
        alertInvalidKeyboard.removeAttribute("aria-live");
        alertInvalidKeyboard.removeAttribute("aria-atomic");

        //alertInvalidKeyboard.style.clip = "rect(0px,0px,0px,0px)";
        
        while (alertInvalidKeyboard.firstChild) {
            alertInvalidKeyboard.removeChild(alertInvalidKeyboard.firstChild);
        }
        
        var focusedInputIsInvalid = false;
        
        var $inputs = $(".keyboardInput");
        $inputs.each(function()
        {
            var $that = $(this);

            $that.parent().removeClass("duplicateShortcut");
            $that[0].removeAttribute("aria-invalid");
            
            checkKeyboardShortcut($that, typing);
            
            if ($that.parent().hasClass("invalidShortcut"))
            {
                $that[0].setAttribute("aria-invalid", "true");
                invalid = true;
                
                if ($focusedInput && $focusedInput.length && $focusedInput[0] === $that[0])
                {
                    focusedInputIsInvalid = true;
                }
            }
        });

        var focusedInputIsDuplicate = false;

        for (var i = 0; i < 2; i++) // 2-pass process
        {
            // duplicates
            $inputs.each(function()
            {
                var $that = $(this);
                
                var thatInvalid = $that.parent().hasClass("invalidShortcut");
                var thatDuplicate = $that.parent().hasClass("duplicateShortcut");
                var thatOriginal = $that.attr("placeholder");
            
                var thatVal = thatInvalid || thatDuplicate ? thatOriginal : $that.attr("data-val");
                
                if (thatDuplicate) return true; // continue (second pass)
                
                $inputs.each(function()
                {
                    var $self = $(this);
                    if ($self[0] === $that[0]) return true; //continue
            
                    var selfOriginal = $self.attr("placeholder");
                
                    var selfInvalid = $self.parent().hasClass("invalidShortcut");
                
                    var selfDuplicate = $self.parent().hasClass("duplicateShortcut");
                
                    var selfVal = selfInvalid || selfDuplicate ? selfOriginal : $self.attr("data-val");
                
                    if (thatVal === selfVal)
                    {
                        duplicate = true;
                
                        if ($focusedInput && $focusedInput.length && ($focusedInput[0] === $that[0] || $focusedInput[0] === $self[0]))
                        {
                            focusedInputIsDuplicate = true;
                        }

                        $that[0].setAttribute("aria-invalid", "true");
                        $self[0].setAttribute("aria-invalid", "true");
                    
                        if (!$self.parent().hasClass("duplicateShortcut")) $self.parent().addClass("duplicateShortcut");
                        if (!$that.parent().hasClass("duplicateShortcut")) $that.parent().addClass("duplicateShortcut");
                    }
                });
            });
        }
        
        if (duplicate || invalid)
        {
            $keyboardList.addClass("atLeastOneInvalidOrDuplicateShortcut");

            if (focusedInputIsInvalid || focusedInputIsDuplicate)
            {
                if (wasAlert)
                    alertInvalidKeyboard.setAttribute("aria-live", "polite");
                else
                    alertInvalidKeyboard.setAttribute("role", "alert"); //alertInvalidKeyboard.setAttribute("aria-live", "assertive");
                                
                alertInvalidKeyboard.setAttribute("aria-atomic", "true");
            
                var txt = document.createTextNode(focusedInputIsInvalid ? Strings.i18n_invalid_keyboard_shortcut : Strings.i18n_duplicate_keyboard_shortcut);
                alertInvalidKeyboard.appendChild(txt);
            
                //alertInvalidKeyboard.style.clip = "auto";
                
                alertInvalidKeyboard.style.visibility = "hidden";
                alertInvalidKeyboard.style.visibility = "visible";
            }
        }
    };
    
    var checkKeyboardShortcut = function($input, typing)
    {
        $input.parent().removeClass("invalidShortcut");
        $input.attr("data-val", $input.val());
        
        var current = $input.val().toLowerCase().trim();
        
        var shift = false;
        var ctrl = false;
        var alt = false;
        
        if (current.indexOf("shift") >= 0) shift = true;
        if (current.indexOf("ctrl") >= 0) ctrl = true;
        if (current.indexOf("alt") >= 0) alt = true;
        
        var hasPlus = current.lastIndexOf("+") === current.length - 1;
        
        current = current.replace(/shift/g, '');
        current = current.replace(/ctrl/g, '');
        current = current.replace(/alt/g, '');
        current = current.replace(/\+/g, '');
        current = current.replace(/\s/g, '');
        current = current.trim();
        
        if (hasPlus)
        {
            current = current + "+";
        }
        
        if (current.match(/^[0-9A-Za-z]$/) || current.match(/^backspace$/) || current.match(/^space$/) || current.match(/^return$/) || current.match(/^enter$/) || current.match(/^left$/) || current.match(/^right$/) || current.match(/^up$/) || current.match(/^down$/))
        {
            var normalised = (shift?"shift + ":"") + (ctrl?"ctrl + ":"") + (alt?"alt + ":"") + current;
            $input.attr("data-val", normalised);
            if (!typing) $input.val(normalised);
        }
        else
        {
            $input.parent().addClass("invalidShortcut");
        }
    };
    
    var initKeyboardList = function()
    {
        var $keyboardList = $("#keyboard-list");
    
        $keyboardList.empty();
        
        $keyboardList.append(KeyboardItem({strings: Strings, id: "TOP" }));
        
        for (prop in Keyboard)
        {
            if (!Keyboard.hasOwnProperty(prop)) continue;

            if (typeof Keyboard[prop] !== 'string') continue;

            $keyboardList.append(KeyboardItem({strings: Strings, keyboard: Keyboard, name: prop, shortcut: Keyboard[prop], i18n: Keyboard.i18n[prop], def: Keyboard.defaultOptions[prop] }));
        }

        $keyboardList.append(KeyboardItem({strings: Strings, id: "BOTTOM" }));
        
        checkKeyboardShortcuts();
        
        var _previousInputVal = undefined;
        
        $(".keyboardInput").on("blur",
        function(e)
        {
            var $that = $(this);
            _previousInputVal = undefined;
            checkKeyboardShortcuts();
        });
        
        $(".keyboardInput").on("focus",
        function(e)
        {
            var $that = $(this);
            checkKeyboardShortcuts($that, true);
        });

        var debouncedKeyboardValidator = _.bind(_.debounce(checkKeyboardShortcuts, 700), this);
        
        $(".keyboardInput").on("keyup", function(){
            var $that = $(this);
            var val = $that.val();
            if (val !== _previousInputVal)
            {
                debouncedKeyboardValidator($that, true);
            }
            _previousInputVal = val;
        });
         
        // KEYSTROKE CAPTURE DOES NOT WORK, BECAUSE HTML ACCESSKEYS GET IN THE WAY (e.g. CTRL ALT M => play audio)
        // var oldScope = undefined;
        // $(".captureKeyboardShortcut").on("focus",
        // function(e)
        // {
        //     oldScope = key.getScope();
        //     key.setScope("captureKeyboardShortcut");
        // });
        // $(".captureKeyboardShortcut").on("blur",
        // function(e)
        // {
        //     if (oldScope) key.setScope(oldScope);
        // });
        // $(".captureKeyboardShortcut").on("keydown",
        // //document.addEventListener('keydown',
        // function()
        // {
        //     // var clazz = (e.sourceElement || e.target).getAttribute("class");
        //     // if (!clazz || clazz.indexOf("captureKeyboardShortcut") < 0) return;
        //     
        //     //str.charCodeAt(0);
        //     console.log(key.shift);
        //     console.log(key.control);
        //     console.log(key.alt);
        //     console.log(key.command);
        //     console.log(key.getPressedKeyCodes());
        //     
        //     var keys = key.getPressedKeyCodes();
        //     if (keys && keys.length) keys = keys[0];
        // 
        //     var keystroke = (key.shift ? "shift+" : "") + (key.control ? "ctrl+" : "") + (key.alt ? "alt+" : "") + (key.command ? "command+" : "") + keys;
        // 
        //     $that = $(this);
        //     var id = $that.attr("data-key");
        //     $input = $("input#"+id);
        //     $input.val(keystroke);
        // 
        //     // e.preventDefault();
        //     // e.stopPropagation();
        //     // return false;
        // });

        $(".resetKey").on("click", function()
        {
            $that = $(this);
            var id = $that.attr("data-key");
            if (id)
            {
                var $input = $("input#"+id);
                
                //$input.val($input.attr("placeholder"));
                $input.val(Keyboard.defaultOptions[id]);
            }
            else
            {
                //$(".resetKey[data-key]").trigger("click");
                $(".resetKey[data-key]").each(function()
                {
                    var $self = $(this);
                    var id = $self.attr("data-key");
                    if (id)
                    {
                        var $input = $("input#"+id);
                
                        //$input.val($input.attr("placeholder"));
                        $input.val(Keyboard.defaultOptions[id]);
                    }
                });
            }

            checkKeyboardShortcuts();
        });
    };
    
    var saveKeys = function()
    {
        var atLeastOneChanged = false;
        var keys = {};
        
        checkKeyboardShortcuts();
        $(".keyboardInput").each(function()
        {
            var $that = $(this);
            
            var original = $that.attr("placeholder");
            var id = $that.attr("id");
            
            var val = $that.attr("data-val");
            //var valShown = $that.val();

            if ($that.parent().hasClass("invalidShortcut") || $that.parent().hasClass("duplicateShortcut"))
            {
                // if (original === val) return true; // continue (effectively resets to the default valid value)
                val = original;
            }
            
            if (!val.length) return true; // continue

            val = val.toLowerCase();

            if (original !== val) atLeastOneChanged = true;

            if (val !== Keyboard.defaultOptions[id])
            {
                keys[id] = val;
            }
        });
        if (atLeastOneChanged)
        {
            // TODO: anything more elegant than alert() ?
            //alert(Strings.i18n_keyboard_reload);
            
            Dialogs.showModalMessage("Readium - " + Strings.i18n_keyboard_shortcuts, Strings.i18n_keyboard_reload);
        }
        
        return keys;
    };

	return {
		initKeyboardList : initKeyboardList,
        saveKeys : saveKeys
	}
});