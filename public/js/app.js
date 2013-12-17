jQuery(function(){
	// Popover in nav bar
	var popover = jQuery('#notificationsPopover');//
	if(popover){
		jQuery('#notificationsPopoverTrigger').popover({
			content: popover
		, html: true
		, placement: 'bottom'
		, title: 'Notifications'
		}).on('show', function(){
			popover.removeClass('hide');
		});
	}

	jQuery('.datepicker').datepicker({
		pickTime: false
	});

	jQuery('.editable').each(function(){
		var t = jQuery(this);
		t.before('<div class="btn-toolbar" data-role="editor-toolbar" data-target="#'+this.id+'">\
				<div class="btn-group">\
					<a class="btn dropdown-toggle" data-toggle="dropdown" title="Font"><i class="icon-font"></i><b class="caret"></b></a>\
					<ul class="dropdown-menu">\
					</ul>\
					</div>\
				<div class="btn-group">\
					<a class="btn dropdown-toggle" data-toggle="dropdown" title="Font Size"><i class="icon-text-height"></i>&nbsp;<b class="caret"></b></a>\
					<ul class="dropdown-menu">\
					<li><a data-edit="fontSize 5"><font size="5">Huge</font></a></li>\
					<li><a data-edit="fontSize 3"><font size="3">Normal</font></a></li>\
					<li><a data-edit="fontSize 1"><font size="1">Small</font></a></li>\
					</ul>\
				</div>\
				<div class="btn-group">\
					<a class="btn" data-edit="bold" title="Bold (Ctrl/Cmd+B)"><i class="icon-bold"></i></a>\
					<a class="btn" data-edit="italic" title="Italic (Ctrl/Cmd+I)"><i class="icon-italic"></i></a>\
					<a class="btn" data-edit="strikethrough" title="Strikethrough"><i class="icon-strikethrough"></i></a>\
					<a class="btn" data-edit="underline" title="Underline (Ctrl/Cmd+U)"><i class="icon-underline"></i></a>\
				</div>\
				<div class="btn-group">\
					<a class="btn" data-edit="insertunorderedlist" title="Bullet list"><i class="icon-list-ul"></i></a>\
					<a class="btn" data-edit="insertorderedlist" title="Number list"><i class="icon-list-ol"></i></a>\
					<a class="btn" data-edit="outdent" title="Reduce indent (Shift+Tab)"><i class="icon-indent-left"></i></a>\
					<a class="btn" data-edit="indent" title="Indent (Tab)"><i class="icon-indent-right"></i></a>\
				</div>\
				<div class="btn-group">\
					<a class="btn" data-edit="justifyleft" title="Align Left (Ctrl/Cmd+L)"><i class="icon-align-left"></i></a>\
					<a class="btn" data-edit="justifycenter" title="Center (Ctrl/Cmd+E)"><i class="icon-align-center"></i></a>\
					<a class="btn" data-edit="justifyright" title="Align Right (Ctrl/Cmd+R)"><i class="icon-align-right"></i></a>\
					<a class="btn" data-edit="justifyfull" title="Justify (Ctrl/Cmd+J)"><i class="icon-align-justify"></i></a>\
				</div>\
				<div class="btn-group">\
					<a class="btn dropdown-toggle" data-toggle="dropdown" title="Hyperlink"><i class="icon-link"></i></a>\
					<div class="dropdown-menu input-append">\
						<input class="span2" placeholder="URL" type="text" data-edit="createLink"/>\
						<button class="btn" type="button">Add</button>\
					</div>\
					<a class="btn" data-edit="unlink" title="Remove Hyperlink"><i class="icon-cut"></i></a>\
				</div>\
				<div class="btn-group">\
					<a class="btn" title="Insert picture (or just drag & drop)" id="pictureBtn"><i class="icon-picture"></i></a>\
					<input type="file" data-role="magic-overlay" data-target="#pictureBtn" data-edit="insertImage" />\
				</div>\
				<div class="btn-group">\
					<a class="btn" data-edit="undo" title="Undo (Ctrl/Cmd+Z)"><i class="icon-undo"></i></a>\
					<a class="btn" data-edit="redo" title="Redo (Ctrl/Cmd+Y)"><i class="icon-repeat"></i></a>\
				</div>\
			</div>');
//				<input type="text" data-edit="inserttext" id="voiceBtn" x-webkit-speech="">\
	});

	function initToolbarBootstrapBindings() {
		var fonts = ['Serif', 'Sans', 'Arial', 'Arial Black', 'Courier', 'Courier New', 'Comic Sans MS', 'Helvetica', 'Impact', 'Lucida Grande', 'Lucida Sans', 'Tahoma', 'Times', 'Times New Roman', 'Verdana'],
			fontTarget = $('[title=Font]').siblings('.dropdown-menu');
		$.each(fonts, function (idx, fontName) {
			fontTarget.append($('<li><a data-edit="fontName ' + fontName +'" style="font-family:\''+ fontName +'\'">'+fontName + '</a></li>'));
		});
		$('a[title]').tooltip({container:'body'});
		$('.dropdown-menu input').click(function() {return false;})
			.change(function () {$(this).parent('.dropdown-menu').siblings('.dropdown-toggle').dropdown('toggle');})
			.keydown('esc', function () {this.value='';$(this).change();});
	
		$('[data-role=magic-overlay]').each(function () { 
			var overlay = $(this), target = $(overlay.data('target')); 
			overlay.css('opacity', 0).css('position', 'absolute').offset(target.offset()).width(target.outerWidth()).height(target.outerHeight());
		});
/*
		if ("onwebkitspeechchange"  in document.createElement("input")) {
			var editorOffset = $('.editable').offset();
			$('#voiceBtn').css('position','absolute').offset({top: editorOffset.top, left: editorOffset.left+$('#editor').innerWidth()-35});
		} else {
			$('#voiceBtn').hide();
		}
*/
	};
	function showErrorAlert (reason, detail) {
		var msg='';
		if (reason==='unsupported-file-type') { msg = "Unsupported format " +detail; }
		else {
			console.log("error uploading file", reason, detail);
		}
		$('<div class="alert"> <button type="button" class="close" data-dismiss="alert">&times;</button>'+ 
		 '<strong>File upload error</strong> '+msg+' </div>').prependTo('#alerts');
	};
	initToolbarBootstrapBindings();
	$('.editable').wysiwyg({ fileUploadError: showErrorAlert} ).on('change', function(){
	});
	$('.editable-textarea').each(function(){
		var t = jQuery(this);
		if(t.data('target')){
			var editor = jQuery(t.data('target'));
			if(editor){
				editor.html(t.text());
				editor.on('input', function(){
					t.html(editor.cleanHtml());
				});
				t.hide();
			}
		}
	});
	
	/* Confess Page Refresh Button */
	jQuery(document).on('click', 'a[href="/confess/random"]', function(){
		jQuery(this).closest('div.confession.white-card').empty().load('/confess/random');
		return false;
	});

	/* Enroll page; confirm unenrolling */
	jQuery(document).on('click', 'a[href^="/experimonths/unenroll/"]', function(){
		return confirm('Are you sure you want to un-enroll from this Experimonth?');
	});
	
	/* BootBox */
	jQuery(document).on('click', 'a[data-bootbox-confirm]', function(){
		var t = jQuery(this)
		  , href = t.attr('href');
		bootbox.confirm(t.data('bootbox-confirm'), function(confirmed){
			if(confirmed){
				document.location = href;
			}
		});
		return false;
	});
	jQuery(document).on('click', 'a[data-bootbox-alert]', function(){
		var t = jQuery(this);
		bootbox.alert(t.data('bootbox-alert'));
		return false;
	});
	jQuery(document).on('click', 'a[data-bootbox-custom]', function(){
		var t = jQuery(this)
		  , actionButton = t.data('bootbox-custom-action-button')
		  , actionHref = t.data('bootbox-custom-action')
		  , closeButton = t.data('bootbox-custom-close-button');
		if(!actionButton){
			actionButton = 'OK';
		}
		if(!closeButton){
			closeButton = 'Close';
		}
		bootbox.confirm(t.data('bootbox-custom'), closeButton, actionButton, function(result){
			if(result && actionHref){
				document.location = actionHref;
			}
		});
		return false;
	});
});

(function() {

  $(function() {
    $('.tooltip-examples a, .tooltip-paragraph-examples a').tooltip({
      animation: false
    });
    $('.top-sign-in').on("click", function(e) {
      $('.login-box').fadeIn("fast");
      return false;
    });
    $('.login-box-close').on("click", function(e) {
      $(this).closest(".login-box").fadeOut("fast");
      return false;
    });
/*     prettyPrint(); */
    $(".slider-browser-center").animate({
      bottom: $(".slider-browser-center").data('position-bottom')
    }, "fast", function() {
      return $(".slider-browser-left").animate({
        bottom: $(".slider-browser-left").data('position-bottom')
      }, "fast", function() {
        return $(".slider-browser-right").animate({
          bottom: $(".slider-browser-right").data('position-bottom')
        }, "fast");
      });
    });
    $('.carousel').carousel({
      interval: false
    });
    return $('a[data-toggle="testimonial"]').on("click", function(e) {
      $(this).closest('.testimonials-users').find('a[data-toggle="testimonial"]').removeClass("active");
      $(this).addClass("active");
      $('.testimonials-speech').removeClass('active');
      $('.testimonials-speech' + $(this).attr('href')).addClass('active');
      return false;
    });
  });
  $("body").on("touchstart.dropdown", ".dropdown-menu", function(e) {
    return e.stopPropagation();
  });
  return $(document).on("click", ".dropdown-menu a", function() {
    return document.location = $(this).attr("href");
  });
}).call(this);