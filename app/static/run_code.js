jQuery.ajaxSetup({ cache : false });
window.file = '';
window.path = '';
window.collection_id = 0;
window.uuid = '';
window.last_code_keystroke = 0;
window.last_save = 0;

function calculate(action, stdin) {
  if (window.last_code_keystroke > window.last_save) {
    if (!$("#save_info").text().length) {
      // No save in progress.  Start one and ensure no future saves run on this file.
      window.last_code_keystroke = (new Date()).getTime();
      save();
    }
    // Wait for save to complete
    setTimeout(function() { calculate(action, stdin); }, 500);
    return;
  }
  $("#result").html("<pre>\n\n</pre>");
  if (window.file.length === 0 && window.path.length === 0) {
    alert('No file selected, please select a file');
    return false;
  }
  $.getJSON(window.BASE_URL + '/_run_code', {code: "", path: window.path, action: action, file: window.file, collection_id : window.collection_id, args: $("#"+action.toLowerCase()+"args").val()}, 
      function(data) { 
        document.getElementById("result").style.visibility="visible";
        document.getElementById("loader").style.display = 'block';
        if (stdin) {
          document.getElementById("stdin").style.display = 'block';
          $("#stdin").focus();
          $("#stdin").val("");
        }
        window.uuid = data.result;
        update_result();
    });
  return false;
}

function help(action) {
  $("#result").html("<pre>\n\n</pre>");
  document.getElementById("result").style.visibility="visible";
  $.getJSON(window.BASE_URL + '/_run_code', {action: action, collection_id : -1}, 
      function(data) { 
        document.getElementById("loader").style.display = 'block';
        window.uuid = data.result;
        update_result();
    });
  return false;
}

function update_result() {
  $.getJSON(window.BASE_URL + '/_update_result/' + window.uuid, {}, 
      function(data) {
        if (data.result.length !== 0)
        {
          if ($("#result").html() !== data.result) {
            $("#result").html(data.result);
            $.scrollTo(document.getElementById("stdin"));
          }
          if (data.done) {
            document.getElementById("loader").style.display = 'none';
            document.getElementById("stdin").style.display = 'none';
            update_file_browser();            
          }
          else {
           window.setTimeout(update_result, 1500);
          }
        }
        else {  
           window.setTimeout(update_result, 1500);
        }
      }
    );
}

function kill() {
  if (window.uuid.length) {
    document.getElementById("loader").style.display = 'none';
    document.getElementById("stdin").style.display = 'none';
    document.getElementById("result").style.visibility = 'hidden';
    document.getElementById("meta").style.display = 'none';
    window.uuid = '';
  }
}

function save() {
  $("#save_info").text('Save in progress...');
  $.getJSON(window.BASE_URL + '/_save_file', {code: $('textarea[name="code"]').val(), file: window.file, path: window.path, collection_id: window.collection_id}, 
    function(data) {
      $("#save_info").text('Saved.');
      window.last_save = (new Date()).getTime();
      update_file_browser();
    }
    );
  return false;
}

function download_file(file, path, collection_id) {
  var file_url = window.BASE_URL + "/_download_file?file=" + urlencode(file) + "&collection_id=" + urlencode(collection_id) + "&path=" + urlencode(path);
  window.location.assign(file_url);
  return false;
}

// Both arguments are str
function load_file(file, path, collection_id) {
  if (window.last_code_keystroke > window.last_save) {
    save();
  }
  $.support.cors = true;
  if (get_file_extension(file) === "pdf") {
    return download_file(file, path, collection_id);
  }
  $("#code_input").val("Loading...");
  $.getJSON(window.BASE_URL + '/_load_file', {file: file, path: path, collection_id: collection_id}, 
    function(data) {
      $("#code_input").val(data.result);
      $("#code_input").triggerHandler("focus");
      $("#path").text(path + file);
      window.file = file;
      window.path = path;
      window.collection_id = collection_id;
      if (data.meta.length !== 0) {
        document.getElementById("meta").style.display="block";
        if (data.meta !== $("#metadata").html()) {
          $("#metadata").html(data.meta);
        }
      }
      else {
        document.getElementById("meta").style.display="none";
      }
    }
    );
  return false;
}

function upload_file(file, path, collection_id) {
    $("input[name='collection']").val(collection_id);
    $("input[name='path']").val(path + file);   
    document.getElementById("upload_form").style.display = 'block'; 
}

function restore_file(file, path, collection_id) {
  $.getJSON(window.BASE_URL + '/_restore_file', {file: file, path: path, collection_id: collection_id, tool: window.tool}, 
    function(data) {
      if (data.success) {
        if (window.file.length) {
          load_file(window.file, window.path, window.collection_id);
        }
        alert("Successfully restored " + file + ".");
        update_file_browser();
      }
      else {
        alert("Failed to restore " + file + ", no original found.");
      }
    }
    );
}

function delete_file(file, path, collection_id) {
  if (confirm("Delete file " + file + "?  This cannot be undone!")) {
    $.getJSON(window.BASE_URL + '/_delete_file', {file: file, path: path, collection_id: collection_id}, 
      function(data) {
        update_file_browser();
      }
      );
    }
  return false;
}

function create(file, path, collection_id, directory_or_file) {
  var file_name = prompt("Name of " + directory_or_file + " to create in " + file + ": ","");
  $.getJSON(window.BASE_URL + '/_create_' + directory_or_file, {file: file, path: path, collection_id: collection_id, file_name: file_name}, 
    function(data) {
      update_file_browser();
    }
  );   
  return false;
}

function create_file(file, path, collection_id) {
  create(file, path, collection_id, "file");
}

function create_directory(file, path, collection_id) {
  create(file, path, collection_id, "directory");
}

function delete_directory(file, path, collection_id) {
  if (confirm("Delete directory " + file + "?  This cannot be undone!")) {
    $.getJSON(window.BASE_URL + '/_delete_directory', {file: file, path: path, collection_id: collection_id}, 
      function(data) {
        update_file_browser();
      }
      );
    }
  return false;
}

function toggle_metadata() {
  if (document.getElementById("metadata").style.display == 'none') {
    document.getElementById("metadata").style.display = 'block';
    $("#hide").text("Hide Metadata");
  }
  else  {
    document.getElementById("metadata").style.display = 'none';
    $("#hide").text("Show Metadata");
  }
  return false;
}

function update_file_browser() {
    var selected_elements = new Array(); 
    jQuery.each($(":checkbox"), function() {
      if (this.checked) {
        selected_elements.push(this.id);
      }
    });
    var file_url = window.BASE_URL + "/_file_browser/" + window.tool + '?hidden=' + window.hidden;
    if (window.open_path.length > 0) {
      file_url = file_url + '&open_path=' + window.open_path;
    }
    $.get(file_url, function (data) {
      var scroll_top = $("#file_browser").scrollTop();
      $("#file_browser").html(data);
      show_controls_if_touch_device();
      for (var i = 0; i < selected_elements.length; i++) {
        var curr_elem = document.getElementById(selected_elements[i]);
        if (!curr_elem.checked) {
            curr_elem.click();
        }
      }
      if ($("#file_browser").scrollTop() === 0) {
        $("#file_browser").scrollTop(scroll_top);
      }
    });
}

function update_stdin(e)
{
    if (window.uuid && e && e.keyCode == 13) {
      $.get(window.BASE_URL + '/_update_stdin/' + window.uuid, {stdin: $("#stdin").val()}, function (data) {
        if (data.success) {
          $("#stdin").val("");
        }
        else {
          alert(data.error);
        }
      });
   }
}

function update_code()
{
  if (!window.collection_id) {
    // No file open
    return;
  }
  $("#save_info").text("");
  window.last_code_keystroke = (new Date()).getTime();
  window.setTimeout(save_if_idle, 2000);
}

function save_if_idle()
{
  if ((new Date()).getTime() - window.last_code_keystroke > 1900) {
    save();
  }
}

function autoload() {
  $("#code_input").linenumbers({col_width: '50px', col_height: '330px'});
  $("body").click(function() { clear_dropdowns(); });
  $("#code_input").bind("input propertychange", update_code);
  $.support.cors = true;
  if (window.autoload.length) {
    document.getElementById(window.autoload).click();
  }
  show_controls_if_touch_device();
}

function jqSelector(str) {
  return str.replace(/([;&,\.\+\*\~':"\!\^#$%@\[\]\(\)=>\|])/g, '\\$1');
}

function urlencode (str) {
  // http://kevin.vanzonneveld.net
  // +   original by: Philip Peterson
  // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  // +      input by: AJ
  // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  // +   improved by: Brett Zamir (http://brett-zamir.me)
  // +   bugfixed by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  // +      input by: travc
  // +      input by: Brett Zamir (http://brett-zamir.me)
  // +   bugfixed by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  // +   improved by: Lars Fischer
  // +      input by: Ratheous
  // +      reimplemented by: Brett Zamir (http://brett-zamir.me)
  // +   bugfixed by: Joris
  // +      reimplemented by: Brett Zamir (http://brett-zamir.me)
  // %          note 1: This reflects PHP 5.3/6.0+ behavior
  // %        note 2: Please be aware that this function expects to encode into UTF-8 encoded strings, as found on
  // %        note 2: pages served as UTF-8
  // *     example 1: urlencode('Kevin van Zonneveld!');
  // *     returns 1: 'Kevin+van+Zonneveld%21'
  // *     example 2: urlencode('http://kevin.vanzonneveld.net/');
  // *     returns 2: 'http%3A%2F%2Fkevin.vanzonneveld.net%2F'
  // *     example 3: urlencode('http://www.google.nl/search?q=php.js&ie=utf-8&oe=utf-8&aq=t&rls=com.ubuntu:en-US:unofficial&client=firefox-a');
  // *     returns 3: 'http%3A%2F%2Fwww.google.nl%2Fsearch%3Fq%3Dphp.js%26ie%3Dutf-8%26oe%3Dutf-8%26aq%3Dt%26rls%3Dcom.ubuntu%3Aen-US%3Aunofficial%26client%3Dfirefox-a'
  str = (str + '').toString();

  // Tilde should be allowed unescaped in future versions of PHP (as reflected below), but if you want to reflect current
  // PHP behavior, you would need to add ".replace(/~/g, '%7E');" to the following.
  return encodeURIComponent(str).replace(/!/g, '%21').replace(/'/g, '%27').replace(/\(/g, '%28').
  replace(/\)/g, '%29').replace(/\*/g, '%2A').replace(/%20/g, '+');
}

// http://stackoverflow.com/questions/190852/how-can-i-get-file-extensions-with-javascript
function get_file_extension(fname) {
   return fname.substr((~-fname.lastIndexOf(".") >>> 0) + 2);
}

function show_touch_controls() {
  $(".icon-list").each(function(index) {
    this.style.display = "block";
  });
  document.getElementById("right_click").style.display = "none";
}

// Stackoverflow (Source unknown)
function is_touch_device() {
  return  (('ontouchstart' in window) || (navigator.msMaxTouchPoints > 0));
}

function show_controls_if_touch_device() {
  if (is_touch_device()) {
    show_touch_controls();
  }
}