
define(['module','jquery', 'bootstrap', 'Readium', 'Spinner', 'storage/Settings', 'i18n/Strings', 'Dialogs', 'Keyboard'], 
        function (module, $, bootstrap, Readium, spinner, Settings, Strings, Dialogs, Keyboard) {

    var init = function(readium) {
        
        readium.reader.on(ReadiumSDK.Events.PAGINATION_CHANGED, function (pageChangeData) {
            // That's after mediaOverlayPlayer.onPageChanged()

            if (readium.reader.isMediaOverlayAvailable()) {
                $('#audioplayer').show();
            }
            
            if (!pageChangeData.spineItem) return;
            
            var smil = readium.reader.package().media_overlay.getSmilBySpineItem(pageChangeData.spineItem);

            var atLeastOneIsEnabled = false;

            var $moSyncWord = $('#mo-sync-word');
            if (!smil || !smil.hasSync("word"))
            {
                $moSyncWord.attr('disabled', "disabled");
            }
            else
            {
                atLeastOneIsEnabled = true;
                $moSyncWord.removeAttr('disabled');
            }
            
            var $moSyncSentence = $('#mo-sync-sentence');
            if (!smil || !smil.hasSync("sentence"))
            {
                $moSyncSentence.attr('disabled', "disabled");
            }
            else
            {
                atLeastOneIsEnabled = true;
                $moSyncSentence.removeAttr('disabled');
            }

            var $moSyncParagraph = $('#mo-sync-paragraph');
            if (!smil || !smil.hasSync("paragraph"))
            {
                $moSyncParagraph.attr('disabled', "disabled");
            }
            else
            {
                atLeastOneIsEnabled = true;
                $moSyncParagraph.removeAttr('disabled');
            }
            
            var $moSyncDefault = $('#mo-sync-default');
            if (!atLeastOneIsEnabled)
            {
                $moSyncDefault.attr('disabled', "disabled");
            }
            else
            {
                $moSyncDefault.removeAttr('disabled');
            }
        });
        
        var $audioPlayer = $('#audioplayer');

        Settings.get('reader', function(json)
        {
            if (!json)
            {
                json = {};
                
                var settings = readium.reader.viewerSettings();
                
                json.mediaOverlaysSkipSkippables = settings.mediaOverlaysSkipSkippables;
                json.mediaOverlaysAutomaticPageTurn = settings.mediaOverlaysAutomaticPageTurn;
                json.mediaOverlaysEnableClick = settings.mediaOverlaysEnableClick;
                json.mediaOverlaysPreservePlaybackWhenScroll = settings.mediaOverlaysPreservePlaybackWhenScroll;
                
                Settings.put('reader', json);
            }
            
            if (json.mediaOverlaysSkipSkippables) // excludes typeof json.mediaOverlaysSkipSkippables === "undefined", so the default is to disable skippability
            {
                $audioPlayer.addClass('skip');
        
                readium.reader.updateSettings({
                    doNotUpdateView: true,
                    mediaOverlaysSkipSkippables: true
                });
            }
            else
            {
                $audioPlayer.removeClass('skip');
        
                readium.reader.updateSettings({
                    doNotUpdateView: true,
                    mediaOverlaysSkipSkippables: false
                });
            }

            if (json.mediaOverlaysPreservePlaybackWhenScroll)
            {
                $audioPlayer.addClass('playScroll');
        
                readium.reader.updateSettings({
                    doNotUpdateView: true,
                    mediaOverlaysPreservePlaybackWhenScroll: true
                });
            }
            else
            {
                $audioPlayer.removeClass('playScroll');
        
                readium.reader.updateSettings({
                    doNotUpdateView: true,
                    mediaOverlaysPreservePlaybackWhenScroll: false
                });
            }

            if (json.mediaOverlaysAutomaticPageTurn)
            {
                $audioPlayer.addClass('autoPageTurn');
        
                readium.reader.updateSettings({
                    doNotUpdateView: true,
                    mediaOverlaysAutomaticPageTurn: true
                });
            }
            else
            {
                $audioPlayer.removeClass('autoPageTurn');
        
                readium.reader.updateSettings({
                    doNotUpdateView: true,
                    mediaOverlaysAutomaticPageTurn: false
                });
            }
            
            if (json.mediaOverlaysEnableClick)
            {
                $audioPlayer.removeClass('no-touch');
        
                readium.reader.updateSettings({
                    doNotUpdateView: true,
                    mediaOverlaysEnableClick: true
                });
            }
            else
            {
                $audioPlayer.addClass('no-touch');
                
                readium.reader.updateSettings({
                    doNotUpdateView: true,
                    mediaOverlaysEnableClick: false
                });
            }
        });
        
        var $moSyncDefault = $('#mo-sync-default');
        $moSyncDefault.on("click", function () {
            var wasPlaying = readium.reader.isPlayingMediaOverlay();
            if (wasPlaying)
            {
                readium.reader.pauseMediaOverlay();
            }

            readium.reader.updateSettings({
                doNotUpdateView: true,
                mediaOverlaysSynchronizationGranularity: ""
            });
            
            if (wasPlaying)
            {
                readium.reader.playMediaOverlay();
            }
        });
        var $moSyncWord = $('#mo-sync-word');
        $moSyncWord.on("click", function () {
            var wasPlaying = readium.reader.isPlayingMediaOverlay();
            if (wasPlaying)
            {
                readium.reader.pauseMediaOverlay();
            }
            
            readium.reader.updateSettings({
                doNotUpdateView: true,
                mediaOverlaysSynchronizationGranularity: "word"
            });
            
            if (wasPlaying)
            {
                readium.reader.playMediaOverlay();
            }
        });
        var $moSyncSentence = $('#mo-sync-sentence');
        $moSyncSentence.on("click", function () {
            var wasPlaying = readium.reader.isPlayingMediaOverlay();
            if (wasPlaying)
            {
                readium.reader.pauseMediaOverlay();
            }

            readium.reader.updateSettings({
                doNotUpdateView: true,
                mediaOverlaysSynchronizationGranularity: "sentence"
            });
            
            if (wasPlaying)
            {
                readium.reader.playMediaOverlay();
            }
        });
        var $moSyncParagraph = $('#mo-sync-paragraph');
        $moSyncParagraph.on("click", function () {
            var wasPlaying = readium.reader.isPlayingMediaOverlay();
            if (wasPlaying)
            {
                readium.reader.pauseMediaOverlay();
            }

            readium.reader.updateSettings({
                doNotUpdateView: true,
                mediaOverlaysSynchronizationGranularity: "paragraph"
            });
            
            if (wasPlaying)
            {
                readium.reader.playMediaOverlay();
            }
        });
        
        
        var $highlighterButts = $('.btn-mo-highlighter');
        $highlighterButts.on("click", function () {
            $highlighterButts.attr("aria-selected", "false");
            $(this).attr("aria-selected", "true");
            
            var index = $(this).attr("data-mohighlight");

            readium.reader.setStyles([
                {
                    selector: ".mo-active-default",
                    declarations: undefined
                }
            ], true);
            
            if (index === "1")
            {
                readium.reader.setStyles([
                    {
                        selector: ".mo-active-default",
                        declarations: {
                            "background-color": "yellow !important",
                            "color": "black !important",
                            "border-color": "transparent !important",
                            "border-radius": "0.4em !important",
                            "box-shadow": "0px 0px 0.4em #333333 !important"
                        }
                    }
                ], true);
            }
            else if (index === "2")
            {
                readium.reader.setStyles([
                    {
                        selector: ".mo-active-default",
                        declarations: {
                            "background-color": "black !important",
                            "color": "white !important",
                            "border-color": "transparent !important",
                            "border-radius": "0.4em !important"
                        }
                    }
                ], true);
            }
            else if (index === "3")
            {
                readium.reader.setStyles([
                    {
                        selector: ".mo-active-default",
                        declarations: {
                            "background-color": "orange !important",
                            "color": "black !important",
                            "border-color": "transparent !important",
                            "border-radius": "0.4em !important"
                        }
                    }
                ], true);
            }
            else if (index === "4")
            {
                readium.reader.setStyles([
                    {
                        selector: ".mo-active-default",
                        declarations: {
                            "background-color": "blue !important",
                            "color": "white !important",
                            "border-color": "transparent !important",
                            "border-radius": "0.4em !important"
                        }
                    }
                ], true);
            }
            else if (index === "5")
            {
                readium.reader.setStyles([
                    {
                        selector: ".mo-active-default",
                        declarations: {
                            "background-color": "magenta !important",
                            "color": "black !important",
                            "border-color": "transparent !important",
                            "border-radius": "0.4em !important"
                        }
                    }
                ], true);
            }
            else if (index === "6")
            {
                readium.reader.setStyles([
                    {
                        selector: ".mo-active-default",
                        declarations: {
                            "background-color": "#00FF00 !important",
                            "color": "black !important",
                            "border-color": "transparent !important",
                            "border-radius": "0.4em !important"
                        }
                    }
                ], true);
            }
        });
        
        Keyboard.on(Keyboard.MediaOverlaysEscape, 'reader', readium.reader.escapeMediaOverlay);
        
        var $escAudioBtn = $("#btn-esc-audio");
        $escAudioBtn.on("click", readium.reader.escapeMediaOverlay);
        
        var $previousAudioBtn = $("#btn-previous-audio");
        var $nextAudioBtn = $("#btn-next-audio");
        
        Keyboard.on(Keyboard.MediaOverlaysPlayPause, 'reader', readium.reader.toggleMediaOverlay);
        //Keyboard.on(Keyboard.MediaOverlaysPlayPauseAlt, 'reader', readium.reader.toggleMediaOverlay);
        
        var $playAudioBtn = $("#btn-play-audio");
        var $pauseAudioBtn = $("#btn-pause-audio");
        
        $playAudioBtn.on("click", function () {
            //readium.reader[$(this).hasClass('pause-audio') ? 'pauseMediaOverlay' : 'playMediaOverlay']();
            //readium.reader.toggleMediaOverlay();
            var wasFocused = document.activeElement === $playAudioBtn[0];
            readium.reader.playMediaOverlay();
            
            $playAudioBtn.removeAttr("accesskey");
            $pauseAudioBtn.attr("accesskey", Keyboard.MediaOverlaysPlayPause);
            
            if (wasFocused) setTimeout(function(){ $pauseAudioBtn[0].focus(); }, 50);
        });
        
        $pauseAudioBtn.on("click", function () {
            var wasFocused = document.activeElement === $pauseAudioBtn[0];
            readium.reader.pauseMediaOverlay();
            
            $pauseAudioBtn.removeAttr("accesskey");
            $playAudioBtn.attr("accesskey", Keyboard.MediaOverlaysPlayPause);
            
            if (wasFocused) setTimeout(function(){ $playAudioBtn[0].focus(); }, 50);
        });
        
        
        var $expandAudioBtn = $("#btn-expand-audio");
        var $collapseAudioBtn = $("#btn-collapse-audio");

        var updateAudioExpand = function(expand)
        {
            if (expand)
            {
                $audioPlayer.addClass('expanded-audio');
                
                $expandAudioBtn.removeAttr("accesskey");
                $collapseAudioBtn.attr("accesskey", Keyboard.MediaOverlaysAdvancedPanelShowHide);
            }
            else
            {
                $audioPlayer.removeClass('expanded-audio');
                
                $collapseAudioBtn.removeAttr("accesskey");
                $expandAudioBtn.attr("accesskey", Keyboard.MediaOverlaysAdvancedPanelShowHide);
            }
        };
        
        Keyboard.on(Keyboard.MediaOverlaysAdvancedPanelShowHide, 'reader', function(){
            var toFocus = undefined;
            if ($audioPlayer.hasClass('expanded-audio'))
            {
                updateAudioExpand(false);
                toFocus = $expandAudioBtn[0];
            }
            else
            {
                updateAudioExpand(true);
                toFocus = $collapseAudioBtn[0];
            }

            $(document.body).removeClass('hide-ui');
            setTimeout(function(){ toFocus.focus(); }, 50);
        });
        
        $expandAudioBtn.on("click", function() {
            var wasFocused = document.activeElement === $expandAudioBtn[0];
            updateAudioExpand(true);
            if (wasFocused) setTimeout(function(){ $collapseAudioBtn[0].focus(); }, 50);
        });
        
        $collapseAudioBtn.on("click", function() {
            var wasFocused = document.activeElement === $collapseAudioBtn[0];
            updateAudioExpand(false);
            if (wasFocused) setTimeout(function(){ $expandAudioBtn[0].focus(); }, 50);
        });

        var $changeTimeControl = $('#time-range-slider');
        
        var debouncedTimeRangeSliderChange = _.debounce(
            function() {
        
                inDebounce = false;
                
                var percent = $changeTimeControl.val();

                var package = readium.reader.package();
                if (!package) return;
                if (!package.media_overlay) return;

                var par = {par: undefined};
                var smilData = {smilData: undefined};
                var milliseconds = {milliseconds: undefined};
        
                package.media_overlay.percentToPosition(percent, smilData, par, milliseconds);
        
                if (!par.par || !par.par.text || !smilData.smilData)
                {
                    return;
                }
        
                var smilSrc = smilData.smilData.href;
        
                var offsetS = milliseconds.milliseconds / 1000.0;
        
                readium.reader.mediaOverlaysOpenContentUrl(par.par.text.src, smilSrc, offsetS);
            }
        , 800);
        
        var updateSliderLabels = function($slider, val, txt)
        {
            $slider.attr("aria-valuenow", val+"");
            $slider.attr("aria-value-now", val+"");
            
            $slider.attr("aria-valuetext", txt+"");
            $slider.attr("aria-value-text", txt+"");
        };
        
        $changeTimeControl.on("change",
        function() {
            
            var percent = $changeTimeControl.val();
            percent = Math.round(percent);
            
            $changeTimeControl.attr("data-value", percent);
            updateSliderLabels($changeTimeControl, percent, percent + "%");
            
            if (readium.reader.isPlayingMediaOverlay())
            {
                readium.reader.pauseMediaOverlay();
            }
            debouncedTimeRangeSliderChange();
        }
        );
        
        readium.reader.on(ReadiumSDK.Events.MEDIA_OVERLAY_STATUS_CHANGED, function (value) {

            //var $audioPlayerControls = $('#audioplayer button, #audioplayer input:not(.mo-sync)');

            var percent = 0;

            var isPlaying = 'isPlaying' in value
                ? value.isPlaying   // for all the other events
                : true;             // for events raised by positionChanged, as `isPlaying` flag isn't even set

            var wasFocused = document.activeElement === $playAudioBtn[0] || document.activeElement === $pauseAudioBtn[0];

            if (isPlaying)
            {
                $playAudioBtn.removeAttr("accesskey");
                $pauseAudioBtn.attr("accesskey", Keyboard.MediaOverlaysPlayPause);
            }
            else
            {
                $pauseAudioBtn.removeAttr("accesskey");
                $playAudioBtn.attr("accesskey", Keyboard.MediaOverlaysPlayPause);
            }

            $audioPlayer.toggleClass('isPlaying', isPlaying);

            if (wasFocused) setTimeout(function(){ (isPlaying ? $pauseAudioBtn[0] : $playAudioBtn[0]).focus(); }, 50);
            
            percent = -1; // to prevent flickering slider position (pause callback is raised between each audio phrase!)

            // if (readium.reader.isMediaOverlayAvailable()) {
            //     $audioPlayer.show();
            //     //$audioPlayerControls.attr('disabled', false);
            //     
            // } else {
            //     //$audioPlayerControls.attr('disabled', true);
            // }

            if ((typeof value.playPosition !== "undefined") && (typeof value.smilIndex !== "undefined") && (typeof value.parIndex !== "undefined"))
            {
                var package = readium.reader.package();
                
                var playPositionMS = value.playPosition * 1000;
                percent = package.media_overlay.positionToPercent(value.smilIndex, value.parIndex, playPositionMS);

                if (percent < 0)
                {
                    percent = 0;
                }
            }

            if (percent >= 0)
            {
                $changeTimeControl.val(percent);
                percent = Math.round(percent);
                $changeTimeControl.attr("data-value", percent);
                updateSliderLabels($changeTimeControl, percent, percent + "%");
            }
        });
        
        var $buttondPreservePlaybackWhenScrollDisable = $('#btn-playback-scroll-disable');
        var $buttonPreservePlaybackWhenScrollEnable = $('#btn-playback-scroll-enable');
        
        $buttondPreservePlaybackWhenScrollDisable.on("click", function() {

            var wasFocused = document.activeElement === $buttondPreservePlaybackWhenScrollDisable[0];
            
            $audioPlayer.removeClass('playScroll');
            
            readium.reader.updateSettings({
                doNotUpdateView: true,
                mediaOverlaysPreservePlaybackWhenScroll: false
            });

            Settings.get('reader', function(json)
            {
                if (!json)
                {
                    json = {};
                }
                
                json.mediaOverlaysPreservePlaybackWhenScroll = false;
                Settings.put('reader', json);
            });
            
            if (wasFocused) setTimeout(function(){ $buttonPreservePlaybackWhenScrollEnable[0].focus(); }, 50);
        });

        $buttonPreservePlaybackWhenScrollEnable.on("click", function() {

            var wasFocused = document.activeElement === $buttonPreservePlaybackWhenScrollEnable[0];
            
            $audioPlayer.addClass('playScroll');
            
            readium.reader.updateSettings({
                doNotUpdateView: true,
                mediaOverlaysPreservePlaybackWhenScroll: true
            });
            
            Settings.get('reader', function(json)
            {
                if (!json)
                {
                    json = {};
                }
                
                json.mediaOverlaysPreservePlaybackWhenScroll = true;
                Settings.put('reader', json);
            });
            
            if (wasFocused) setTimeout(function(){ $buttondPreservePlaybackWhenScrollDisable[0].focus(); }, 50);
        });

        var $buttonAutoPageTurnDisable = $('#btn-auto-page-turn-disable');
        var $buttonAutoPageTurnEnable = $('#btn-auto-page-turn-enable');
        
        $buttonAutoPageTurnDisable.on("click", function() {

            var wasFocused = document.activeElement === $buttonAutoPageTurnDisable[0];
            
            $audioPlayer.removeClass('autoPageTurn');
            
            readium.reader.updateSettings({
                doNotUpdateView: true,
                mediaOverlaysAutomaticPageTurn: false
            });

            Settings.get('reader', function(json)
            {
                if (!json)
                {
                    json = {};
                }
                
                json.mediaOverlaysAutomaticPageTurn = false;
                Settings.put('reader', json);
            });
            
            if (wasFocused) setTimeout(function(){ $buttonAutoPageTurnEnable[0].focus(); }, 50);
        });

        $buttonAutoPageTurnEnable.on("click", function() {

            var wasFocused = document.activeElement === $buttonAutoPageTurnEnable[0];
            
            $audioPlayer.addClass('autoPageTurn');
            
            readium.reader.updateSettings({
                doNotUpdateView: true,
                mediaOverlaysAutomaticPageTurn: true
            });
            
            Settings.get('reader', function(json)
            {
                if (!json)
                {
                    json = {};
                }
                
                json.mediaOverlaysAutomaticPageTurn = true;
                Settings.put('reader', json);
            });
            
            if (wasFocused) setTimeout(function(){ $buttonAutoPageTurnDisable[0].focus(); }, 50);
        });
        

        var $buttonSkipDisable = $('#btn-skip-audio-disable');
        var $buttonSkipEnable = $('#btn-skip-audio-enable');
        
        $buttonSkipDisable.on("click", function() {

            var wasFocused = document.activeElement === $buttonSkipDisable[0];
            
            $audioPlayer.removeClass('skip');
            
            readium.reader.updateSettings({
                doNotUpdateView: true,
                mediaOverlaysSkipSkippables: false
            });

            Settings.get('reader', function(json)
            {
                if (!json)
                {
                    json = {};
                }
                
                json.mediaOverlaysSkipSkippables = false;
                Settings.put('reader', json);
            });
            
            if (wasFocused) setTimeout(function(){ $buttonSkipEnable[0].focus(); }, 50);
        });

        $buttonSkipEnable.on("click", function() {

            var wasFocused = document.activeElement === $buttonSkipEnable[0];
            
            $audioPlayer.addClass('skip');
            
            readium.reader.updateSettings({
                doNotUpdateView: true,
                mediaOverlaysSkipSkippables: true
            });
            
            Settings.get('reader', function(json)
            {
                if (!json)
                {
                    json = {};
                }
                
                json.mediaOverlaysSkipSkippables = true;
                Settings.put('reader', json);
            });
            
            if (wasFocused) setTimeout(function(){ $buttonSkipDisable[0].focus(); }, 50);
        });
        
        var $buttonTouchEnable = $('#btn-touch-audio-enable');
        var $buttonTouchDisable = $('#btn-touch-audio-disable');
        
        $buttonTouchEnable.on("click", function() {
            
            var wasFocused = document.activeElement === $buttonTouchEnable[0];
            
            $audioPlayer.removeClass('no-touch');
            
            readium.reader.updateSettings({
                doNotUpdateView: true,
                mediaOverlaysEnableClick: true
            });
            
            Settings.get('reader', function(json)
            {
                if (!json)
                {
                    json = {};
                }
                
                json.mediaOverlaysEnableClick = true;
                Settings.put('reader', json);
            });
            
            if (wasFocused) setTimeout(function(){ $buttonTouchDisable[0].focus(); }, 50);
        });
        
        $buttonTouchDisable.on("click", function() {
            
            var wasFocused = document.activeElement === $buttonTouchDisable[0];
            
            $audioPlayer.addClass('no-touch');
            
            readium.reader.updateSettings({
                doNotUpdateView: true,
                mediaOverlaysEnableClick: false
            });
            
            Settings.get('reader', function(json)
            {
                if (!json)
                {
                    json = {};
                }
                
                json.mediaOverlaysEnableClick = false;
                Settings.put('reader', json);
            });
            
            if (wasFocused) setTimeout(function(){ $buttonTouchEnable[0].focus(); }, 50);
        });
        
        var $changeRateControl = $('#rate-range-slider');
        var $changeRateControl_label = $('#rate-range-slider-label');
        
        var changeRate = function(minus)
        {
            var rateMin = parseFloat($changeRateControl.attr("min"));
            var rateMax = parseFloat($changeRateControl.attr("max"));
            var rateStep = parseFloat($changeRateControl.attr("step"));
            var rateVal = parseFloat($changeRateControl.val());

            rateVal += (minus ? (-rateStep) : rateStep);

            if (rateVal > rateMax) rateVal = rateMax;
            if (rateVal < rateMin) rateVal = rateMin;
            
            var txt = ((rateVal === 0 ? "~0" : ""+rateVal) + "x");
            
            updateSliderLabels($changeRateControl, rateVal, txt);
            
            $changeRateControl_label[0].textContent = txt;
            
            //readium.reader.setRateMediaOverlay(rateVal);
            readium.reader.updateSettings({
                doNotUpdateView: true,
                mediaOverlaysRate: rateVal
            });
            
            $changeRateControl.val(""+rateVal);
        };
        
        $("#buttRatePlus").on("click", function(){
            changeRate(false);
            //setTimeout(function(){ $changeRateControl[0].focus(); }, 50);
        });
        Keyboard.on(Keyboard.MediaOverlaysRateIncrease, 'reader', function(){        
            changeRate(false);
            //setTimeout(function(){ $changeRateControl[0].focus(); }, 50);
        });
        
        $("#buttRateMinus").on("click", function(){
            changeRate(true);
            //setTimeout(function(){ $changeRateControl[0].focus(); }, 50);
        });
        Keyboard.on(Keyboard.MediaOverlaysRateDecrease, 'reader', function(){
            changeRate(true);
            //setTimeout(function(){ $changeRateControl[0].focus(); }, 50);
        });
        
        // Keyboard.on(Keyboard.MediaOverlaysRateIncreaseAlt, 'reader', function(){        
        //     changeRate(false);
        //     //setTimeout(function(){ $changeRateControl[0].focus(); }, 50);
        // });
        // 
        // Keyboard.on(Keyboard.MediaOverlaysRateDecreaseAlt, 'reader', function(){
        //     changeRate(true);
        //     //setTimeout(function(){ $changeRateControl[0].focus(); }, 50);
        // });
        
        $changeRateControl.on("change", function() {
            var rateVal = $(this).val();
            var txt = ((rateVal === '0' ? "~0" : rateVal) + "x");
            
            updateSliderLabels($(this), rateVal, txt);

            $changeRateControl_label[0].textContent = txt;
            
            //readium.reader.setRateMediaOverlay(rateVal);
            readium.reader.updateSettings({
                doNotUpdateView: true,
                mediaOverlaysRate: rateVal
            });
        });
        
        var resetRate = function() {
            $changeRateControl.val(1);

            updateSliderLabels($changeRateControl, "1", "1x");

            $changeRateControl_label[0].textContent = "1x";
            
            //readium.reader.setRateMediaOverlay(1);
            readium.reader.updateSettings({
                doNotUpdateView: true,
                mediaOverlaysRate: 1
            });
        };

        Keyboard.on(Keyboard.MediaOverlaysRateReset, 'reader', resetRate);
        
        var $rateButton = $('#btn-audio-rate');
        $rateButton.on("click", resetRate);
        
        var $changeVolumeControl = $('#volume-range-slider');
        
        var changeVolume = function(minus)
        {
            var volumeVal = parseInt($changeVolumeControl.val());

            volumeVal += (minus ? (-20) : 20);

            if (volumeVal < 0) volumeVal = 0;
            if (volumeVal > 100) volumeVal = 100;

            //readium.reader.setVolumeMediaOverlay(volumeVal / 100);
            readium.reader.updateSettings({
                doNotUpdateView: true,
                mediaOverlaysVolume: volumeVal
            });
            
            $changeVolumeControl.val(""+volumeVal);

            updateSliderLabels($changeVolumeControl, volumeVal, volumeVal + "%");
            
            if (volumeVal === 0) {
                $audioPlayer.addClass('no-volume');
            } else {
                $audioPlayer.removeClass('no-volume');
            }
        };
        
        $("#buttVolumePlus").on("click", function(){
            changeVolume(false);
            //setTimeout(function(){ $changeVolumeControl[0].focus(); }, 50);
        });
        Keyboard.on(Keyboard.MediaOverlaysVolumeIncrease, 'reader', function(){
            changeVolume(false);
            //setTimeout(function(){ $changeVolumeControl[0].focus(); }, 50);
        });
        
        $("#buttVolumeMinus").on("click", function(){
            changeVolume(true);
            //setTimeout(function(){ $changeVolumeControl[0].focus(); }, 50);
        });
        Keyboard.on(Keyboard.MediaOverlaysVolumeDecrease, 'reader', function(){
            changeVolume(true);
            //setTimeout(function(){ $changeVolumeControl[0].focus(); }, 50);
        });
        
        // Keyboard.on(Keyboard.MediaOverlaysVolumeIncreaseAlt, 'reader', function(){
        //     changeVolume(false);
        //     //setTimeout(function(){ $changeVolumeControl[0].focus(); }, 50);
        // });
        
        // Keyboard.on(Keyboard.MediaOverlaysVolumeDecreaseAlt, 'reader', function(){
        //     changeVolume(true);
        //     //setTimeout(function(){ $changeVolumeControl[0].focus(); }, 50);
        // });
        
        $changeVolumeControl.on("change", function() {
            var volumeVal = $(this).val();

            //readium.reader.setVolumeMediaOverlay(volumeVal / 100);
            readium.reader.updateSettings({
                doNotUpdateView: true,
                mediaOverlaysVolume: volumeVal
            });

            updateSliderLabels($changeVolumeControl, volumeVal, volumeVal + "%");
            
            if (volumeVal === '0') {
                $audioPlayer.addClass('no-volume');
            } else {
                $audioPlayer.removeClass('no-volume');
            }
        });
                
        $volumeButtonMute = $('#btn-audio-volume-mute');
        $volumeButtonUnMute = $('#btn-audio-volume-unmute');
        
        var _lastVolumeBeforeMute = '0';
        
        var muteVolume = function(){

            _lastVolumeBeforeMute = $changeVolumeControl.val();

            //readium.reader.setVolumeMediaOverlay(volumeVal);
            readium.reader.updateSettings({
                doNotUpdateView: true,
                mediaOverlaysVolume: 0
            });
            
            $changeVolumeControl.val(0);

            updateSliderLabels($changeVolumeControl, 0, 0 + "%");
            
            $volumeButtonMute.removeAttr("accesskey");
            $volumeButtonUnMute.attr("accesskey", Keyboard.MediaOverlaysVolumeMuteToggle);
            
            $audioPlayer.addClass('no-volume');
        };
        
        var unMuteVolume = function(){

            //var currentVolume = $changeVolumeControl.val();
            var volumeVal = _lastVolumeBeforeMute === '0' ? '100' : _lastVolumeBeforeMute;

            //readium.reader.setVolumeMediaOverlay(volumeVal);
            readium.reader.updateSettings({
                doNotUpdateView: true,
                mediaOverlaysVolume: volumeVal
            });
            
            $changeVolumeControl.val(volumeVal);

            updateSliderLabels($changeVolumeControl, volumeVal, volumeVal + "%");
            
            $volumeButtonUnMute.removeAttr("accesskey");
            $volumeButtonMute.attr("accesskey", Keyboard.MediaOverlaysVolumeMuteToggle);

            $audioPlayer.removeClass('no-volume');
        };

        Keyboard.on(Keyboard.MediaOverlaysVolumeMuteToggle, 'reader', function(){
            ($audioPlayer.hasClass('no-volume') ? unMuteVolume : muteVolume)();
        });
        
        $volumeButtonMute.on("click", function() {
            
            var wasFocused = document.activeElement === $volumeButtonMute[0];
                
            muteVolume();
                
            if (wasFocused) setTimeout(function(){ $volumeButtonUnMute[0].focus(); }, 50);
        });
        
        $volumeButtonUnMute.on("click", function() {
            
            var wasFocused = document.activeElement === $volumeButtonUnMute[0];
            
            unMuteVolume();
            
            if (wasFocused) setTimeout(function(){ $volumeButtonMute[0].focus(); }, 50);
        });
        
        Keyboard.on(Keyboard.MediaOverlaysPrevious, 'reader', readium.reader.previousMediaOverlay);
        
        $previousAudioBtn.on("click", readium.reader.previousMediaOverlay);
        
        Keyboard.on(Keyboard.MediaOverlaysNext, 'reader', readium.reader.nextMediaOverlay);
        
        $nextAudioBtn.on("click", readium.reader.nextMediaOverlay);
    };

    return {
        init : init
    };
});
