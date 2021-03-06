(function ($) {
// START jQuery

Drupal.behaviors.views_autorefresh = {
  attach: function(context, settings) {
    if (Drupal.settings && Drupal.settings.views && Drupal.settings.views.ajaxViews) {
      var ajax_path = Drupal.settings.views.ajax_path;
      // If there are multiple views this might've ended up showing up multiple times.
      if (ajax_path.constructor.toString().indexOf("Array") != -1) {
        ajax_path = ajax_path[0];
      }
      $.each(Drupal.settings.views.ajaxViews, function(i, settings) {
        var view = '.view-dom-id-' + settings.view_dom_id;
        if (!$(view).size()) {
          // Backward compatibility: if 'views-view.tpl.php' is old and doesn't
          // contain the 'view-dom-id-#' class, we fall back to the old way of
          // locating the view:
          view = '.view-id-' + settings.view_name + '.view-display-id-' + settings.view_display_id;
        }
        $(view).filter(':not(.views-autorefresh-processed)')
          // Don't attach to nested views. Doing so would attach multiple behaviors
          // to a given element.
          .filter(function() {
            // If there is at least one parent with a view class, this view
            // is nested (e.g., an attachment). Bail.
            return !$(this).parents('.view').size();
          })
          .each(function() {
            // Set a reference that will work in subsequent calls.
            var target = this;
            $(this)
              .addClass('views-autorefresh-processed')
              // Process pager, tablesort, and attachment summary links.
              .find('.auto-refresh a')
              .each(function () {
                var viewData = { 'js': 1 };
                // Construct an object using the settings defaults and then overriding
                // with data specific to the link.
                $.extend(
                  viewData,
                  Drupal.Views.parseQueryString($(this).attr('href')),
                  // Extract argument data from the URL.
                  Drupal.Views.parseViewArgs($(this).attr('href'), settings.view_base_path),
                  // Settings must be used last to avoid sending url aliases to the server.
                  settings
                );
                
                $.extend(viewData, Drupal.Views.parseViewArgs($(this).attr('href'), settings.view_base_path));
                $(this).addClass('views-throbbing');
                var base = view;
                var element_settings = {};
                element_settings.url = ajax_path;
                element_settings.event = 'click';
                element_settings.selector = base;
                element_settings.submit = viewData;
                  
                var ajax = new Drupal.ajax(base, this, element_settings);
                
                // Make a copy of the old function so we can still call it:
                ajax.old_success = ajax.success;
                
                // Now replace it with our own.
                ajax.success = function (response, status) {
                  // Scroll to the top of the view. This will allow users
                  // to browse newly loaded content after e.g. clicking a pager
                  // link.
                  var offset = $(target).offset();
                  // We can't guarantee that the scrollable object should be
                  // the body, as the view could be embedded in something
                  // more complex such as a modal popup. Recurse up the DOM
                  // and scroll the first element that has a non-zero top.
                  var scrollTarget = target;
                  while ($(scrollTarget).scrollTop() == 0 && $(scrollTarget).parent()) {
                    scrollTarget = $(scrollTarget).parent()
                  }
                  // Only scroll upward
                  if (offset.top - 10 < $(scrollTarget).scrollTop()) {
                    $(scrollTarget).animate({scrollTop: (offset.top - 10)}, 500);
                  }
                  this.old_success(response, status);
                }
                
                Drupal.ajax[base] = ajax;
                
              }); // .each function () {
        }); // $view.filter().each
      });

      // Set the autorefresh timer.
      var timer = setTimeout('autorefresh()', Drupal.settings.views_autorefresh.interval);
      autorefresh = function() {
        $(".auto-refresh a").click();
        clearTimer(timer);
      }
    }
  }
}

// END jQuery
})(jQuery);