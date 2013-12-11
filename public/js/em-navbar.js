(function(){
var is_active_nav = function(nav){
	if(nav && nav.length){
		for(var i=0, ii = nav.length; i < ii; i++){
			var n = nav[i];
			if(n.link == document.location.toString()){
				return true;
			}
			if(n.children && is_active_nav(n.children)){
				return true;
			}
		}
	}
	return false;
};

var do_nav = function(nav){
	var toReturn = '';
	jQuery.each(nav, function(index, n){
		if(n.header){
			toReturn += '<li class="nav-header">'+n.header+'</li>';
		}else if(n.children){
			//- Look ahead to determine if this link is active
			toReturn += '<li class="dropdown'+(n.link == document.location.toString() || is_active_nav(n.children) ? ' active' : '')+'"> \
				<a class="dropdown-toggle" href="'+n.link+'" data-toggle="em-dropdown">'+n.name+' <i class="icon-caret-down" /></a><ul class="dropdown-menu">'+do_nav(n.children)+'</ul></li>';
		}else{
			toReturn += '<li class="'+(n.link == document.location.toString() ? 'active' : '')+'"><a href="'+n.link+'" class="'+(n.class ? n.class : '')+'">'+n.name+'</a></li>';
		}
	});
	return toReturn;
};

var em_navbar = function(){
	if(typeof EM_NAV === 'undefined' || !EM_NAV){
		if(EM_DEFAULT_NAV){
			EM_NAV = EM_DEFAULT_NAV;
		}else{
			EM_NAV = [];
		}
	}
	if(typeof EM_RIGHT_NAV === 'undefined' || !EM_RIGHT_NAV){
		EM_RIGHT_NAV = [];
	}
	
	var toInsert = '<div class="em-navbar-wrapper"><div class="navbar navbar-fixed-top"> \
				<div class="navbar-inner"> \
					<div class="container"> \
						<a class="btn btn-navbar" data-toggle="collapse" data-target=".nav-collapse"> \
							<span class="icon-bar"></span> \
							<span class="icon-bar"></span> \
							<span class="icon-bar"></span> \
						</a> \
						<a class="brand" href="'+EM_URL+'/">Experimonth</a> \
						<div class="nav-collapse">';
	if(EM_NAV && EM_NAV.length){
		toInsert += '<ul class="nav">'+do_nav(EM_NAV)+'</ul>';
	}
	if(EM_RIGHT_NAV && EM_RIGHT_NAV.length){
		toInsert += '<ul class="nav pull-right">'+do_nav(EM_RIGHT_NAV)+'</ul>';
	}
	// TODO: If user(0)!
	if(false){
		toInsert += '<ul class="nav pull-right"> \
						<li class="dropdown">';
		// TODO: Notifications!
/* 		if(locals.notifications && locals.notifications.length > 0){ */
		if(false){
			toInsert += '<a href="#"><span class="badge badge-info">'+notifications.length+'</span></a>';
		}else{
			toInsert += '<a href="/profile"><span class="badge badge-info">0</span></a>';
		}
		toInsert += '</li></ul>';
	}
	toInsert += '</div></div></div></div>';
	jQuery(document.body).prepend(toInsert);
}
em_navbar();
})();
												
/* ============================================================
 * bootstrap-dropdown.js v2.3.2
 * http://twitter.github.com/bootstrap/javascript.html#dropdowns
 * ============================================================
 * Copyright 2012 Twitter, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ============================================================ */


!function ($) {

  "use strict"; // jshint ;_;


 /* DROPDOWN CLASS DEFINITION
  * ========================= */

  var toggle = '.em-navbar-wrapper [data-toggle=em-dropdown]'
    , Dropdown = function (element) {
        var $el = $(element).on('click.em-dropdown.data-api', this.toggle)
        $('html').on('click.em-dropdown.data-api', function () {
          $el.parent().removeClass('open')
        })
      }

  Dropdown.prototype = {

    constructor: Dropdown

  , toggle: function (e) {
      var $this = $(this)
        , $parent
        , isActive

      if ($this.is('.disabled, :disabled')) return

      $parent = getParent($this)

      isActive = $parent.hasClass('open')

      clearMenus()

      if (!isActive) {
        if ('ontouchstart' in document.documentElement) {
          // if mobile we we use a backdrop because click events don't delegate
          $('<div class="dropdown-backdrop"/>').insertBefore($(this)).on('click', clearMenus)
        }
        $parent.toggleClass('open')
      }

      $this.focus()

      return false
    }

  , keydown: function (e) {
      var $this
        , $items
        , $active
        , $parent
        , isActive
        , index

      if (!/(38|40|27)/.test(e.keyCode)) return

      $this = $(this)

      e.preventDefault()
      e.stopPropagation()

      if ($this.is('.disabled, :disabled')) return

      $parent = getParent($this)

      isActive = $parent.hasClass('open')

      if (!isActive || (isActive && e.keyCode == 27)) {
        if (e.which == 27) $parent.find(toggle).focus()
        return $this.click()
      }

      $items = $('[role=menu] li:not(.divider):visible a', $parent)

      if (!$items.length) return

      index = $items.index($items.filter(':focus'))

      if (e.keyCode == 38 && index > 0) index--                                        // up
      if (e.keyCode == 40 && index < $items.length - 1) index++                        // down
      if (!~index) index = 0

      $items
        .eq(index)
        .focus()
    }

  }

  function clearMenus() {
    $('.dropdown-backdrop').remove()
    $(toggle).each(function () {
      getParent($(this)).removeClass('open')
    })
  }

  function getParent($this) {
    var selector = $this.attr('data-target')
      , $parent

    if (!selector) {
      selector = $this.attr('href')
      selector = selector && /#/.test(selector) && selector.replace(/.*(?=#[^\s]*$)/, '') //strip for ie7
    }

    $parent = selector && $(selector)

    if (!$parent || !$parent.length) $parent = $this.parent()

    return $parent
  }


  /* DROPDOWN PLUGIN DEFINITION
   * ========================== */

  var old = $.fn.emDropdown

  $.fn.emDropdown = function (option) {
    return this.each(function () {
      var $this = $(this)
        , data = $this.data('dropdown')
      if (!data) $this.data('dropdown', (data = new Dropdown(this)))
      if (typeof option == 'string') data[option].call($this)
    })
  }

  $.fn.emDropdown.Constructor = Dropdown


 /* DROPDOWN NO CONFLICT
  * ==================== */

  $.fn.emDropdown.noConflict = function () {
    $.fn.emDropdown = old
    return this
  }


  /* APPLY TO STANDARD DROPDOWN ELEMENTS
   * =================================== */

  $(document)
    .on('click.em-dropdown.data-api', clearMenus)
    .on('click.em-dropdown.data-api', '.em-navbar-wrapper .dropdown form', function (e) { e.stopPropagation() })
    .on('click.em-dropdown.data-api'  , toggle, Dropdown.prototype.toggle)
    .on('keydown.em-dropdown.data-api', toggle + ', [role=menu]' , Dropdown.prototype.keydown)

}(window.jQuery);
