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

	jQuery('.datepicker').datetimepicker({
		pickTime: false
	});
});