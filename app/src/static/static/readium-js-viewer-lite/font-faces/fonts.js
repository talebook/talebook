var _fontFaces_BUILT_IN =
[
    {
        displayName: "Open Dyslexic",
        fontFamily: "OpenDyslexic",
        url: "OpenDyslexic/OpenDyslexic.css"
    },
    {
        displayName: "Open Sans",
        fontFamily: "Open Sans",
        url: "Open-Sans/Open-Sans.css"
    },
    {
        displayName: "Noto Serif",
        fontFamily: "Noto Serif",
        url: "Noto-Serif/Noto-Serif.css"
    }
];

var _fontFaces_ONLINE =
[
    {
        displayName: "Old Standard TT (serif) [online]",
        fontFamily: "Old Standard TT",
        url: "https://fonts.googleapis.com/css?family=Old+Standard+TT"
    },
    {
        displayName: "Bitter (serif) [online]",
        fontFamily: "Bitter",
        url: "https://fonts.googleapis.com/css?family=Bitter"
    },
    {
        displayName: "Alegreya (serif) [online]",
        fontFamily: "Alegreya",
        url: "https://fonts.googleapis.com/css?family=Alegreya"
    },
    {
        displayName: "Roboto Mono (sans-serif) [online]",
        fontFamily: "Roboto Mono",
        url: "https://fonts.googleapis.com/css?family=Roboto+Mono"
    }
];

//////////////
// TO CUSTOMIZE AVAILABLE FONT FACES IN YOUR READIUM APP, DO NOT CHANGE THE CODE BELOW, SIMPLY EDIT THE ABOVE ARRAYS.
//////////////



var _fontFaces = _fontFaces_BUILT_IN;

// Due to CSP, Chrome Packaged Apps cannot include references to online web fonts
var isChromeExtensionPackagedApp = (typeof chrome !== "undefined") && chrome.app && chrome.app.window && chrome.app.window.current; // a bit redundant?

if (!isChromeExtensionPackagedApp) {
    for (var i = 0; i < _fontFaces_ONLINE.length; i++) {
        var fontFace = _fontFaces_ONLINE[i];
        _fontFaces.push(fontFace);
    }
}

// function exported to global context (window or self) when this fonts.js file is linked from index.html of cloud reader, Chrome app, etc.
var getFontFaces = function(URLprefix) {

    var fontsArray = [];

    for (var i = 0; i < _fontFaces.length; i++) {
        var fontFace = _fontFaces[i];
        
        var font = {};
        font.displayName = fontFace.displayName;
        font.fontFamily = fontFace.fontFamily;
        
        var isOnlineWebFont = (fontFace.url.indexOf("http://") == 0) || (fontFace.url.indexOf("https://") == 0);
        font.url = isOnlineWebFont ? fontFace.url : (URLprefix + fontFace.url);

        fontsArray.push(font);
    }

    return fontsArray;
};