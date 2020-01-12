define(['jquery', 'bootstrap', 'storage/StorageManager', 'storage/Settings', 'EpubLibraryManager', 'i18n/Strings', 'hgn!templates/library-navbar.html', 
		 'hgn!templates/library-body.html', 'hgn!templates/empty-library.html', 'hgn!templates/library-item.html', 'hgn!templates/details-dialog.html', 'hgn!templates/about-dialog.html', 'hgn!templates/details-body.html', 
		 'hgn!templates/add-epub-dialog.html','ReaderSettingsDialog', 'Dialogs', 'workers/Messages', 'analytics/Analytics', 'Keyboard', 'versioning/Versioning'], 
		 function($, bootstrap, StorageManager, Settings, libraryManager, Strings, LibraryNavbar, LibraryBody, EmptyLibrary, LibraryItem, DetailsDialog, AboutDialog, DetailsBody, 
		 		  AddEpubDialog, SettingsDialog, Dialogs, Messages, Analytics, Keyboard, Versioning){

    var detailsDialogStr = DetailsDialog({strings: Strings});

	var heightRule,
		noCoverRule;
		//maxHeightRule

	var findHeightRule = function(){
		
 		var styleSheet=document.styleSheets[0];          
 		var ii=0;                                        
 		var cssRule;                               
        do {                                             
            if (styleSheet.cssRules) {                    
            	cssRule = styleSheet.cssRules[ii];         
            } else {                                      
            	cssRule = styleSheet.rules[ii];            
            }                                             
            if (cssRule)  {                               
            	if (cssRule.selectorText.toLowerCase()=='.library-item') {          
                    heightRule = cssRule;                    
                } 
                // else if (cssRule.selectorText.toLowerCase()=='.library-item img') {
                //     maxHeightRule = cssRule;
                // }                    
                else if (cssRule.selectorText.toLowerCase() == 'body:not(.list-view) .library-item .no-cover'){
                	noCoverRule = cssRule;
                }       
                                                         
            }                                             
            ii++;                                         
        } while (cssRule);                                       
   	}                                                      
   
	
	var setItemHeight = function(){
        
		var medWidth = 2,
			smWidth = 3,
			xsWidth = 4,
			rowHeight = 0,
			imgWidth = 0,
			scale = 1;

		var winWidth = window.innerWidth;

		if (winWidth >= 992){
			imgWidth = winWidth * (medWidth/12) - 30;
			rowHeight = 1.33 * imgWidth + 60; 
		}
		else if (winWidth >= 768){
			imgWidth = winWidth * (smWidth/12) - 30;
			rowHeight = 1.33 * imgWidth + 60; 
		}
		else{
			imgWidth = winWidth * (xsWidth/12) - 30;
			rowHeight = 1.33 * imgWidth + 20; 
		}
		heightRule.style.height  = rowHeight + 'px';
		scale = imgWidth/300;
		
		noCoverRule.style.width = imgWidth + 'px';
		noCoverRule.style.height = 1.33 * imgWidth + 'px';
		noCoverRule.style.fontSize = 40 * scale + 'px';
		//maxHeightRule.style.height = 1.33 * imgWidth + 'px';
		//maxHeightRule.style.width = imgWidth + 'px';
	};

	var showDetailsDialog = function(details){
		var bodyStr = DetailsBody({
			data: details,
			strings: Strings
		});

		$('.details-dialog .modal-body').html(bodyStr);
		$('.details-dialog .delete').on('click', function(){
			$('.details-dialog').modal('hide');
			var success = function(){
				libraryManager.retrieveAvailableEpubs(loadLibraryItems);
				Dialogs.closeModal();
			}

			var promptMsg = Strings.i18n_are_you_sure + ' \'' + details.title + '\'';

			Dialogs.showModalPrompt(Strings.delete_dlg_title, promptMsg, 
									Strings.i18n_delete, Strings.i18n_cancel,
									function(){
										Dialogs.showModalProgress(Strings.delete_progress_title, '');
										Dialogs.updateProgress(100, Messages.PROGRESS_DELETING, details.title, true); 
										libraryManager.deleteEpubWithId(details.rootDir, success, showError)
									});
		});
	}

	var showError = function(errorCode){
		Dialogs.showError(errorCode);
	}

	var loadDetails = function(e){
		var $this = $(this),
			url = $this.attr('data-package'),
			bookRoot = $this.attr('data-root'),
			rootDir = $this.attr('data-root-dir'),
			noCoverBg = $this.attr('data-no-cover');

		$('.details-dialog').remove();
        
        $('.details-dialog').off('hidden.bs.modal');
        $('.details-dialog').off('shown.bs.modal');
        
		$('#app-container').append(detailsDialogStr);
        
        $('#details-dialog').on('hidden.bs.modal', function () {
            Keyboard.scope('library');

            setTimeout(function(){ $this.focus(); }, 50);
        });
		$('#details-dialog').on('shown.bs.modal', function(){
            Keyboard.scope('details');
		});
        
        
		$('.details-dialog').modal();
		libraryManager.retrieveFullEpubDetails(url, bookRoot, rootDir, noCoverBg, showDetailsDialog, showError);
	}

	var loadLibraryItems = function(epubs){
		$('#app-container .library-items').remove();
		$('#app-container').append(LibraryBody({}));
		if (!epubs.length){
			$('#app-container .library-items').append(EmptyLibrary({strings: Strings}));
			return;
		}
		
		var count = 0;
		epubs.forEach(function(epub){
			var noCoverBackground = 'images/covers/cover' + ((count++ % 8) + 1) + '.jpg';
			$('.library-items').append(LibraryItem({count:{n: count, tabindex:count*2+99}, epub: epub, strings: Strings, noCoverBackground: noCoverBackground}));
		});
		$('.details').on('click', loadDetails);
	}

	var readClick = function(e){

		var epubUrl = $(this).attr('data-book');
		$(window).triggerHandler('readepub', [epubUrl]);
		return false;
	}

	var unloadLibraryUI = function(){

        // needed only if access keys can potentially be used to open a book while a dialog is opened, because keyboard.scope() is not accounted for with HTML access keys :(
        Dialogs.closeModal();
        Dialogs.reset();
        $('.modal-backdrop').remove();

        Keyboard.off('library');
        Keyboard.off('settings');
        
        $('#settings-dialog').off('hidden.bs.modal');
        $('#settings-dialog').off('shown.bs.modal');
        
        $('#about-dialog').off('hidden.bs.modal');
        $('#about-dialog').off('shown.bs.modal');
        
        $('#add-epub-dialog').off('hidden.bs.modal');
        $('#add-epub-dialog').off('shown.bs.modal');
        
        $('.details-dialog').off('hidden.bs.modal');
        $('.details-dialog').off('shown.bs.modal');
        
		$(window).off('resize');
		$(document.body).off('click');
		$(window).off('storageReady');
		$('#app-container').attr('style', '');
	}

	var promptForReplace = function(originalData, replaceCallback, keepBothCallback){
		Dialogs.showReplaceConfirm(Strings.replace_dlg_title, Strings.replace_dlg_message + ' \'' + originalData.title + '\'' , 
			Strings.replace, Strings.i18n_cancel, Strings.keepboth, replaceCallback, $.noop, keepBothCallback);
	}

	var handleLibraryChange = function(){
		Dialogs.closeModal();
		libraryManager.retrieveAvailableEpubs(loadLibraryItems);
	}

	var handleFileSelect = function(evt){
		var file = evt.target.files[0];
		$('#add-epub-dialog').modal('hide');
		Dialogs.showModalProgress(Strings.import_dlg_title, Strings.import_dlg_message);
		libraryManager.handleZippedEpub({
			file: file,
			overwrite: promptForReplace,
			success: handleLibraryChange, 
			progress: Dialogs.updateProgress,
			error: showError
		});

	}

	var handleDirSelect = function(evt){
		var files = evt.target.files;
		$('#add-epub-dialog').modal('hide');
		Dialogs.showModalProgress(Strings.import_dlg_title, Strings.import_dlg_message);
		libraryManager.handleDirectoryImport({
			files: files,
			overwrite: promptForReplace,
			success: handleLibraryChange, 
			progress: Dialogs.updateProgress,
			error: showError
		});
	}
	var handleUrlSelect = function(){
		var url = $('#url-upload').val();
		$('#add-epub-dialog').modal('hide');
		Dialogs.showModalProgress(Strings.import_dlg_title, Strings.import_dlg_message);
		libraryManager.handleUrlImport({
			url: url,
			overwrite: promptForReplace,
			success: handleLibraryChange, 
			progress: Dialogs.updateProgress,
			error: showError
		});
	}

	var doMigration = function(){
		Dialogs.showModalProgress(Strings.migrate_dlg_title, Strings.migrate_dlg_message);
		libraryManager.handleMigration({
			success: function(){
				Settings.put('needsMigration', false, $.noop);
				handleLibraryChange();
			}, 
			progress: Dialogs.updateProgress,
			error: showError
		});
	}
    
	var loadLibraryUI = function(){
        
		Dialogs.reset();
        
        Keyboard.scope('library');
        
		Analytics.trackView('/library');
		var $appContainer = $('#app-container');
		$appContainer.empty();
		SettingsDialog.initDialog();
		$appContainer.append(AddEpubDialog({
			canHandleUrl : libraryManager.canHandleUrl(),
			canHandleDirectory : libraryManager.canHandleDirectory(),
            strings: Strings
		}));
		Versioning.getVersioningInfo(function(version){
			$appContainer.append(AboutDialog({strings: Strings, viewer: version.viewer, readium: version.readiumJs, sharedJs: version.readiumSharedJs}));
		});
		
        
        $('#about-dialog').on('hidden.bs.modal', function () {
            Keyboard.scope('library');

            setTimeout(function(){ $("#aboutButt1").focus(); }, 50);
        });
		$('#about-dialog').on('shown.bs.modal', function(){
            Keyboard.scope('about');
		});
        
        $('#add-epub-dialog').on('hidden.bs.modal', function () {
            Keyboard.scope('library');

            setTimeout(function(){ $("#addbutt").focus(); }, 50);
        });
		$('#add-epub-dialog').on('shown.bs.modal', function(){
            Keyboard.scope('add');
            
			$('#add-epub-dialog input').val('');

            setTimeout(function(){ $('#closeAddEpubCross')[0].focus(); }, 1000);
		});
		$('#url-upload').on('keyup', function(){
			var val = $(this).val();
			if (val && val.length){
				$('#add-epub-dialog .add-book').prop('disabled', false);
			}
			else{
				$('#add-epub-dialog .add-book').prop('disabled', true);
			}
		});
		$('.add-book').on('click', handleUrlSelect);
		$('nav').empty();
        $('nav').attr("aria-label", Strings.i18n_toolbar);
		$('nav').append(LibraryNavbar({strings: Strings, dialogs: Dialogs, keyboard: Keyboard}));
		$('.icon-list-view').on('click', function(){
			$(document.body).addClass('list-view');
            setTimeout(function(){ $('.icon-thumbnails')[0].focus(); }, 50);
		});
		$('.icon-thumbnails').on('click', function(){
			$(document.body).removeClass('list-view');
            setTimeout(function(){ $('.icon-list-view')[0].focus(); }, 50);
		});
		findHeightRule();
		setItemHeight();
		StorageManager.initStorage(function(){
			libraryManager.retrieveAvailableEpubs(loadLibraryItems);
		}, showError);

        Keyboard.on(Keyboard.ShowSettingsModal, 'library', function(){$('#settings-dialog').modal("show");});

		$(window).trigger('libraryUIReady');
		$(window).on('resize', setItemHeight);

		var setAppSize = function(){
            var appHeight = $(document.body).height() - $('#app-container')[0].offsetTop;
            $('#app-container').height(appHeight);
        }
        $(window).on('resize', setAppSize);
        $('#app-container').css('overflowY', 'auto');

        setAppSize();
		$(document.body).on('click', '.read', readClick);
		$('#epub-upload').on('change', handleFileSelect);
		$('#dir-upload').on('change', handleDirSelect);

		document.title = Strings.i18n_readium_library;

        $('#settings-dialog').on('hidden.bs.modal', function () {

            Keyboard.scope('library');

            setTimeout(function(){ $("#settbutt1").focus(); }, 50);
            
            $("#buttSave").removeAttr("accesskey");
            $("#buttClose").removeAttr("accesskey");
        });
        $('#settings-dialog').on('shown.bs.modal', function () {

            Keyboard.scope('settings');
            
            $("#buttSave").attr("accesskey", Keyboard.accesskeys.SettingsModalSave);
            $("#buttClose").attr("accesskey", Keyboard.accesskeys.SettingsModalClose);
        });
        

        //async in Chrome
		Settings.get("needsMigration", function(needsMigration){
			if (needsMigration){
				doMigration();
			}
		});
	}

    var applyKeyboardSettingsAndLoadUi = function(data)
    {
        // override current scheme with user options
        Settings.get('reader', function(json)
        {
           Keyboard.applySettings(json);
           
           loadLibraryUI(data);
        });
    };

	return {
        loadUI : applyKeyboardSettingsAndLoadUi,
        unloadUI : unloadLibraryUI
	};
});