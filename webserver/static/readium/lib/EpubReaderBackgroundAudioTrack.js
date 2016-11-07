
define(['module','jquery', 'bootstrap', 'Readium', 'Spinner', 'storage/Settings', 'i18n/Strings', 'Dialogs', 'Keyboard'], 
        function (module, $, bootstrap, Readium, spinner, Settings, Strings, Dialogs, Keyboard) {

    var init = function(readium) {

        if (!readium.reader.backgroundAudioTrackManager) return; // safety (out-of-date readium-shared-js?)

        var $audioTrackDiv = $("#backgroundAudioTrack-div");
    
        var $playAudioTrackBtn = $("#backgroundAudioTrack-button-play");
        var $pauseAudioTrackBtn = $("#backgroundAudioTrack-button-pause");

        readium.reader.backgroundAudioTrackManager.setCallback_PlayPause(function(doPlay)
            {
                if (doPlay)
                {
                    $audioTrackDiv.addClass('isPlaying');

                    $playAudioTrackBtn.removeAttr("accesskey");
                    $pauseAudioTrackBtn.attr("accesskey", Keyboard.BackgroundAudioPlayPause);
                }
                else
                {
                    $audioTrackDiv.removeClass('isPlaying');

                    $pauseAudioTrackBtn.removeAttr("accesskey");
                    $playAudioTrackBtn.attr("accesskey", Keyboard.BackgroundAudioPlayPause);
                }
            }
        );

        readium.reader.backgroundAudioTrackManager.setCallback_IsAvailable(function(yes)
            {
                if (yes)
                {
                    $audioTrackDiv.removeClass("none");
                }
                else
                {                
                    $audioTrackDiv.addClass("none");
                }
            }
        );
        

        Keyboard.on(Keyboard.BackgroundAudioPlayPause, 'reader', function()
        {
            var play = !$audioTrackDiv.hasClass('isPlaying');
            
            readium.reader.backgroundAudioTrackManager.setPlayState(play);
            readium.reader.backgroundAudioTrackManager.playPause(play);
        });
    
        $playAudioTrackBtn.on("click", function ()
        {
            var wasFocused = document.activeElement === $playAudioTrackBtn[0];
        
            readium.reader.backgroundAudioTrackManager.setPlayState(true);
            readium.reader.backgroundAudioTrackManager.playPause(true);
        
            if (wasFocused) setTimeout(function(){ $pauseAudioTrackBtn[0].focus(); }, 50);
        });
    
        $pauseAudioTrackBtn.on("click", function ()
        {
            var wasFocused = document.activeElement === $pauseAudioTrackBtn[0];
        
            readium.reader.backgroundAudioTrackManager.setPlayState(false);
            readium.reader.backgroundAudioTrackManager.playPause(false);
        
            if (wasFocused) setTimeout(function(){ $playAudioTrackBtn[0].focus(); }, 50);
        });
    };

    return {
        init : init
    };
});
