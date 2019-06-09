/* Add your JavaScript code here.

If you are using the jQuery library, then don't forget to wrap your code inside jQuery.ready() as follows:

jQuery(document).ready(function( $ ){
    // Your code in here
});

--

If you want to link a JavaScript file that resides on another server (similar to
<script src="https://example.com/your-js-file.js"></script>), then please use
the "Add HTML Code" page, as this is a HTML code that links a JavaScript file.

End of comment */ 

// -----------------------------------------
// Starting point for all Defaults code
// -----------------------------------------

const maxNumberOfThumbnails = 10;
const maxNumberOfPlaylists = 15;
const maxNumberOfComments = 45;
const maxNumberOfSignatures = 10;
const maxNumberOfTags = 100;

var globalJQuery = null;
var settingsOverview = null;
var gamePlaylistsCombo = [];
var gameCommentsCombo = [];
var gameDescriptionsCombo = [];
var gameTagsCombo = [];
var gameThumbnailsCombo = [];
var videoTagsList = [];
var definedCategory = "20";
var definedLanguage = "en";

// Count not deleted
function countNotDeleted(arr) {
  var count = 0;
  for (var i = 0; i < arr.length; i++) {
    if (arr[i].userDeleted == false) {
      count++;
    }
  }
  return count;
}

// Toggles an input on an off
function toggleInputHelper($, arr, id, amount) {
  if (countNotDeleted(arr) >= amount) {
    $("#" + id).prop('disabled', true);
  } else {
    $("#" + id).prop('disabled', false);
  }
}

// Toggles <a> tag on and off
function toggleBtnHelper($, arr, id, amount) {
  if (countNotDeleted(arr) >= amount) {
    $("#" + id).addClass("a-tag-disabled");
  } else {
    $("#" + id).removeClass("a-tag-disabled");
  }
}

// Toggles the thumbnails btn to disabled if needed
function toggleThumbnailsBtnDisable($) {
  toggleInputHelper($, gameThumbnailsCombo, "upload-thumbnail-btn", maxNumberOfThumbnails);
}

// Toggles the playlists btn to disabled if needed
function togglePlaylistsBtnDisable($) {
  toggleBtnHelper($, gamePlaylistsCombo, "add-playlist", maxNumberOfPlaylists);
}

// Toggles the playlists btn to disabled if needed
function toggleCommentsBtnDisable($) {
  toggleBtnHelper($, gameCommentsCombo, "add-comment", maxNumberOfComments);
}

// Toggles the playlists btn to disabled if needed
function toggleSignatureBtnDisable($) {
  toggleBtnHelper($, gameDescriptionsCombo, "add-description", maxNumberOfSignatures);
}

// Toggles the playlists btn to disabled if needed
function toggleTagBtnDisable($) {
  toggleBtnHelper($, gameTagsCombo, "add-tag", maxNumberOfTags);
}

// Returns an array of key value pairs of languages.
function getLanguages(){
  return[{key:"af",value:"Afrikaans"},{key:"az",value:"Azerbaijani"},{key:"id",value:"Indonesian"},{key:"ms",value:"Malay"},{key:"bs",value:"Bosnian"},{key:"ca",value:"Catalan"},{key:"cs",value:"Czech"},{key:"da",value:"Danish"},{key:"de",value:"German"},{key:"et",value:"Estonian"},{key:"en-GB",value:"English (United Kingdom)"},{key:"en",value:"English"},{key:"es",value:"Spanish (Spain)"},{key:"es-419",value:"Spanish (Latin America)"},{key:"es-US",value:"Spanish (United States)"},{key:"eu",value:"Basque"},{key:"fil",value:"Filipino"},{key:"fr",value:"French"},{key:"fr-CA",value:"French (Canada)"},{key:"gl",value:"Galician"},{key:"hr",value:"Croatian"},{key:"zu",value:"Zulu"},{key:"is",value:"Icelandic"},{key:"it",value:"Italian"},{key:"sw",value:"Swahili"},{key:"lv",value:"Latvian"},{key:"lt",value:"Lithuanian"},{key:"hu",value:"Hungarian"},{key:"nl",value:"Dutch"},{key:"no",value:"Norwegian"},{key:"uz",value:"Uzbek"},{key:"pl",value:"Polish"},{key:"pt-PT",value:"Portuguese (Portugal)"},{key:"pt",value:"Portuguese (Brazil)"},{key:"ro",value:"Romanian"},{key:"sq",value:"Albanian"},{key:"sk",value:"Slovak"},{key:"sl",value:"Slovenian"},{key:"sr-Latn",value:"Serbian (Latin)"},{key:"fi",value:"Finnish"},{key:"sv",value:"Swedish"},{key:"vi",value:"Vietnamese"},{key:"tr",value:"Turkish"},{key:"be",value:"Belarusian"},{key:"bg",value:"Bulgarian"},{key:"ky",value:"Kyrgyz"},{key:"kk",value:"Kazakh"},{key:"mk",value:"Macedonian"},{key:"mn",value:"Mongolian"},{key:"ru",value:"Russian"},{key:"sr",value:"Serbian"},{key:"uk",value:"Ukrainian"},{key:"el",value:"Greek"},{key:"hy",value:"Armenian"},{key:"iw",value:"Hebrew"},{key:"ur",value:"Urdu"},{key:"ar",value:"Arabic"},{key:"fa",value:"Persian"},{key:"ne",value:"Nepali"},{key:"mr",value:"Marathi"},{key:"hi",value:"Hindi"},{key:"bn",value:"Bangla"},{key:"pa",value:"Punjabi"},{key:"gu",value:"Gujarati"},{key:"ta",value:"Tamil"},{key:"te",value:"Telugu"},{key:"kn",value:"Kannada"},{key:"ml",value:"Malayalam"},{key:"si",value:"Sinhala"},{key:"th",value:"Thai"},{key:"lo",value:"Lao"},{key:"my",value:"Myanmar (Burmese)"},{key:"ka",value:"Georgian"},{key:"am",value:"Amharic"},{key:"km",value:"Khmer"},{key:"zh-CN",value:"Chinese"},{key:"zh-TW",value:"Chinese (Taiwan)"},{key:"zh-HK",value:"Chinese (Hong Kong)"},{key:"ja",value:"Japanese"},{key:"ko",value:"Korean"}]
}

function getLanguageMap() {
  var result = getLanguages().reduce(function(map, obj) {
    map[obj.key] = obj.value;
    return map;
  }, {});

  return result;
}

// Returns a list of valid categories
function validCategories() {
    var categories = new Map([
      [2, "Autos & Vehicles"],
      [1, "Film & Animation"],
      [10, "Music"],
      [15, "Pets & Animals"],
      [17, "Sports"],
      [18, "Short Movies"],
      [19, "Travel & Events"],
      [20, "Gaming"],
      [21, "Videoblogging"],
      [22, "People & Blogs"],
      [23, "Comedy"],
      [24, "Entertainment"],
      [25, "News & Politics"],
      [26, "Howto & Style"],
      [27, "Education"],
      [28, "Science & Technology"],
      [29, "Nonprofits & Activism"],
      [30, "Movies"],
      [31, "Anime/Animation"],
      [32, "Action/Adventure"],
      [33, "Classics"],
      [34, "Comedy"],
      [35, "Documentary"],
      [36, "Drama"],
      [37, "Family"],
      [38, "Foreign"],
      [39, "Horror"],
      [40, "Sci-Fi/Fantasy"],
      [41, "Thriller"],
      [42, "Shorts"],
      [43, "Shows"],
      [44, "Trailers"]
    ]);

    return categories;
}

// Function to be called from frontend, to handle deleting a setting
function deleteAddedSetting(name, index) {
  var canAuth = (theUser.username != "" && theUser.id != 0 && theUser.email != "" && theUser.unique_identifier != "");
  var arr = null;
  
  switch (name) {
    case "playlist":
      arr = gamePlaylistsCombo;
      var elem = document.getElementById(name + "-" + index);
      elem.parentNode.removeChild(elem);
      arr[parseInt(index)].userDeleted = true;
      var gameName = elem.cells[0].innerHTML;
      var playlistID = elem.cells[1].innerHTML;
      var deleteArr = [{gameName: gameName, playlistID: playlistID}];
      if (globalJQuery && canAuth) {
        updateSetting(globalJQuery, theUser.username, theUser.id, theUser.email, theUser.unique_identifier, "remove-game-playlists", JSON.stringify(deleteArr));
        var currentCount = globalJQuery("#playlists-count-value").text();
        globalJQuery("#playlists-count-value").text(parseInt(currentCount) - 1);
        togglePlaylistsBtnDisable(globalJQuery);
      } else {
        break;
      }
      return;
    case "comment":
      arr = gameCommentsCombo;
      var elem = document.getElementById(name + "-" + index);
      elem.parentNode.removeChild(elem);
      arr[parseInt(index)].userDeleted = true;
      var gameName = elem.cells[0].innerHTML;
      var comment = elem.cells[1].innerHTML;
      var deleteArr = [{gameName: gameName, comment: comment}];
      if (globalJQuery && canAuth) {
        updateSetting(globalJQuery, theUser.username, theUser.id, theUser.email, theUser.unique_identifier, "remove-default-comments", JSON.stringify(deleteArr));
        var currentCount = globalJQuery("#comments-count-value").text();
        globalJQuery("#comments-count-value").text(parseInt(currentCount) - 1);
        toggleCommentsBtnDisable(globalJQuery);
      } else {
        break;
      }
      return;
    case "description":
      arr = gameDescriptionsCombo;
      var elem = document.getElementById(name + "-" + index);
      elem.parentNode.removeChild(elem);
      arr[parseInt(index)].userDeleted = true;
      var gameName = elem.cells[0].innerHTML;
      var signature = elem.cells[1].innerHTML;

      var deleteArr = [{gameName: gameName, signature: signature}];
      if (globalJQuery && canAuth) {
        updateSetting(globalJQuery, theUser.username, theUser.id, theUser.email, theUser.unique_identifier, "remove-default-signature", JSON.stringify(deleteArr));
        var currentCount = globalJQuery("#description-count-value").text();
        globalJQuery("#description-count-value").text(parseInt(currentCount) - 1);
        toggleSignatureBtnDisable(globalJQuery);
      } else {
        break;
      }
      return;
    case "tag":
      arr = gameTagsCombo;
      var elem = document.getElementById(name + "-" + index);
      elem.parentNode.removeChild(elem);
      arr[parseInt(index)].userDeleted = true;
      var gameName = elem.cells[0].innerHTML;
      var tag = elem.cells[1].innerHTML;

      var deleteArr = [{gameName: gameName, tag: tag}];
      if (globalJQuery && canAuth) {
        updateSetting(globalJQuery, theUser.username, theUser.id, theUser.email, theUser.unique_identifier, "remove-default-tags", JSON.stringify(deleteArr));
        var currentCount = globalJQuery("#tags-count-value").text();
        globalJQuery("#tags-count-value").text(parseInt(currentCount) - 1);
        toggleTagBtnDisable(globalJQuery);
      } else {
        break;
      }
      return;
      break;
    case "thumbnail":
      arr = gameThumbnailsCombo;

      // Try to delete it right away
      var elem = document.getElementById(name + "-" + index);
      elem.parentNode.removeChild(elem);
      arr.splice(parseInt(index), 1);
      var gameName = elem.cells[0].innerHTML;
      var fileName = elem.cells[1].innerHTML;

      // Remove everything upto the /uploads part of the html
      var fileNameSplit = fileName.split("https");
      fileName = "https" + fileNameSplit[fileNameSplit.length - 1];

      // Remove the last two character '">'
      fileName = fileName.substring(0, fileName.length - 2);

      var deleteArr = [{gameName: gameName, image: fileName}];
      if (globalJQuery && canAuth) {
        updateSetting(globalJQuery, theUser.username, theUser.id, theUser.email, theUser.unique_identifier, "remove-default-thumbnail", JSON.stringify(deleteArr));
        var currentCount = globalJQuery("#thumbnails-count-value").text();
        globalJQuery("#thumbnails-count-value").text(parseInt(currentCount) - 1);
        toggleThumbnailsBtnDisable(globalJQuery);
      } else { // Can't delete it.
        break;
      }
      return;
    default:
      return;
  }
 }

// draws the playlists that are in the gamePlaylistsCombo box
function drawOptions($, arr, anchor, name) {
  for (var i = 0; i < arr.length; i++) {
    if (!arr[i].drawn) {
      var uniqueName = name + "-" + i;

      var hardSavedIndicator = "<span class=\"hard-saved-indicator\">&#10006;</span>";
      if (arr[i].hardSaved) {
        hardSavedIndicator = "<span class=\"hard-saved-indicator\">&#10003;</span>";
      }

      var gameContent = arr[i].playlistID;
      if (name == "thumbnail") {
        var urlPrefix = "https://twitchautomator.com/wp-content/uploads"; // Switch this to cdn later when automatically uploading to s3
        gameContent = "<img src=\"" + gameContent + "\">";
      }

      $(anchor).append("<tr id=\"" + name + "-" + i + "\"><td class=\"defaults-td\">" + arr[i].gameName + "</td><td class=\"defaults-td\">" + gameContent + "</td><td class=\"defaults-td\"><span class=\"remove-defaults-cross\" style=\"display: inline-block; color: red; font-weight: 700;\" onclick=\"deleteAddedSetting('" + name + "', " + i + ")\">Delete</span></td><td class=\"defaults-td\">" + hardSavedIndicator + "</td></tr>");
      arr[i].drawn = true;
    }
  }
}

// Updates the default values based on what was returned from the backend
function updateDefaultValues($, values) {
  settingsOverview = values;
  $("#min-vid-value").text(values.min_vid_length);
  $("#min-vid-input").val(values.min_vid_length);
  $("#max-vid-value").text(values.max_vid_length);
  $("#max-vid-input").val(values.max_vid_length);
  $("#playlists-count-value").text(values.playlists_count);
  $("#comments-count-value").text(values.comments_count);
  if (values.default_like == "true") {
    $("#like-default-value").text("Yes");
    $("#like-default-input").attr("checked", true);
  } else if (values.default_like == "false") {
    $("#like-default-value").text("No");
    $("#like-default-input").attr("checked", false);
  }
  $("#thumbnails-count-value").text(values.thumbnails_count);
  var categories = validCategories();
  var categorySanitized = categories.get(parseInt(values.default_category));
  if (categorySanitized) {
    $("#category-default-value").text(categorySanitized);
  } else {
    $("#category-default-value").text(values.default_category);
  }
  definedCategory = (values.default_category + "");
  $("#description-count-value").text(values.signatures_count);
  $("#tags-count-value").text(values.tags_count);
  var languages = getLanguageMap();
  var languageSanitized = languages[values.default_language];
  definedLanguage = values.default_language;
  if (languageSanitized) {
    $("#default-language-value").text(languageSanitized);
  } else {
    $("#default-language-value").text(values.default_language);
  }
}

// Tells the backend server about a thumbnail image
function uploadThumbnailToBackendServer($, username, ID, email, pass, thumbnailGame, fileName) {
  var realGameName = atob(thumbnailGame);
  var realFileName = atob(fileName);
  var imageContent = [{gameName: realGameName, image: realFileName}];
  var imageContentStr = JSON.stringify(imageContent);

  $.ajax({
      type: "POST",
      url: autoTuberURL + "user/setting/update",
      data: {
        "username": username,
        "user_id": ID,
        "email": email,
        "password": pass,
        "setting_name": "default-thumbnail",
        "setting_json": imageContentStr
      },
      error: function(xhr,status,error) {
        console.log("Error: ", error);
      },
      success: function(result,status,xhr) {
        if (result.success) {
          console.log("Success uploading image.");
          if (history.pushState) {
              var newurl = window.location.protocol + "//" + window.location.host + window.location.pathname;
              window.history.pushState({path:newurl},'',newurl);
          }

          getAndUpdateThumbnails($, username, ID, email, pass);
        } else {
          console.log("Error uploading image.");
        }
      },
      dataType: "json"
  });
}

// Calls the get popular games endpoint
var alreadyPopulatedGames = false;
function getAndPopulateGames($) {
  if (alreadyPopulatedGames) return;

  $.ajax({
      type: "POST",
      url: autoTuberURL + "game/list",
      data: {},
      error: function(xhr,status,error) {
        console.log("Error: ", error);
      },
      success: function(result,status,xhr) {
        var games = result.games;
        var initialVal = "Fortnite";
        for (var i = 0; i < games.length; i++) {
          if (i == 0) {
            initialVal = games[i];
          }

          $(".game-selector-base").append("<option value=\"" + games[i] + "\">" + games[i] + "</option>");
          $("#ugc-input-select-game").append("<option value=\"" + games[i] + "\">" + games[i] + "</option>");
          $("#ugc-input-select-game-intro-outro").append("<option value=\"" + games[i] + "\">" + games[i] + "</option>");
        }
        $("#ugc-input-select-game").append("<option value=\"other\">Other</option>");
        $(".game-selector-base").append("<option value=\"other\">Other</option>");
        $("#ugc-input-select-game-intro-outro").append("<option value=\"other\">Other</option>");
        $("#ugc-input-select-game").val(initialVal);
        $(".game-selector-base").val(initialVal);
        $("#ugc-input-select-game-intro-outro").val(initialVal);
        alreadyPopulatedGames = true;
      },
      dataType: "json"
  });
}

// Gets some specific setting, and then calls the callback
function getAndUpdateHelper($, username, ID, email, pass, route, cb) {
  $.ajax({
      type: "POST",
      url: autoTuberURL + "user/setting",
      data: {
        "username": username,
        "user_id": ID,
        "email": email,
        "password": pass,
        "scope": route
      },
      error: function(xhr,status,error) {
        console.log("Error: ", error);
      },
      success: function(result,status,xhr) {
        if (result.results == null) return;

        return cb(result);
      },
      dataType: "json"
  });
}

// checks to make sure we don't add duplicates
function contentAlreadyExists(arr, gameName, playlistID) {
  for (var k = 0; k < arr.length; k++) {
    if (arr[k].gameName == gameName && arr[k].playlistID == playlistID) {
      return true;
    }
  }
  return false;
}

// Calls the server for the intro and outro items, and then once returned updates the view
function getAndUpdateIntrosOutros($, username, ID, email, pass) {
  getAndPopulateGames($);
}

// Calls the server for the thumbnail items, and then once returned updates the view
function getAndUpdateThumbnails($, username, ID, email, pass) {
  return getAndUpdateHelper($, username, ID, email, pass, "default-thumbnail", function(result) {
    getAndPopulateGames($);
    for (var i = 0; i < result.results.length; i++) {
      if (contentAlreadyExists(gameThumbnailsCombo, result.results[i].game, result.results[i].image_name)) continue;
      gameThumbnailsCombo.push({gameName: result.results[i].game, playlistID: result.results[i].image_name, drawn: false, hardSaved: true, userDeleted: false});
    }

    if (gameThumbnailsCombo.length == 0) return;
    $("#no-comments-set").hide();

    // Toggle the thumbnails disable button
    toggleThumbnailsBtnDisable($);

    drawOptions($, gameThumbnailsCombo, "#thumbnails-saved-table-body", "thumbnail");
  });
}

// Calls the server for the comment items, and then once returned updates the view
function getAndUpdateCommentsView($, username, ID, email, pass) {
  return getAndUpdateHelper($, username, ID, email, pass, "default-comments", function(result) {
    getAndPopulateGames($);
    for (var i = 0; i < result.results.length; i++) {
      if (contentAlreadyExists(gameCommentsCombo, result.results[i].game, result.results[i].comment)) continue;
      gameCommentsCombo.push({gameName: result.results[i].game, playlistID: result.results[i].comment, drawn: false, hardSaved: true, userDeleted: false});
    }

    if (gameCommentsCombo.length == 0) return;
    $("#no-comments-set").hide();

    toggleCommentsBtnDisable($);

    drawOptions($, gameCommentsCombo, "#comments-saved-table-body", "comment");
  });
}

// Calls the server for the comment items, and then once returned updates the view
function getAndUpdateTagsView($, username, ID, email, pass) {
  return getAndUpdateHelper($, username, ID, email, pass, "default-tags", function(result) {
    getAndPopulateGames($);
    for (var i = 0; i < result.results.length; i++) {
      if (contentAlreadyExists(gameTagsCombo, result.results[i].game, result.results[i].tag)) continue;
      gameTagsCombo.push({gameName: result.results[i].game, playlistID: result.results[i].tag, drawn: false, hardSaved: true, userDeleted: false});
    }

    if (gameTagsCombo.length == 0) return;
    $("#no-tags-set").hide();

    toggleTagBtnDisable($);

    drawOptions($, gameTagsCombo, "#tags-saved-table-body", "tag");
  });
}

// Calls the server for the playlist items, and then once returned updates the view
function getAndUpdatePlaylistView($, username, ID, email, pass) {
  return getAndUpdateHelper($, username, ID, email, pass, "game-playlists", function(result) {
    getAndPopulateGames($);
    for (var i = 0; i < result.results.length; i++) {
      if (contentAlreadyExists(gamePlaylistsCombo, result.results[i].game, result.results[i].playlist_id)) continue;
      gamePlaylistsCombo.push({gameName: result.results[i].game, playlistID: result.results[i].playlist_id, drawn: false, hardSaved: true, userDeleted: false});
    }

    if (gamePlaylistsCombo.length == 0) return;
    $("#no-playlists-set").hide();

    togglePlaylistsBtnDisable($);

    drawOptions($, gamePlaylistsCombo, "#playlists-saved-table-body", "playlist");
  });
}

// Calls the server for the signature items, and then once returned updates the view
function getAndUpdateSignatureView($, username, ID, email, pass) {
  return getAndUpdateHelper($, username, ID, email, pass, "default-signature", function(result) {
    getAndPopulateGames($);
    for (var i = 0; i < result.results.length; i++) {
      if (contentAlreadyExists(gameDescriptionsCombo, result.results[i].game, result.results[i].signature)) continue;
      gameDescriptionsCombo.push({gameName: result.results[i].game, playlistID: result.results[i].signature, drawn: false, hardSaved: true, userDeleted: false});
    }

    if (gameDescriptionsCombo.length == 0) return;
    $("#no-descriptions-set").hide();

    toggleSignatureBtnDisable($);

    drawOptions($, gameDescriptionsCombo, "#signatures-saved-table-body", "description");
  });
}

var updatedCategoriesAlready = false;
function updateCategoriesView($) {
  if (updatedCategoriesAlready) return;

  var categories = validCategories();
  categories.forEach(function(item, key) {
    $("#categories-selector").append("<option value=\"" + key + "\">" + item + "</option>");
  });
  $("#categories-selector").val(definedCategory);
  updatedCategoriesAlready = true;
}

var updatedLanguagesAlready = false;
function updateLanguagesView($) {
  if (updatedLanguagesAlready) return;

  var languages = getLanguages();
  for (var i = 0; i < languages.length; i++) {
    $("#languages-selector").append("<option value=\"" + languages[i].key + "\">" + languages[i].value + "</option>");
  }
  $("#languages-selector").val(definedLanguage);
  updatedLanguagesAlready = true;
}

// Calls to find the default values for this user, and then updates them on the screen.
function toggleDefaultSavedValues($, username, ID, email, pass) {
  $.ajax({
      type: "POST",
      url: autoTuberURL + "user/setting",
      data: {
        "username": username,
        "user_id": ID,
        "email": email,
        "password": pass,
        "scope": "overview"
      },
      error: function(xhr,status,error) {
        console.log("Error: ", error);
      },
      success: function(result,status,xhr) {
        if (result.results != null) {
          updateDefaultValues($, result.results);
        } else {
          console.log("Found no default settings for this user.");
        }
      },
      dataType: "json"
  });
}

// updates a setting in the database
function updateSetting($, username, ID, email, pass, setting, settingJSON) {
  $.ajax({
      type: "POST",
      url: autoTuberURL + "user/setting/update",
      data: {
        "username": username,
        "user_id": ID,
        "email": email,
        "password": pass,
        "setting_name": setting,
        "setting_json": settingJSON
      },
      error: function(xhr,status,error) {
        console.log("Error: ", error);
      },
      success: function(result,status,xhr) {
        console.log("Succesfully updated.");
      },
      dataType: "json"
  });
}

function _handleAllNotifications($, result, username, ID, email, passwordHash) {
  var showNotification = false, showNotification1 = false, showNotification2 = false, showNotification3 = false;
  var showDLNotification = false; var dlContent = {download_id: -1};
  var showNeedClipInfoNotification = false; var needInfoContent = {download_id: -1};
  var showProcessingNotification = false; var processingContent = {download_id: -1};
  var showUploadingNotification = false; var uploadingContent = {download_id: -1};
  var showDoneUploadingNotification = false; var uploadingDoneContent = {download_id: -1, video_url: "https://www.youtube.com"};
  if (result.notifications.length > 0) {
    for (var i = 0; i < result.notifications.length; i++) {
     if (result.notifications[i].notification == "defaults-intro") {
       showNotification = true;
     } else if (result.notifications[i].notification == "account-intro") {
       showNotification1 = true;
     } else if (result.notifications[i].notification == "videos-intro") {
       showNotification2 = true;
     } else if (result.notifications[i].notification == "dashboard-intro") {
       showNotification3 = true;
     } else if (result.notifications[i].notification == "currently-clipping") {
        showDLNotification = true;
        dlContent = JSON.parse(result.notifications[i].content);
     } else if (result.notifications[i].notification == "need-title-or-description") {
        showNeedClipInfoNotification = true;
        needInfoContent = JSON.parse(result.notifications[i].content);
     } else if (result.notifications[i].notification == "currently-processing") {
        showProcessingNotification = true;
        processingContent = JSON.parse(result.notifications[i].content);
     } else if (result.notifications[i].notification == "currently-uploading") {
        showUploadingNotification = true;
        uploadingContent = JSON.parse(result.notifications[i].content);
     } else if (result.notifications[i].notification == "done-uploading") {
        showDoneUploadingNotification = true;
        uploadingDoneContent = JSON.parse(result.notifications[i].content);
     }
    }
  }
  
  // Defaults intro Notification
  if (showNotification) {
    $(".defaults-intro-notification").show();
    $(".close-notification").click(function() {
      closeNotification($, "defaults-intro", username, ID, email, passwordHash); 
    });
  }

  // Account intro Notification
  if (showNotification1) {
    $(".account-notification-container").show();
    $(".close-notification").click(function() {
      closeNotification($, "account-intro", username, ID, email, passwordHash); 
    });
  }

  // Videos intro notification
  if (showNotification2) {
    $(".videos-notification-container").show();
    $(".close-notification").click(function() {
      closeNotification($, "videos-intro", username, ID, email, passwordHash); 
    });
  }

  // Dashboard intro notification
  if (showNotification3) {
    $(".dashboard-into-notification").show();
    $(".close-notification").click(function() {
      closeNotification($, "dashboard-intro", username, ID, email, passwordHash); 
    });
  }

  // Download Action Notification
  if (showDLNotification) {
    $(".currently-clipping-notification").show();
    $("#curr-clipping-action-link").attr("href", ("https://twitchautomator.com/dashboard?clipping=true&download_id=" + dlContent.download_id));
    $(".close-action-notification").click(function() {
      closeNotification($, "currently-clipping", username, ID, email, passwordHash); 
    });
  }

  // Need Clip Info Notification
  if (showNeedClipInfoNotification) {
    $(".clipping-need-info-notification").show();
    $("#clip-needs-info-action-link").attr("href", ("https://twitchautomator.com/dashboard?clipping=true&download_id=" + needInfoContent.download_id));
    $(".close-need-info-notification").click(function() {
      closeNotification($, "need-title-or-description", username, ID, email, passwordHash); 
    });
  }

  // Video processing notification
  if (showProcessingNotification) {
    $(".video-processing-notification").show();
    $("#video-processing-action-link").attr("href", ("https://twitchautomator.com/dashboard?clipping=true&download_id=" + processingContent.download_id));
    $(".close-video-processing-notification").click(function() {
      closeNotification($, "currently-processing", username, ID, email, passwordHash); 
    });
  }

  // Video uploading notification
  if (showUploadingNotification) {
    $(".video-uploading-notification").show();
    $("#video-uploading-action-link").attr("href", ("https://twitchautomator.com/dashboard?clipping=true&download_id=" + uploadingContent.download_id));
    $(".close-video-uploading-notification").click(function() {
      closeNotification($, "currently-uploading", username, ID, email, passwordHash); 
    });
  }

  // Video done uploading notification
  if (showDoneUploadingNotification) {
    $(".video-done-uploading-notification").show();
    $("#video-done-uploading-action-link").attr("target", "_blank");
    $("#video-done-uploading-action-link").attr("href", uploadingDoneContent.video_url);
    $(".close-video-done-uploading-notification").click(function() {
      closeNotification($, "done-uploading", username, ID, email, passwordHash); 
    });
  }
  stretchAWB($);
}

// Toggles the defaults notifications if they are set or not
function toggleDefaultsNotification($, result, username, ID, email, passwordHash) {
  _handleAllNotifications($, result, username, ID, email, passwordHash);
}

// Handles the minimum video settings
function minVideoSettings($, username, ID, email, pass) {
  $("#min-vid-default-setting").click(function() {
    $("#min-vid-subsection").toggle();
  });

  $("#save-min-vid-value").click(function() {
    var stepVal = $("#min-vid-input").val();
    if (stepVal != "") {
      $(".invalid-min-vid-prompt").hide();
      var stepParsed = parseInt(stepVal);
      if (stepParsed < 0) {
        $("#min-vid-input").val("0");
        stepParsed = 0;
      } else if (stepParsed > 24) {
        $("#min-vid-input").val("24");
        stepParsed = 24;
      }

      $("#min-vid-value").text(stepParsed);
      updateSetting($, username, ID, email, pass, "minimum-length", stepParsed + "");
    } else {
      $(".invalid-min-vid-prompt").show();
      $(".invalid-min-vid-prompt").css('display','inline-block');
    }
  });
}

// Handles the max video settings
function maxVideoSettings($, username, ID, email, pass) {
  $("#max-vid-default-setting").click(function() {
    $("#max-vid-subsection").toggle();
  });

  $("#save-max-vid-value").click(function() {
    var stepVal = $("#max-vid-input").val();
    if (stepVal != "") {
      $(".invalid-max-vid-prompt").hide();
      var stepParsed = parseInt(stepVal);
      if (stepParsed < 3) {
        $("#max-vid-input").val("3");
        stepParsed = 3;
      } else if (stepParsed > 25) {
        $("#max-vid-input").val("25");
        stepParsed = 25;
      }

      $("#max-vid-value").text(stepParsed);
      updateSetting($, username, ID, email, pass, "maximum-length", stepParsed + "");
    } else {
      $(".invalid-max-vid-prompt").show();
      $(".invalid-max-vid-prompt").css('display','inline-block');
    }
  });
}

// Toggles the other game input
function toggleOtherGameInput($, selectorID, otherInputID) {
  if ($("#" + selectorID).val() == "other") {
    $("#" + otherInputID).show();
  } else {
    $("#" + otherInputID).hide();
  }
}

// Hides the first item, then shows the second item with display: inline-block property
function hideShowInlineBlock(item1, item2) {
  $(item1).hide();
  $(item2).show();
  $(item2).css('display','inline-block');
}

// Handles the playlist settings
function playlistSettings($, username, ID, email, pass) {
  $("#playlists-default-setting").click(function() {
    getAndUpdatePlaylistView($, username, ID, email, pass);

    $("#playlists-vid-subsection").toggle();
  });

  $("#game-selector-playlists").change(function() {
    toggleOtherGameInput($, "game-selector-playlists", "playlist-other-game-input");
  });

  $("#add-playlist").click(function() {
    if ($("#game-selector-playlists").val() == "" || $("#playlist-id-input").val() == "") {
      hideShowInlineBlock(".max-playlists", ".invalid-playlist-combo");
    } else if (gamePlaylistsCombo.length == 15) {
      hideShowInlineBlock(".invalid-playlist-combo", ".max-playlists");
    } else {
      $(".max-playlists").hide();
      $(".invalid-playlist-combo").hide();
      $("#no-playlists-set").hide();

      var currGameName = $("#game-selector-playlists").val();
      var clearOther = false;
      if (currGameName == "other") {
        clearOther = true;
        currGameName = $("#playlist-other-game-input").val();
      }

      gamePlaylistsCombo.push({gameName: currGameName, playlistID: $("#playlist-id-input").val(), drawn: false, hardSaved: true, userDeleted: false});
      drawOptions($, gamePlaylistsCombo, "#playlists-saved-table-body", "playlist");
      updateSetting($, username, ID, email, pass, "game-playlists", JSON.stringify([{gameName: currGameName, playlistID: $("#playlist-id-input").val()}]));
      $("#playlist-id-input").val("");
      var currentCount = $("#playlists-count-value").text();
      $("#playlists-count-value").text(parseInt(currentCount) + 1);
      togglePlaylistsBtnDisable($);

      if (clearOther) {
        $("#playlist-other-game-input").val("");
      }
    }
  });
}

// Handles the comments settings
function commentsSettings($, username, ID, email, pass) {
  $("#comments-default-setting").click(function() {
    getAndUpdateCommentsView($, username, ID, email, pass);

    $("#comments-vid-subsection").toggle();
  });

  $("#game-selector-comments").change(function() {
    toggleOtherGameInput($, "game-selector-comments", "comments-other-game-input");
  });

  $("#add-comment").click(function() {
    if ($("#game-selector-comments").val() == "" || $("#comments-id-input").val() == "") {
      hideShowInlineBlock(".max-comments", ".invalid-comments-combo");
    } else if (gameCommentsCombo.length == 45) {
      hideShowInlineBlock(".invalid-comments-combo", ".max-comments");
    } else {
      $(".max-comments").hide();
      $(".invalid-comments-combo").hide();
      $("#no-comments-set").hide();

      var currGameName = $("#game-selector-comments").val();
      var clearOther = false;
      if (currGameName == "other") {
        clearOther = true;
        currGameName = $("#comments-other-game-input").val();
      }

      gameCommentsCombo.push({gameName: currGameName, playlistID: $("#comments-id-input").val(), drawn: false, hardSaved: true, userDeleted: false});
      drawOptions($, gameCommentsCombo, "#comments-saved-table-body", "comment");
      updateSetting($, username, ID, email, pass, "default-comments", JSON.stringify([{gameName: currGameName, comment: $("#comments-id-input").val()}]));
      $("#comments-id-input").val("");
      var currentCount = $("#comments-count-value").text();
      $("#comments-count-value").text(parseInt(currentCount) + 1);
      toggleCommentsBtnDisable($);

      if (clearOther) {
        $("#comments-other-game-input").val("");
      }
    }
  });
}

// Handles the like settings
function likeSettings($, username, ID, email, pass) {
  $("#like-default-setting").click(function() {
    $("#like-default-subsection").toggle();
  });

  $("#like-default-input").change(function() {
    var isChecked = $('#like-default-input').is(":checked");
    if (isChecked) {
      updateSetting($, username, ID, email, pass, "default-like", "true");
    } else {
      updateSetting($, username, ID, email, pass, "default-like", "false");
    }

    if (isChecked) {
      $("#like-default-value").text("Yes");
    } else {
      $("#like-default-value").text("No");
    }
  });
}

// Handles uploading an image to our backend server
function uploadThumbnailImg($, username, ID, email, pass, extraData, imgData, scope) {
  $.ajax({
    type: "POST",
    url: autoTuberURL + "user/thumbnail/upload",
    data: {
      "username": username,
      "user_id": ID,
      "email": email,
      "password": pass,

      "extra_data": extraData,
      "image_b64": imgData,
      "scope": scope
    },
    error: function(xhr,status,error) {
      console.log("Error: ", error);
    },
    success: function(result,status,xhr) {
      if (result.image_url) {
        console.log("Succesfully uploaded image.");
        $("#my-thumbnail-submission").val("");

        if (scope == "default-thumbnail") {
          // Add the image to the table and redraw
          gameThumbnailsCombo.push({gameName: extraData, playlistID: result.image_url, drawn: false, hardSaved: true, userDeleted: false});

          // Add one to the count of thumbnails
          var currentCount = globalJQuery("#thumbnails-count-value").text();
          globalJQuery("#thumbnails-count-value").text(parseInt(currentCount) + 1);

          drawOptions($, gameThumbnailsCombo, "#thumbnails-saved-table-body", "thumbnail");
        } else if (scope == "custom-thumbnail") {
          $(".set-current-clip-thumbnail").hide();
          smartThumbnails($, {
            youtube_settings: {
              thumbnails: {
                default_image: null,
                specific_image: result.image_url
              }
            }
          });
        }
      }
    },
    dataType: "json"
  });  
}

// Uploads an intro or outro to the server
function uploadIntroOrOutro($, username, ID, email, pass, gameName, dataURL, introOrOutro, dataFileName) {

  // Sourced heavily from: https://deliciousbrains.com/using-javascript-file-api-to-avoid-file-upload-limits/
  // However changed slightly.

  var reader = new FileReader();
  var file = dataURL;
  var nonce = "";

  // Keep the slice size to 1/2Mb per upload request.
  // 1024 (bytes in a kilobyte) * 500 (kilobytes in a mb) = 1/2mb
  // This will be good enough since base64 a file will roughly add 1.37x the size + 1kb for headers.
  var sliceSize = 500 * 1024;

  function uploadFileChunkCall(videoData, cb) {
    return $.ajax({
      type: "POST",
      url: autoTuberURL + "user/intro-outro/upload",
      data: {
        "username": username,
        "user_id": ID,
        "email": email,
        "password": pass,

        "nonce": nonce,
        "video_data": videoData
      },
      error: function(xhr,status,error) {
        console.log("Error: ", error);
      },
      success: function(result,status,xhr) {
        if (result && result.success == true) {
          return cb();
        } else {
          console.log("Uploading this chunk of video has failed: ", result);
        }
      },
      dataType: "json"
    });
  }

  function doneUploadingFileCall() {
    return $.ajax({
      type: "POST",
      url: autoTuberURL + "user/intro-outro/upload/done",
      data: {
        "username": username,
        "user_id": ID,
        "email": email,
        "password": pass,

        "nonce": nonce
      },
      error: function(xhr,status,error) {
        console.log("Error: ", error);
      },
      success: function(result,status,xhr) {
        if (result && result.success == true) {
          console.log("Intro/Outro marked as done uploading.");
          $("#currently-uploading-intro-outro-progress").hide();
          $("#upload-intro-outro-btn").show();
        } else {
          console.log("Marking intro/outro as done uploading has failed: ", result);
        }
      },
      dataType: "json"
    });
  }

  function updateProgressBarView(nextSlice, percentDone) {

    // Make the progress bar look a bit smoother
    // Leave a 25% leway for the video to be uploaded to S3 and be ready
    var actualPercentDone = percentDone * 0.75;
    if (actualPercentDone < 5) {
      actualPercentDone = 5;
    }
    // Sanity check below, should never go off.
    if (actualPercentDone > 75) {
      actualPercentDone = 75;
    }

    // Update the progress bar first
    $(".bar-intro-upload").css("width", actualPercentDone + "%");

    // Update the progress percent number
    $("#intro-up-progress-perc-num").text(actualPercentDone + "");

    return uploadFileChunk(nextSlice);
  }

  function uploadFileChunk(start) {
    var nextSlice = start + sliceSize + 1;
    var blob = file.slice(start, nextSlice); // Get the current blob we want to upload

    reader.onloadend = function(event) {
      if ( event.target.readyState !== FileReader.DONE ) {
          return;
      }

      console.log("Starting chunk upload.");
      return uploadFileChunkCall(event.target.result, function() {
        console.log("Done chunk upload.");

        // Keep uploading chunks if they exist
        var sizeDone = start + sliceSize;
        var percentDone = Math.floor((sizeDone / file.size) * 100);

        if (nextSlice < file.size) {
          return updateProgressBarView(nextSlice, percentDone);
        } else {
          console.log("We are done.");
          return doneUploadingFileCall();
        }
      });
    };

    // Start reading the blob into Base64 text
    reader.readAsDataURL(blob);
  }

  function startMulitpartUpload() {
    return $.ajax({
      type: "POST",
      url: autoTuberURL + "user/intro-outro/upload/init",
      data: {
        "username": username,
        "user_id": ID,
        "email": email,
        "password": pass,

        "game_name": gameName,
        "intro_or_outro": introOrOutro,
        "file_name": dataFileName
      },
      error: function(xhr,status,error) {
        console.log("Error: ", error);
      },
      success: function(result,status,xhr) {
        if (result && result.nonce != undefined) {
          nonce = result.nonce;
          return uploadFileChunk(0);
        } else {
          console.log("Could not find the nonce for this upload: ", result);
        }
      },
      dataType: "json"
    });
  }

  $("#currently-uploading-intro-outro-progress").show();
  return startMulitpartUpload();
}

// Handles the intros and outros settings
function introsOutrosSettings($, username, ID, email, pass, activeSubscriptionID) {
  if (activeSubscriptionID != "716") return;

  var dataURL = null;
  var dataFileName = "";
  $("#intro-outro-container").click(function() {
    getAndUpdateIntrosOutros($, username, ID, email, pass);

    $("#intros-outros-default-subsection").toggle();
  });

  $("#ugc-input-select-game-intro-outro").change(function() {
    toggleOtherGameInput($, "ugc-input-select-game-intro-outro", "intros-outros-other-game-input");
  });

  $("#my-intro-outro-submission").change(function() {
    var file = document.getElementById('my-intro-outro-submission').files[0];
    dataFileName = file.name;
    dataURL = file;
  });

  $("#upload-intro-outro-btn").click(function() {
    if (dataURL != null) {
      var gameName = $("#ugc-input-select-game-intro-outro").val();
      var introOrOutro = $(".select-intros-outros-type").val();

      // If they chose a game not in the list
      if (gameName == "other") {
        gameName = $("#intros-outros-other-game-input").val();
      }

      // Sanitize the intro or outro text
      if (introOrOutro.indexOf("outro") >= 0) {
        introOrOutro = "outro";
      } else {
        introOrOutro = "intro";
      }
      
      $("#upload-intro-outro-btn").hide();
      uploadIntroOrOutro($, username, ID, email, pass, gameName, dataURL, introOrOutro, dataFileName);
    }
  });
}

// Handles the thumbnail settings
function thumbnailSettings($, username, ID, email, pass) {
  var dataURL = null;
  $("#thumbnails-default-setting").click(function() {
    getAndUpdateThumbnails($, username, ID, email, pass);

    $("#thumbnails-default-subsection").toggle();
  });

  $("#ugc-input-select-game").change(function() {
    toggleOtherGameInput($, "ugc-input-select-game", "images-other-game-input");
  });

  $("#my-thumbnail-submission").change(function() {
    var file = document.getElementById('my-thumbnail-submission').files[0];
    var reader  = new FileReader();

    reader.addEventListener("load", function () {
      dataURL = reader.result;
    }, false);

    if (file) {
      reader.readAsDataURL(file);
    }
  });

  $("#upload-thumbnail-btn").click(function() {
    if (dataURL != null) {
      var gameName = $("#ugc-input-select-game").val();

      // If they chose a game not in the list
      if (gameName == "other") {
        gameName = $("#images-other-game-input").val();
      }

      uploadThumbnailImg($, username, ID, email, pass, gameName, dataURL, "default-thumbnail");
    }
  });
}

// Handles the category settings
function categorySettings($, username, ID, email, pass) {
  $("#category-default-setting").click(function() {
    updateCategoriesView($);
    $("#category-default-subsection").toggle();
  });

  $("#save-category-value").click(function() {
    var chosenCategory = $("#categories-selector").val();
    var categories = validCategories();
    var categorySanitized = categories.get(parseInt(chosenCategory));
    if (categorySanitized) {
      $("#category-default-value").text(categorySanitized);
    } else {
      $("#category-default-value").text(chosenCategory);
    }
    updateSetting($, username, ID, email, pass, "default-category", chosenCategory + "");
  });
}

// Handles the signatures settings
function signatureSettings($, username, ID, email, pass) {
  $("#description-default-setting").click(function() {
    getAndUpdateSignatureView($, username, ID, email, pass);

    $("#default-description-subsection").toggle();
  });

  $("#game-selector-signatures").change(function() {
    toggleOtherGameInput($, "game-selector-signatures", "signatures-other-game-input");
  });

  $("#add-description").click(function() {
    if ($("#game-selector-signatures").val() == "" || $("#descriptions-id-input").val() == "") {
      hideShowInlineBlock(".max-descriptions", ".invalid-descriptions-combo");
    } else if (gameCommentsCombo.length == 10) {
      hideShowInlineBlock(".invalid-descriptions-combo", ".max-descriptions");
    } else {
      $(".max-descriptions").hide();
      $(".invalid-descriptions-combo").hide();
      $("#no-descriptions-set").hide();

      var currGameName = $("#game-selector-signatures").val();
      var clearOther = false;
      if (currGameName == "other") {
        clearOther = true;
        currGameName = $("#signatures-other-game-input").val();
      }

      gameDescriptionsCombo.push({gameName: currGameName, playlistID: $("#descriptions-id-input").val(), drawn: false, hardSaved: true, userDeleted: false});
      drawOptions($, gameDescriptionsCombo, "#signatures-saved-table-body", "description");
      updateSetting($, username, ID, email, pass, "default-signature", JSON.stringify([{gameName: currGameName, signature: $("#descriptions-id-input").val()}]));
      $("#descriptions-id-input").val("");
      var currentCount = $("#description-count-value").text();
      $("#description-count-value").text(parseInt(currentCount) + 1);
      toggleSignatureBtnDisable($);

      if (clearOther) {
        $("#signatures-other-game-input").val("");
      }
    }
  });
}

// Handles opening up a default view
function handleDefaultViewOpen($, username, ID, email, pass, openView) {
  switch (openView) {
    case "tags":
      getAndUpdateTagsView($, username, ID, email, pass);
      $("#default-tags-subsection").toggle();

      // Scroll to the top of the tags area
      setTimeout(function() {
        $('html, body').animate({ scrollTop: $("#tags-default-setting").offset().top}, 'slow');
      }, 500);
      break;
    default:
      console.log("The view that is set as open hasn't been setup yet.");
  }
}

// Handles the tag settings
function tagSettings($, username, ID, email, pass) {
  $("#tags-default-setting").click(function() {
    getAndUpdateTagsView($, username, ID, email, pass);

    $("#default-tags-subsection").toggle();
  });

  $("#game-selector-tags").change(function() {
    toggleOtherGameInput($, "game-selector-tags", "tags-other-game-input");
  });

  $("#add-tag").click(function() {
    if ($("#game-selector-tags").val() == "" || $("#tags-id-input").val() == "") {
      hideShowInlineBlock(".max-tags", ".invalid-tags-combo");
    } else if (gameCommentsCombo.length == 100) {
      hideShowInlineBlock(".invalid-descriptions-tags", ".max-tags");
    } else {
      $(".max-tags").hide();
      $(".invalid-descriptions-tags").hide();
      $("#no-tags-set").hide();

      var currGameName = $("#game-selector-tags").val();
      var clearOther = false;
      if (currGameName == "other") {
        clearOther = true;
        currGameName = $("#tags-other-game-input").val();
      }

      gameTagsCombo.push({gameName: currGameName, playlistID: $("#tags-id-input").val(), drawn: false, hardSaved: true, userDeleted: false});
      drawOptions($, gameTagsCombo, "#tags-saved-table-body", "tag");
      updateSetting($, username, ID, email, pass, "default-tags", JSON.stringify([{gameName: currGameName, tag: $("#tags-id-input").val()}]));
      $("#tags-id-input").val("");
      var currentCount = $("#tags-count-value").text();
      $("#tags-count-value").text(parseInt(currentCount) + 1);
      toggleTagBtnDisable($);

      if (clearOther) {
        $("#tags-other-game-input").val("");
      }
    }
  });
}

// Handles the language settings
function languageSettings($, username, ID, email, pass) {
  $("#language-default-setting").click(function() {
    updateLanguagesView($);
    $("#language-default-subsection").toggle();
  });

  $("#add-language-value").click(function() {
    var chosenLanguage = $("#languages-selector").val();
    var languages = getLanguageMap();
    var languageSanitized = languages[chosenLanguage];
    if (languageSanitized) {
      $("#default-language-value").text(languageSanitized);
    } else {
      $("#default-language-value").text(chosenLanguage);
    }
    updateSetting($, username, ID, email, pass, "default-language", chosenLanguage + "");
  });
}

// Watches the default settings for changes
function defaultSettings($, username, ID, email, pass, activeSubscriptionID) {
  minVideoSettings($, username, ID, email, pass);
  introsOutrosSettings($, username, ID, email, pass, activeSubscriptionID);
  //maxVideoSettings($, username, ID, email, pass);
  playlistSettings($, username, ID, email, pass);
  commentsSettings($, username, ID, email, pass);
  likeSettings($, username, ID, email, pass);
  thumbnailSettings($, username, ID, email, pass);
  categorySettings($, username, ID, email, pass);
  signatureSettings($, username, ID, email, pass);
  tagSettings($, username, ID, email, pass);
  languageSettings($, username, ID, email, pass);
}

// -----------------------------------------
// Ending point for all Defaults code
// -----------------------------------------

// -----------------------------------------
// Starting point for all Account code
// -----------------------------------------

// Toggles the account notifications if they are set or not
function toggleAccountNotification($, result, username, ID, email, passwordHash) {
  _handleAllNotifications($, result, username, ID, email, passwordHash);
}

// -----------------------------------------
// Ending point for all Account code
// -----------------------------------------

// -----------------------------------------
// Starting point for all Videos code
// -----------------------------------------

// Toggles the video notifications if they are set or not
function toggleVideosNotification($, result, username, ID, email, passwordHash) {
  _handleAllNotifications($, result, username, ID, email, passwordHash);
}

// Calls the get video data endpoint
function _getVideoDataHelper($, username, ID, email, passwordHash, cb) {
    $.ajax({
      type: "POST",
      url: autoTuberURL + "/user/videos/info",
      data: {
        "username": username,
        "user_id": ID,
        "email": email,
        "password": passwordHash
      },
      error: function(xhr,status,error) {
        console.log("Error: ", error);
        $("#err-loading-tkn-link").show();
        stretchAWB($);
      },
      success: function(result,status,xhr) {
        return cb(result);
      },
      dataType: "json"
    });
}

// Calls the get new video data page endpoint
function _getVideoDataPageHelper($, username, ID, email, passwordHash, videoType, pageNumber, cb) {
    $.ajax({
      type: "POST",
      url: autoTuberURL + "/user/videos/page",
      data: {
        "username": username,
        "user_id": ID,
        "email": email,
        "password": passwordHash,
        "video_type": videoType,
        "page_number": parseInt(pageNumber)
      },
      error: function(xhr,status,error) {
        console.log("Error: ", error);
        $("#err-loading-tkn-link").show();
        stretchAWB($);
      },
      success: function(result,status,xhr) {
        return cb(result);
      },
      dataType: "json"
    });
}

function clickedToSeePublishedVideo(vidURL) {
  window.open(vidURL, '_blank');
}

function createVideoTR(title, descr, vidURL, uploadDate, thumbnailIMG) {
  
  var videoDataDisplay = "<div class=\"published-video-info-container\" onclick=\"clickedToSeePublishedVideo('" + vidURL + "')\">";

  var videoImageLink = "https://d2b3tzzd3kh620.cloudfront.net/no-vid-thumbnail-temp-image.png";
  if (thumbnailIMG != null) {
    videoImageLink = thumbnailIMG;
  }
  videoDataDisplay += "<div class=\"published-video-left-img-container\"><span class=\"published-video-thumbnail-pivot\"></span><img src=\"" + videoImageLink + "\" class=\"published-video-thumbnail-display\"></div>";

  videoDataDisplay += "<div class=\"published-video-text-container\">";
  videoDataDisplay += "<span style=\"display: block; max-height: 25px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;\">" + title + "</span>";
  videoDataDisplay += "<span style=\"display: block; max-height: 25px; font-size: 13px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;\">" + descr + "</span>";
  videoDataDisplay += "<span style=\"display: block; max-height: 25px; font-size: 13px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; color: #6441A5; font-weight: 600;\">Uploaded On: " + formatDateNicely(new Date(uploadDate)) + "</span>";
  videoDataDisplay += "</div>";

  videoDataDisplay += "</div>";
  return videoDataDisplay;
}

function deleteUnusedClipHelper(clipID) {
  var canAuth = (theUser.username != "" && theUser.id != 0 && theUser.email != "" && theUser.unique_identifier != "");
  if (globalJQuery == null) return;
  if (!canAuth) return;

  if (confirm("Are you sure you want to delete this clip? (ID: " + clipID + ")")) {
      return deleteClipCall(globalJQuery, theUser.username, theUser.id, theUser.email, theUser.unique_identifier, clipID, true, function() {
        globalJQuery("#unused-clip-in-tbl-id-" + clipID).remove();
      });
  }
}

function createClipDataTR(state, game, downloadedFile, clipID, twitchLink, clipSeconds, createdAt) {
  
  var twitchLinkSplit = twitchLink.split(".tv/");
  var twitchStreamerName = twitchLinkSplit[twitchLinkSplit.length - 1];
  
  var videoDataDisplay = "<div id=\"unused-clip-in-tbl-id-" + clipID + "\" class=\"previous-clips-info-container\">";

  var videoImageLink = "https://d2b3tzzd3kh620.cloudfront.net/unused-clips-icon-info.png";
  videoDataDisplay += "<div class=\"published-video-left-img-container\"><span class=\"published-video-thumbnail-pivot\"></span><img src=\"" + videoImageLink + "\" class=\"previous-clips-thumbnail-display\"></div>";

  videoDataDisplay += "<div class=\"published-video-text-container\">";
  videoDataDisplay += "<span style=\"display: block; max-height: 25px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;\">" + game + " <span style=\"font-size: 13px; color: #6441A5;\">(" + state + ") (" + twitchStreamerName + ") (" + clipSeconds + " Seconds)</span></span>";
  videoDataDisplay += "<span style=\"display: block; max-height: 25px; font-size: 13px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;\"><a href=\"" + downloadedFile + "\" class=\"vp-a\" style=\"color: #6441A5;\" target=\"_parent\">Watch Clip.</a> <a href=\"https://twitchautomator.com/dashboard?clipping=true&download_id=" + clipID + "\" style=\"color: #6441A5; margin-left: 5px;\" target=\"_blank\">Settings.</a></span>";
  videoDataDisplay += "<span style=\"display: block; max-height: 25px; font-size: 13px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;\"><a class=\"delete-unused-clip-from-videos\" onclick=\"deleteUnusedClipHelper('" + clipID + "')\">Delete Clip.</a></span>";
  videoDataDisplay += "<span style=\"display: block; max-height: 25px; font-size: 13px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; color: #6441A5; font-weight: 600;\">Clipped On: " + formatDateNicely(new Date(createdAt)) + "</span>";
  videoDataDisplay += "</div>";

  videoDataDisplay += "</div>";
  return videoDataDisplay;
}

function createPreviousClipDataTR(clipSeconds, twitchLink, gameName, downloadedFile, createdAt) {
  
  var twitchLinkSplit = twitchLink.split(".tv/");
  var twitchStreamerName = twitchLinkSplit[twitchLinkSplit.length - 1];

  var videoDataDisplay = "<div class=\"previous-clips-info-container\">";

  var videoImageLink = "https://d2b3tzzd3kh620.cloudfront.net/previous-clips-videos-info-icon.png";
  videoDataDisplay += "<div class=\"published-video-left-img-container\"><span class=\"published-video-thumbnail-pivot\"></span><img src=\"" + videoImageLink + "\" class=\"previous-clips-thumbnail-display\"></div>";

  videoDataDisplay += "<div class=\"published-video-text-container\">";
  videoDataDisplay += "<span style=\"display: block; max-height: 25px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;\">" + gameName + " <span style=\"font-size: 13px; color: #6441A5;\">(" + twitchStreamerName + ") (" + clipSeconds + " Seconds)</span></span>";
  videoDataDisplay += "<span style=\"display: block; max-height: 25px; font-size: 13px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;\"><a href=\"" + downloadedFile + "\" class=\"vp-a\" style=\"color: #6441A5;\" target=\"_parent\">Watch Clip.</a></span>";
  videoDataDisplay += "<span style=\"display: block; max-height: 25px; font-size: 13px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;\"><a href=\"" + downloadedFile + "\" style=\"color: #6441A5;\" download=\"previous_clip.mp4\">Download Clip.</a></span>";
  videoDataDisplay += "<span style=\"display: block; max-height: 25px; font-size: 13px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; color: #6441A5; font-weight: 600;\">Clipped On: " + formatDateNicely(new Date(createdAt)) + "</span>";
  videoDataDisplay += "</div>";

  videoDataDisplay += "</div>";
  return videoDataDisplay;
}

function _pageHandlerHelper($, username, ID, email, passwordHash, data, watchBtns, tableType) {
  var currentVideosPage = 1;
  var maxVideoPages = 1;

  // 
  var videosPage = undefined;
  var totalPage = undefined;
  var paginatorContainer = "";
  var currentPageText = "";
  var maxNumPageText = "";
  var nextPageBtnID = "";
  var firstPageBtnID = "";
  var backPageBtnID = "";
  var containerClass = "";
  switch (tableType) {
    case "published_videos":
      videosPage = data.done_videos_page;
      totalPage = data.done_videos_total_pages;
      paginatorContainer = "#published-videos-paginator-container";
      currentPageText = "#published-videos-current-page";
      maxNumPageText = "#published-videos-num-pages";
      nextPageBtnID = "#published-videos-next-page-btn";
      firstPageBtnID = "#published-videos-first-page-btn";
      backPageBtnID = "#published-videos-back-page-btn";
      containerClass = ".published-video-info-container";
      break;
    case "unused_clips":
      videosPage = data.unused_clips_page;
      totalPage = data.unused_clips_total_pages;
      paginatorContainer = "#unused-clips-paginator-container";
      currentPageText = "#unused-clips-current-page";
      maxNumPageText = "#unused-clips-num-pages";
      firstPageBtnID = "#unused-clips-first-page-btn";
      backPageBtnID = "#unused-clips-back-page-btn";
      nextPageBtnID = "#unused-clips-next-page-btn";
      containerClass = ".unused-clips-info-container";
      break;
    case "previous_clips":
      videosPage = data.previous_clips_page;
      totalPage = data.previous_clips_total_pages;
      paginatorContainer = "#previous-clips-paginator-container";
      currentPageText = "#previous-clips-current-page";
      maxNumPageText = "#previous-clips-num-pages";
      firstPageBtnID = "#previous-clips-first-page-btn";
      backPageBtnID = "#previous-clips-back-page-btn";
      nextPageBtnID = "#previous-clips-next-page-btn";
      containerClass = ".previous-clips-info-container";
      break;
    default:
      console.log("Invalid tabletype: " + tableType);
      return;
  }

  if (videosPage != undefined) {
    currentVideosPage = parseInt(videosPage);
  }
  if (totalPage != undefined) {
    maxVideoPages = parseInt(totalPage);
  }

  $(paginatorContainer).show();
  $(currentPageText).text(currentVideosPage);
  $(maxNumPageText).text(maxVideoPages);

  // Can't go upwards
  if (maxVideoPages <= currentVideosPage) {
    $(nextPageBtnID).addClass("a-tag-disabled");
  } else {
    $(nextPageBtnID).removeClass("a-tag-disabled");
  }

  // Can't go to the first page (already there)
  if (currentVideosPage == 1) {
    $(firstPageBtnID).addClass("a-tag-disabled");
    $(backPageBtnID).addClass("a-tag-disabled");
  } else {
    $(firstPageBtnID).removeClass("a-tag-disabled");
    $(backPageBtnID).removeClass("a-tag-disabled");
  }

  if (watchBtns == true) {
    function updateHelper(videoType) {
      _getVideoDataPageHelper($, username, ID, email, passwordHash, videoType, currentVideosPage, function(result) {

        $(containerClass).remove();
        switch (tableType) {
          case "published_videos":
            data.done_videos = result.new_video_data;
            data.done_videos_page = currentVideosPage;
            _handleDisplayingDoneVideos($, username, ID, email, passwordHash, data, false);
            break;
          case "unused_clips":
            data.unused_clips = result.new_video_data;
            data.unused_clips_page = currentVideosPage;
            _handleDisplayingUnusedClips($, username, ID, email, passwordHash, data, false);
            break;
          case "previous_clips":
            data.previous_clips = result.new_video_data;
            data.previous_clips_page = currentVideosPage;
            _handleDisplayingPreviousClips($, username, ID, email, passwordHash, data, false);
            break;
          default:
            console.log("Invalid tabletype: " + tableType);
            return;
        }

      });
    }

    $(nextPageBtnID).click(function() {
      currentVideosPage += 1;
      updateHelper(tableType);
    });
    $(firstPageBtnID).click(function() {
      currentVideosPage = 1;
      updateHelper(tableType);
    });
    $(backPageBtnID).click(function() {
      currentVideosPage -= 1;
      updateHelper(tableType);
    });
  }
}

function _handlePreviousClipsPages($, username, ID, email, passwordHash, data, watchBtns) {
  _pageHandlerHelper($, username, ID, email, passwordHash, data, watchBtns, "previous_clips");
}

function _handleUnusedClipsPages($, username, ID, email, passwordHash, data, watchBtns) {
  _pageHandlerHelper($, username, ID, email, passwordHash, data, watchBtns, "unused_clips");
}

function _handlePublishedVideoPages($, username, ID, email, passwordHash, data, watchBtns) {
  _pageHandlerHelper($, username, ID, email, passwordHash, data, watchBtns, "published_videos");
}

function _handleDisplayingDoneVideos($, username, ID, email, passwordHash, data, watchBtns) {
  $(".no-videos-overlay").hide();
  $("#videos-tbl-overlay-id").removeClass("no-videos-tbl-overlay");
  _handlePublishedVideoPages($, username, ID, email, passwordHash, data, watchBtns);

  var count = data.done_videos.length - 1;
  function displayAllVideos() {
    var currentVideoInfo = data.done_videos[count];
    var videoDisplayData = createVideoTR(currentVideoInfo.title, currentVideoInfo.description, currentVideoInfo.url, currentVideoInfo.created_at, currentVideoInfo.thumbnail);
    $(videoDisplayData).insertAfter("#top-published-video-header");
    count--;
    if (count >= 0) {
      displayAllVideos();
    }
  }

  displayAllVideos();

  // From what I can tell the action of calling "a.vp-a".YouTubePopUp() is causing the error I am fixing below that.
  // However I need to do the first action or the extra clips don't show up. So for now these both seem necessary.

  // Re enable to video popup (this needs to be done since we are dynamically creating the links above)
  $("a.vp-a").YouTubePopUp();
  // Start watching for the Youtube item dom to be added (to fix a bug with the plugin)
  $(".vp-a").click(function() {
    $(".VideoPopUpWrap .Video-PopUp-Content").slice(1).remove();
    $(".VideoPopUpWrap").slice(1).remove();
  });
}

function _handleDisplayingUnusedClips($, username, ID, email, passwordHash, data, watchBtns) {
  $(".no-clips-overlay").hide();
  $("#unused-tbl-overlay-id").removeClass("no-videos-tbl-overlay");
  _handleUnusedClipsPages($, username, ID, email, passwordHash, data, watchBtns);

  var count2 = data.unused_clips.length - 1;
  function displayAllUnusedClips() {
    var currentClipInfo = data.unused_clips[count2];
    var clipDisplayData = createClipDataTR(currentClipInfo.state, currentClipInfo.game, currentClipInfo.downloaded_file, currentClipInfo.id, currentClipInfo.twitch_link, currentClipInfo.clip_seconds, currentClipInfo.created_at);
    $(clipDisplayData).insertAfter("#top-unused-clips-header");
    count2--;
    if (count2 >= 0) {
      displayAllUnusedClips();
    }
  }

  displayAllUnusedClips();

  // From what I can tell the action of calling "a.vp-a".YouTubePopUp() is causing the error I am fixing below that.
  // However I need to do the first action or the extra clips don't show up. So for now these both seem necessary.

  // Re enable to video popup (this needs to be done since we are dynamically creating the links above)
  $("a.vp-a").YouTubePopUp();
  // Start watching for the Youtube item dom to be added (to fix a bug with the plugin)
  $(".vp-a").click(function() {
    $(".VideoPopUpWrap .Video-PopUp-Content").slice(1).remove();
    $(".VideoPopUpWrap").slice(1).remove();
  });
}

function _handleDisplayingPreviousClips($, username, ID, email, passwordHash, data, watchBtns) {
  $(".no-previous-clips-overlay").hide();
  $("#previous-tbl-overlay-id").removeClass("no-videos-tbl-overlay");
  _handlePreviousClipsPages($, username, ID, email, passwordHash, data, watchBtns);

  var count2 = data.previous_clips.length - 1;
  function displayAllPreviousClips() {
    var currentClipInfo = data.previous_clips[count2];
    var clipDisplayData = createPreviousClipDataTR(currentClipInfo.clip_seconds, currentClipInfo.twitch_link, currentClipInfo.game, currentClipInfo.downloaded_file, currentClipInfo.created_at);
    $(clipDisplayData).insertAfter("#top-previous-clips-header");
    count2--;
    if (count2 >= 0) {
      displayAllPreviousClips();
    }
  }

  displayAllPreviousClips();

  // From what I can tell the action of calling "a.vp-a".YouTubePopUp() is causing the error I am fixing below that.
  // However I need to do the first action or the extra clips don't show up. So for now these both seem necessary.

  // Re enable to video popup (this needs to be done since we are dynamically creating the links above)
  $("a.vp-a").YouTubePopUp();
  // Start watching for the Youtube item dom to be added (to fix a bug with the plugin)
  $(".vp-a").click(function() {
    $(".VideoPopUpWrap .Video-PopUp-Content").slice(1).remove();
    $(".VideoPopUpWrap").slice(1).remove();
  });
}

// Gets all of the data that is needed for the videos page
function getVideoPageData($, username, ID, email, passwordHash) {
  return _getVideoDataHelper($, username, ID, email, passwordHash, function(data) {

    // Display done videos if they exist
    if (data.done_videos && data.done_videos.length > 0) {
      _handleDisplayingDoneVideos($, username, ID, email, passwordHash, data, true);
    }

    // Display unused clips if they exist also
    if (data.unused_clips && data.unused_clips.length > 0) {
      _handleDisplayingUnusedClips($, username, ID, email, passwordHash, data, true);
    }

    // Display previous clisp if they exist also
    if (data.previous_clips && data.previous_clips.length > 0) {
      _handleDisplayingPreviousClips($, username, ID, email, passwordHash, data, true);
    }
  });
}

// -----------------------------------------
// Ending point for all Videos code
// -----------------------------------------

// -----------------------------------------
// Starting point for all Dashboard code
// -----------------------------------------

var popupWindow = null;
function centeredPopup(url,winName,w,h,scroll){
  var LeftPosition = 0;
  var TopPosition = 0;
  var settings = 'height='+h+',width='+w+',top='+TopPosition+',left='+LeftPosition+',scrollbars='+scroll+',resizable'
  popupWindow = window.open(url,winName,settings);
}

// Toggles the loading dashboard block
function toggleLoading( $ ) {
  $(".loading-dashboard-block").toggle();
}

// Starts a clip, or atleast attempts to.
function startClip($, username, ID, email, pass, twitch_link) {
  $.ajax({
    type: "POST",
    url: autoTuberURL + "start/clip",
    data: {
      "username": username,
      "user_id": ID,
      "email": email,
      "password": pass,
      "twitch_link": twitch_link
    },
    error: function(xhr,status,error) {
      console.log("Error: ", error);
      $("#err-loading-tkn-link").show();
      stretchAWB($);
    },
    success: function(result,status,xhr) {
      if (result.success) {
        window.location.href = "https://twitchautomator.com/dashboard/?clipping=true&download_id=" + result.download_id;
      } else {
        console.log("Bad input.");
        $("#bad-stream-link-text").text(result.download_id);
        $("#bad-stream-link-text").show();
      }
    },
    dataType: "json"
  });
}

// Specifies that the auth token has been found, and we don't need to authenticate with Youtube anymore.
function foundAuth($, username, ID, email, pass) {
  $("#bad-stream-link-text").hide();
  $(".dashboard-have-auth-token").show();
  $("#stream-name-input").change(function() {
    if ($("#stream-name-input").val().startsWith("https://twitch.tv/")) {
      $("#stream-name-input").addClass("valid-stream-link");
    } else {
      $("#stream-name-input").removeClass("valid-stream-link");
    }
  });
  $("#submit-stream-link").click(function() {
    var streamInput = $("#stream-name-input").val();
    if (streamInput.startsWith("https://twitch.tv/") || streamInput.startsWith("https://www.twitch.tv/")) {
      $("#bad-stream-link-text").hide();
      startClip($, username, ID, email, pass, streamInput);
    } else {
      $("#bad-stream-link-text").show();
    }
  });
  $("#youtube-settings-link").click(function() {
    window.location.href = "https://twitchautomator.com/defaults";
  });
  $("#why-clipping-delay-btn").click(function() {
    if ($(".why-clipping-delay-explanation").is(":visible")) {
      $(".why-clipping-delay-explanation").hide();
    } else {
      $(".why-clipping-delay-explanation").show();
      $('html, body').animate({ scrollTop: $(".why-clipping-delay-explanation").position().top + 200 }, 'slow');
    }
  });
  stretchAWB($);
}

// Toggles the dashboard notifications if they are set or not
function toggleDashboardNotification($, result, username, ID, email, passwordHash) {
  _handleAllNotifications($, result, username, ID, email, passwordHash);
}

// The popup window has been opened, now we poll to see when/if the user ever actually allows the authentication to go through.
function startPollingForAuth($, username, ID, email, pass) {
  	var maxPolls = 300; // Default: 300=10minutes
  	var currPolls = 0; 
    var lastTest = false;
  	function pollForAuth() {
      $.ajax({
        type: "POST",
        url: autoTuberURL + "/user/has-new-token",
        data: {
          "username": username,
          "user_id": ID,
          "email": email,
          "password": pass
        },
        error: function(xhr,status,error) {
          console.log("Error: ", error);
          $("#dashboard-error-reason").text("HTTP Error with status: " + status);
          $(".dashboard-internal-server-error").show();
          popupWindow.close();
          toggleLoading($);
          stretchAWB($);
        },
        success: function(result,status,xhr) {
			if (result.success) {
              toggleLoading($);
              foundAuth($, username, ID, email, pass);
            } else {
              currPolls++;
              if (currPolls < maxPolls) {
                if (popupWindow.closed && lastTest) {
                  $("#dashboard-error-reason").text("The authorizer popup window has been closed and we cannot find a token. This is a user error, please retry.");
                  $(".dashboard-internal-server-error").show();
                  popupWindow.close();
                  toggleLoading($);
                  stretchAWB($);
                  return;
                } else if (popupWindow.closed && !lastTest) {
                  lastTest = true; 
                }
                
                return setTimeout(function() {
                  return pollForAuth();
                }, 1500);
              } else {
          		$("#dashboard-error-reason").text("Timeout, 10minutes has passed. Please terminate the popup window and retry.");
    			    $(".dashboard-internal-server-error").show();
                popupWindow.close();
                toggleLoading($);
                return;
              }
            }
        },
        dataType: "json"
      });
    }
  
  return pollForAuth();
}

// If there was no token found, we need to ask the user to authenticate. This asks the server for the google auth link.
function getTokenLink($, username, ID, email, pass) {
  $.ajax({
      type: "POST",
      url: autoTuberURL + "/user/token/link",
      data: {
      	"username": username,
        "user_id": ID,
        "email": email,
        "password": pass
      },
      error: function(xhr,status,error) {
        console.log("Error: ", error);
        $("#err-loading-tkn-link").show();
      },
      success: function(result,status,xhr) {
        if (result.link) {
          	$("#auth-with-youtube-btn").click(function() {
              centeredPopup(result.link, 'Authenticate With Google', '700', '700', 'yes');
              $(".authenticate-with-youtube-block").hide();
              $("#loading-ball-text").html("Waiting for user to finish authenticating...</br><span style=\"font-size: 15px;\">This tab will progress after finishing, or close this tab and continue on the new tab Google redirects you to.</span>");
              toggleLoading($);
              startPollingForAuth($, username, ID, email, pass);
            });
        } else {
        	console.log("Cant find the link ", result);
        	$("#err-loading-tkn-link").show();
        }
      },
      dataType: "json"
    });
}

// Sanitizes string
function _padHelper(val) {
  var valString = val + "";
  if (valString.length < 2) {
    return "0" + valString;
  } else {
    return valString;
  }
}

// Helper for updating the total video time
function _updateTotalVideoTime($, totalVidSeconds) {
  var secondsSanitized2 = _padHelper(Math.round(totalVidSeconds % 60));
  var minutesSanitized2 = _padHelper(parseInt(totalVidSeconds / 60));
  $("#total-vid-minutes").text(minutesSanitized2);
  $("#total-vid-seconds").text(secondsSanitized2);
}

// Update timer
function updateTimer($, sec, totalVidSeconds) {
  var secondsSanitized = _padHelper(Math.round(sec % 60));
  var minutesSanitized = _padHelper(parseInt(sec / 60));
  $("#clip-minutes").text(minutesSanitized);
  $("#clip-seconds").text(secondsSanitized);

  _updateTotalVideoTime($, totalVidSeconds);
}

// Sets the clip status to the done state
function setClipStatusDone($) {
  $("#clip-status").removeClass("clip-status-active");
  $("#clip-status").addClass("clip-status-done");
  $("#clip-status").text("Done");
}

// Shows the current clip on the page
function showCurrentClip($, clipInfo) {
  $("#loading-current-clip-video").hide();
  $("#current-clip-video").show();
  $("#current-clip-video a").attr("href", clipInfo.downloaded_file);
}

// Starts polling for the clip video every second
function startPollingForClipVideo($, username, ID, email, pass, downloadID) {
    var maxPolls = 300; // Default: 300=10minutes
    var currPolls = 0;

    function pollForAuth() {
      $.ajax({
        type: "POST",
        url: autoTuberURL + "/user/clip/video",
        data: {
          "username": username,
          "user_id": ID,
          "email": email,
          "password": pass,

          "download_id": downloadID
        },
        error: function(xhr,status,error) {
          console.log("Error: ", error);
          $("#dashboard-error-reason").text("HTTP Error with status: " + status);
          $(".dashboard-internal-server-error").show();
        },
        success: function(result,status,xhr) {
          if (result.clip_video) {
            showCurrentClip($, {downloaded_file: result.clip_video});
          } else {
            currPolls++;

            if (currPolls < maxPolls) {
              return setTimeout(function() {
                return pollForAuth();
              }, 1000);
            }
          }
        },
        dataType: "json"
      });
    }
  
  return pollForAuth();
}

// Helper
function _scrollToTitleAndDescIfEmpty($, scrollEnabled, startingVal) {
  
  var titleVal = $("#clip-title-input").val();
  var descriptionVal = $("#clip-description-input").val();
  var missingInput = false;
  var extraText = "<span style=\"font-size: 15px;\">(";

  if (titleVal == "" && descriptionVal == "") {
    console.log("Need Title and Description before continuing.");
    missingInput = true;
    extraText += "Need Title & Description";
  } else if (titleVal == "") {
    console.log("Need Title before continuing.");
    missingInput = true;
    extraText += "Need Title";
  } else if (descriptionVal == "") {
    console.log("Need Description before continuing.");
    missingInput = true;
    extraText += "Need Description";
  }
  extraText += ")</span>";

  if (missingInput) {
    $("#clip-status").html("Done " + extraText);

    if (scrollEnabled) {
      $('html, body').animate({ scrollTop:$('#top-of-clip-info-table').position().top }, 'slow');
    }
  } else if (!missingInput && startingVal != undefined) {
    $("#clip-status").html(startingVal);

    if (scrollEnabled) {
      $('html, body').animate({ scrollTop:$('#top-of-clip-info-table').position().top }, 'slow');
    }
  }
}

// Scrolls to the title and description section if it isn't filled out yet. Also updates the state to "Done (Need Title/Description)".
function scrollToTitleAndDescIfEmpty($, scrollEnabled) {
  return _scrollToTitleAndDescIfEmpty($, scrollEnabled, undefined);
}

// Ends the current clip
function endClipping($, username, ID, email, pass, downloadID, twitchLink, timerInterval) {
  $.ajax({
    type: "POST",
    url: autoTuberURL + "/end/clip",
    data: {
      "username": username,
      "user_id": ID,
      "email": email,
      "password": pass,

      "twitch_link": twitchLink,
      "download_id": downloadID
    },
    error: function(xhr,status,error) {
      console.log("Error: ", error);
      $(".dashboard-internal-server-error").show();
    },
    success: function(result,status,xhr) {
      if (result.success) {
        setClipStatusDone($);
        clearInterval(timerInterval);
        $(".stop-clipping-button").addClass("a-tag-disabled");
        startPollingForClipVideo($, username, ID, email, pass, downloadID);
        scrollToTitleAndDescIfEmpty($, true);
      }
    },
    dataType: "json"
  });
}

// Removes the current clip item from the page, and updates all of the other clip ID numbers
function updateCombinedClipViewOnDeletion(deletedClipID, deletedClipSec) {
  if (!globalJQuery) return; // Can't do this if this hasn't been set.

  var currentClipNumber = parseInt(globalJQuery("#custom-clip-ordered-number-" + deletedClipID).text());

  // Hide the current clip from the page
  globalJQuery("#combined-clip-tr-container-" + deletedClipID).hide();

  // Update the total number of clips
  globalJQuery("#total-clips-number").text(parseInt(globalJQuery("#total-clips-number").text()) - 1);
  var totalVideoSecondsParsed = (parseInt(globalJQuery("#total-vid-minutes").text()) * 60) + parseInt(globalJQuery("#total-vid-seconds").text());
  _updateTotalVideoTime(globalJQuery, (totalVideoSecondsParsed - deletedClipSec));

  // Loop through all of the still visible combined clips and subtract 1 from all the numbers higher then the currentClipNumber
  globalJQuery(".custom-clip-ordered-number-container").each(function () {
    var tmpID = this.id;
    var tmpClipNumber = globalJQuery("#" + tmpID).text();
    if (globalJQuery("#" + tmpID).is(":visible") && parseInt(tmpClipNumber) > currentClipNumber) {
      globalJQuery("#" + tmpID).text(tmpClipNumber - 1);
    }
  });

  // Subtract 1 from the current clip number if its higher then the currentClipNumber
  var tmpCurrentClipNum = parseInt(globalJQuery(".original-clip-added-container").text());
  if (tmpCurrentClipNum > currentClipNumber) {
    globalJQuery(".original-clip-added-container").text(tmpCurrentClipNum - 1);
  }
}

// Removes a clip from the youtube video, doesn't actually delete the clip.
function removeClipFromVideo(downloadID, clipID, clipSeconds) {
  var canAuth = (theUser.username != "" && theUser.id != 0 && theUser.email != "" && theUser.unique_identifier != "");
  if (globalJQuery == null) return;
  if (!canAuth) return;

  console.log("Removing this clip from the video. DownloadID: " + downloadID + " and clipID: " + clipID);
  var dataOBJ = {
    "username": theUser.username,
    "user_id": theUser.id,
    "email": theUser.email,
    "password": theUser.unique_identifier,

    "download_id": downloadID,
    "option_name": "remove_combined_clip",
    "option_value": clipID
  };
  _setCustomOption(globalJQuery, dataOBJ);
  updateCombinedClipViewOnDeletion(clipID, clipSeconds);
}

// Send request to the backend to swap the position of two clips in the video
function _tellServerToSwapClips($, username, ID, email, pass, clipID1, clipID2, cb) {
  $.ajax({
    type: "POST",
    url: autoTuberURL + "/user/clip/swap-order",
    data: {
      "username": username,
      "user_id": ID,
      "email": email,
      "password": pass,

      "download_id_1": clipID1,
      "download_id_2": clipID2
    },
    error: function(xhr,status,error) {
      console.log("Error: ", error);
      $(".dashboard-internal-server-error").show();
    },
    success: function(result,status,xhr) {
      if (result.success) {
        return cb();
      }
    },
    dataType: "json"
  });
}

// Reorders a clip in the video
function reorderCombinedClip(clipTRID, direction, clickedClipID, currentPageDownloadID) {
  var canAuth = (theUser.username != "" && theUser.id != 0 && theUser.email != "" && theUser.unique_identifier != "");
  if (globalJQuery == null) return;
  if (!canAuth) return;

  var currentItem = globalJQuery("#" + clipTRID);
  var placeholder = globalJQuery("<tr><td></td></tr>");
  if (direction == "up") {
    var swapWith = globalJQuery("#" + clipTRID).prev();
    if (swapWith == undefined || swapWith.attr('id') == undefined) return;

    // Make sure we allow this swap
    var isRegularClip = swapWith.attr('id').indexOf("combined-clip-tr-container-");
    var isCurrentClip = swapWith.attr('id').indexOf("current-clip-tr-container");

    function makeSwap() {
      swapWith.before(placeholder);
      placeholder.replaceWith(currentItem);
    }

    if (isRegularClip >= 0) {
      var regularClipIDSplit = swapWith.attr('id').split("combined-clip-tr-container-");
      try {
        var tmpIDParsed = parseInt(regularClipIDSplit[regularClipIDSplit.length - 1]);
        return _tellServerToSwapClips(globalJQuery, theUser.username, theUser.id, theUser.email, theUser.unique_identifier, clickedClipID, tmpIDParsed + "", makeSwap);
      } catch (e) {
        console.log("Error getting the clip ID from the ID attribute: ", e);
      }
    } else if (isCurrentClip >= 0) {
      return _tellServerToSwapClips(globalJQuery, theUser.username, theUser.id, theUser.email, theUser.unique_identifier, clickedClipID, currentPageDownloadID, makeSwap);
    }
  } else if (direction == "down") {
    var swapWith = globalJQuery("#" + clipTRID).next();
    if (swapWith == undefined || swapWith.attr('id') == undefined) return;

    // Make sure we allow this swap
    var isRegularClip = swapWith.attr('id').indexOf("combined-clip-tr-container-");
    var isCurrentClip = swapWith.attr('id').indexOf("current-clip-tr-container");

    function makeSwap() {
      swapWith.after(placeholder);
      placeholder.replaceWith(currentItem);
    }

    if (isRegularClip >= 0) {
      var regularClipIDSplit = swapWith.attr('id').split("combined-clip-tr-container-");
      try {
        var tmpIDParsed = parseInt(regularClipIDSplit[regularClipIDSplit.length - 1]);
        return _tellServerToSwapClips(globalJQuery, theUser.username, theUser.id, theUser.email, theUser.unique_identifier, clickedClipID, tmpIDParsed + "", makeSwap);
      } catch (e) {
        console.log("Error getting the clip ID from the ID attribute: ", e);
      }
    } else if (isCurrentClip >= 0) {
      return _tellServerToSwapClips(globalJQuery, theUser.username, theUser.id, theUser.email, theUser.unique_identifier, clickedClipID, currentPageDownloadID, makeSwap);
    }
  }
}

// Returns a row for a done clip
function createClipItem(downloadID, clipNumber, clipDate, clipStreamer, clipLink, clipID, extraSeconds, pageDownloadID) {
  // Sanitize the date
  var clipDateStr = formatDateNicely(clipDate);

  // Sanitize the streamer name
  var clipStreamerSplit = clipStreamer.split("twitch.tv/");
  var clipStreamerName = clipStreamerSplit[clipStreamerSplit.length - 1];
  var clipStreamerLink = "<a id=\"clip-streamer-previous-vid\" style=\"color: #6441A5; font-size: 20px; font-weight: bold; text-decoration: none\" target=\"_blank\" rel=\"noopener noreferrer\" href=\"" + clipStreamer + "\">" + clipStreamerName + "</a>";

  // Sanitize the clip link
  var clipLinkActual = clipLink;
  if (clipLinkActual == undefined || !clipLinkActual) {
    clipLinkActual = "";
  }
  var clipLinkHtml = "<span class=\"view-video-link\" style=\"font-size: 20px;\"><a href=\"" + clipLinkActual + "\" class=\"vp-a\">View</a></span>";

  var clipReorderButtons = "<div><a class=\"reorder-combined-clip-btns\" onclick=\"reorderCombinedClip('combined-clip-tr-container-" + clipID + "', 'up', '" + clipID + "', '" + pageDownloadID + "')\">&#8593;</a><a class=\"reorder-combined-clip-btns\" onclick=\"reorderCombinedClip('combined-clip-tr-container-" + clipID + "', 'down', '" + clipID + "', '" + pageDownloadID + "')\">&#8595;</a></div>";

  return "<tr id=\"combined-clip-tr-container-" + clipID + "\" class=\"extra-clips-added-container\"><td style=\"width: 50%;\"><h4 class=\"clip-info-headers\"><a class=\"combined-clip-clickable-name\" href=\"https://twitchautomator.com/dashboard/?clipping=true&download_id=" + clipID + "\" target=\"_blank\">Clip <span id=\"custom-clip-ordered-number-" + clipID + "\" class=\"custom-clip-ordered-number-container\">" + clipNumber + "</span>:&nbsp;&nbsp;&nbsp; </a></td><td style=\"width: 50%;\"><span id=\"combined-clip-date\" style=\"color:#2c2c2c; font-size: 16px; ;display: inline-block; margin-top: 10px;\">" + clipDateStr + "</span></br><span id=\"combined-clip-streamer\" style=\"color:#6441A5 !important; font-size: 20px; font-weight: bold;display: inline-block;\">" + clipStreamerLink + "</span></br><span id=\"combined-clip-view\" style=\"color:#6441A5; font-size: 20px; font-weight: bold;display: inline-block;\">" + clipLinkHtml + "</span></br><a onclick=\"removeClipFromVideo(" + downloadID + ", " + clipID + ", " + extraSeconds + ")\" class=\"remove-clip-from-video-btn\">Remove</a></h4>" + clipReorderButtons + "</td></tr>"
}

// Returns a row for the clip already running
function createClipItemCurrentOne(clipNumber, downloadID) {
  var clipReorderButtons = "<div><a class=\"reorder-combined-clip-btns\" onclick=\"reorderCombinedClip('current-clip-tr-container', 'up', '" + downloadID + "', '" + downloadID + "')\">&#8593;</a><a class=\"reorder-combined-clip-btns\" onclick=\"reorderCombinedClip('current-clip-tr-container', 'down', '" + downloadID + "', '" + downloadID + "')\">&#8595;</a></div>";
  return "<tr id=\"current-clip-tr-container\"><td style=\"width: 50%;\"><h4 class=\"clip-info-headers\">Clip <span class=\"original-clip-added-container\">" + clipNumber + "</span>:&nbsp;&nbsp;&nbsp; </td><td style=\"width: 50%;\"><span id=\"combined-clip-streamer\" style=\"color:#6441A5 !important; font-size: 20px; font-weight: bold;display: inline-block;\">Current Clip!</span></h4>" + clipReorderButtons + "</td></tr>"
}

// Updates the exclusivity of a clip in the backend
function updateExclusive($, username, ID, email, pass, downloadID, exclusive) {
  $.ajax({
    type: "POST",
    url: autoTuberURL + "/user/clip/exclusive",
    data: {
      "username": username,
      "user_id": ID,
      "email": email,
      "password": pass,

      "download_id": downloadID,
      "exclusive": exclusive
    },
    error: function(xhr,status,error) {
      console.log("Error: ", error);
      $(".dashboard-internal-server-error").show();
    },
    success: function(result,status,xhr) {
      if (result.success) {
        console.log("Updated exclusivity of clip.");
      }
    },
    dataType: "json"
  });
}

// Handles textarea height autoscaling
function textareaAutoScaling($, ID) {
  $("#" + ID).keyup(function(e) {
    while($(this).outerHeight() < this.scrollHeight + parseFloat($(this).css("borderTopWidth")) + parseFloat($(this).css("borderBottomWidth"))) {
        $(this).height($(this).height()+1);
    };
  });
}

// Saves a title or description
function saveTitleDesc($, username, ID, email, pass, downloadID, urlPART, valueName, value, clipInfo) {
  var dataOBJ = {
    "username": username,
    "user_id": ID,
    "email": email,
    "password": pass,

    "download_id": downloadID
  };
  dataOBJ[valueName] = value;

  $.ajax({
    type: "POST",
    url: autoTuberURL + urlPART,
    data: dataOBJ,
    error: function(xhr,status,error) {
      console.log("Error: ", error);
      $(".dashboard-internal-server-error").show();
    },
    success: function(result,status,xhr) {
      if (result.success) {
        console.log("Updated title or description of clip.");
        _scrollToTitleAndDescIfEmpty($, false, "Done");
        _handleExpectedProgEndClipHelper($, username, ID, email, pass, downloadID, clipInfo, false);
      }
    },
    dataType: "json"
  });
}

// Handles a saving for a textarea
function handleTextAreaSaving($, username, ID, email, pass, downloadID, textareaID, clipInfo) {
  var textareaTimeoutID;
  $("#" + textareaID).bind('input propertychange', function() {

    clearTimeout(textareaTimeoutID);
    textareaTimeoutID = setTimeout(function() {

      if (textareaID == "clip-title-input") {
        saveTitleDesc($, username, ID, email, pass, downloadID, "/user/clip/title", "title", $("#" + textareaID).val(), clipInfo);
      } else if (textareaID == "clip-description-input") {
        saveTitleDesc($, username, ID, email, pass, downloadID, "/user/clip/description", "description", $("#" + textareaID).val(), clipInfo);
      } else if (textareaID == "clip-playlist-input") {

        var dataOBJ = {
          "username": username,
          "user_id": ID,
          "email": email,
          "password": pass,

          "download_id": downloadID,
          "option_name": "custom_playlist",
          "option_value": $("#" + textareaID).val()
        };

        _setCustomOption($, dataOBJ);
      }

    }, 1000);
  });
}

// Tells the server that this clip should have no thumbnail set
function setNoThumbnailOption($, username, ID, email, pass, downloadID) {
  var dataOBJ = {
    "username": username,
    "user_id": ID,
    "email": email,
    "password": pass,

    "download_id": downloadID,
    "option_name": "custom_thumbnail",
    "option_value": "none"
  };

  $.ajax({
    type: "POST",
    url: autoTuberURL + "/user/clip/custom/option",
    data: dataOBJ,
    error: function(xhr,status,error) {
      console.log("Error: ", error);
      $(".dashboard-internal-server-error").show();
    },
    success: function(result,status,xhr) {
      if (result.success) {
        console.log("Set this clip to not have a thumbnail.");
        $(".current-clip-thumbnail-set").hide();
        $(".remove-change-thumbnail-btn").hide();
        $(".current-clip-thumbnail-not-set").show();
      }
    },
    dataType: "json"
  });
}

// Tells the backend server about a custom thumbnail image
function uploadCustomThumbnailToBackendServer($, username, ID, email, pass, fileName, downloadID) {
  var realFileName = atob(fileName);

  $.ajax({
    type: "POST",
    url: autoTuberURL + "/user/clip/custom/option",
    data: {
      "username": username,
      "user_id": ID,
      "email": email,
      "password": pass,

      "download_id": downloadID,
      "option_name": "custom_thumbnail",
      "option_value": realFileName
    },
    error: function(xhr,status,error) {
      console.log("Error: ", error);
    },
    success: function(result,status,xhr) {
      if (result.success) {
        console.log("Success uploading image.");
        if (history.pushState) {
            var newurl = window.location.protocol + "//" + window.location.host + window.location.pathname + "?clipping=true&download_id=" + downloadID;
            window.history.pushState({path:newurl},'',newurl);
        }

        getAndUpdateThumbnails($, username, ID, email, pass);
      } else {
        console.log("Error uploading image.");
      }
    },
    dataType: "json"
  });
}

// Tells the server that this clip is now deleted
function deleteClipCall($, username, ID, email, pass, downloadID, deleteVal, cb) {
  var dataOBJ = {
    "username": username,
    "user_id": ID,
    "email": email,
    "password": pass,

    "download_id": downloadID,
    "delete": deleteVal
  };

  $.ajax({
    type: "POST",
    url: autoTuberURL + "/user/clip/delete",
    data: dataOBJ,
    error: function(xhr,status,error) {
      console.log("Error: ", error);
      $(".dashboard-internal-server-error").show();
    },
    success: function(result,status,xhr) {
      if (result.success) {
        console.log("Succesfully set clip deleted to: " + deleteVal);
        cb();
      }
    },
    dataType: "json"
  });
}

// Handles the delete button
function handleDeleteClipBtn($, username, ID, email, pass, clipInfo, downloadID) {
  scrollToTitleAndDescIfEmpty($, false);
  $(".delete-clip-button").removeClass("a-tag-disabled");
  var clipDeleted = false;

  var originalStatus = $("#clip-status").html();
  if (clipInfo.state == "deleted") {
    $(".delete-clip-button").addClass("a-tag-disabled");
    console.log("This clip is permanently deleted, cannot undelete.");
    $("#clip-status").removeClass("clip-status-active");
    $("#clip-status").addClass("clip-status-done");
    $("#clip-status").html("Permanently Deleted");
    $(".delete-clip-button").text("Clip Deleted");
    return;
  } else if (clipInfo.state == "deleted-soon") {
    clipDeleted = true;
    $("#clip-status").removeClass("clip-status-active");
    $("#clip-status").addClass("clip-status-done");
    $("#clip-status").html("Deleted Soon (48hr)");
    $(".delete-clip-button").text("Recover Clip");
  }

  $(".delete-clip-button").click(function() {
    if (clipDeleted) {
      deleteClipCall($, username, ID, email, pass, downloadID, false, function() {
        _handleExpectedProgEndClipHelper($, username, ID, email, pass, downloadID, clipInfo, false);
      });
      console.log("UnDeleting.");
      clipDeleted = false;
      $("#clip-status").html(originalStatus);
      $('html, body').animate({ scrollTop:$('#top-of-clip-info-table').position().top }, 'slow');
      $(".delete-clip-button").text("Delete Clip");
    } else {
      deleteClipCall($, username, ID, email, pass, downloadID, true, function() {
        _handleExpectedProgEndClipHelper($, username, ID, email, pass, downloadID, clipInfo, false);
      });
      console.log("Deleting.");
      clipDeleted = true;
      $("#clip-status").html("Deleted Soon (48hr)");
      $('html, body').animate({ scrollTop:$('#top-of-clip-info-table').position().top }, 'slow');
      $(".delete-clip-button").text("Recover Clip");
    }
  });
}

// Limited functionality for the first 32 seconds atleast
function inADPreparingState($, username, ID, email, pass, clipInfo, downloadID, updateTimerInterval, cb) {
  $(".stop-clipping-button").addClass("a-tag-disabled");

  function next() {
    setTimeout(function() {
        var dataOBJ = {
          "username": username,
          "user_id": ID,
          "email": email,
          "password": pass,

          "download_id": downloadID
        };

      $.ajax({
        type: "POST",
        url: autoTuberURL + "/user/clip/ad/free",
        data: dataOBJ,
        error: function(xhr,status,error) {
          console.log("Error: ", error);
          $(".dashboard-internal-server-error").show();
        },
        success: function(result,status,xhr) {
          if (result.download.state == "started") {
            console.log("The clip is in the started state. AD Free now.");
            $(".stop-clipping-button").removeClass("a-tag-disabled");
            watchStopClippingBtn($, username, ID, email, pass, clipInfo, downloadID, updateTimerInterval);
            return cb(result.download.created_at);
          } else {
            return next();
          }
        },
        dataType: "json"
      });
    }, 5000);
  }

  return next();
}

// Watches the stop clipping button
function watchStopClippingBtn($, username, ID, email, pass, clipInfo, downloadID, updateTimerInterval) {
  // Watch for the stop clipping button
  $(".stop-clipping-button").click(function() {
    handleDeleteClipBtn($, username, ID, email, pass, clipInfo, downloadID);
    endClipping($, username, ID, email, pass, downloadID, clipInfo.twitch_link, updateTimerInterval);
    handleExpectedProgressEndClip($, username, ID, email, pass, downloadID, clipInfo);
  });
}

// Handles smartly displaying the thumbnails
function smartThumbnails($, clipInfo) {
  if (clipInfo.youtube_settings.thumbnails.specific_image != null) {
    if (clipInfo.youtube_settings.thumbnails.specific_image == "none") {
      console.log("No thumbnail set.");
    } else {
      $(".current-clip-thumbnail-not-set").hide();
      $(".current-clip-thumbnail-set").css("background-image", "url(" + clipInfo.youtube_settings.thumbnails.specific_image + ")");
      $(".current-clip-thumbnail-set").show();
      $("#remove-set-thumbnail").show();
      $("#change-set-thumbnail").show();
    }
  } else if (clipInfo.youtube_settings.thumbnails.default_image != null) {
    $(".current-clip-thumbnail-not-set").hide();
    $(".current-clip-thumbnail-set").css("background-image", "url(" + clipInfo.youtube_settings.thumbnails.default_image + ")");
    $(".current-clip-thumbnail-set").show();
    $("#remove-set-thumbnail").show();
    $("#change-set-thumbnail").show();
  } else {
    $(".current-clip-thumbnail-not-set").show();
  }
}

// Set custom option with a cb on sucess
function _setCustomOptionCB($, dataOBJ, cb) {
  $.ajax({
    type: "POST",
    url: autoTuberURL + "/user/clip/custom/option",
    data: dataOBJ,
    error: function(xhr,status,error) {
      console.log("Error: ", error);
      $(".dashboard-internal-server-error").show();
    },
    success: function(result,status,xhr) {
      if (result.success) {
        console.log("Succesfully set custom option.");
        return cb();
      }
    },
    dataType: "json"
  });
}

// Makes request to custom option endpoint
function _setCustomOption($, dataOBJ) {
  _setCustomOptionCB($, dataOBJ, function() {});
}

// Handles a custom language
function handleCustomLanguage($, username, ID, email, pass, downloadID) {
  var dataOBJ = {
    "username": username,
    "user_id": ID,
    "email": email,
    "password": pass,

    "download_id": downloadID,
    "option_name": "custom_language",
  };

  $("#languages-selector").change(function() {
      dataOBJ.option_value = $("#languages-selector").val();

      _setCustomOption($, dataOBJ);
  });
}

// Deletes a tag for this video only
function deleteVideoTag(downloadID, index) {
  var canAuth = (theUser.username != "" && theUser.id != 0 && theUser.email != "" && theUser.unique_identifier != "");
  if (index < 0 || index >= videoTagsList.length) return;
  if (globalJQuery == null) return;
  if (!canAuth) return;

  if (confirm("Delete " + videoTagsList[index].tag_name)) {
    var dataOBJ = {
      "username": theUser.username,
      "user_id": theUser.id,
      "email": theUser.email,
      "password": theUser.unique_identifier,

      "download_id": downloadID,
      "option_name": "remove_tags",
      "option_value": globalJQuery("#displayed-tag-" + index + " > .tag-display").text()
    };
    _setCustomOption(globalJQuery, dataOBJ);
    globalJQuery("#displayed-tag-" + index).hide();
  } else {
    console.log("Dont delete.");
  }
}

// Helper to display the tags
function _displayTagsHelper($, downloadID) {
  for (var i = 0; i < videoTagsList.length; i++) {
    if (videoTagsList[i].drawn || videoTagsList[i].deleted) continue;

    $(".tag-display-list").append("<li id=\"displayed-tag-" + i + "\" style=\"list-style: none;\"><a class=\"tag-display\" onclick=\"deleteVideoTag('" + downloadID + "', " + i + ")\">" + videoTagsList[i].tag_name + "</a>");
    videoTagsList[i].drawn = true;
  }
}

// Handles the privacy status area
function handleCustomVideoPrivacyStatus($, username, ID, email, pass, downloadID, clipInfo) {

  var possibleSelectorVals = ["public", "private", "unlisted"];
  if (possibleSelectorVals.indexOf(clipInfo.youtube_settings.custom_privacy) >= 0) {
    $("#privacy-selector").val(clipInfo.youtube_settings.custom_privacy);
  }

  var dataOBJ = {
    "username": username,
    "user_id": ID,
    "email": email,
    "password": pass,

    "download_id": downloadID,
    "option_name": "custom_privacy"
  };

  $("#privacy-selector").change(function() {
      dataOBJ.option_value = $("#privacy-selector").val();

      _setCustomOption($, dataOBJ);
  });
}

// Handles a custom tag area
function handleCustomTags($, username, ID, email, pass, downloadID, clipInfo) {
  var tagsSet = false;
  if (clipInfo.youtube_settings.tags.length > 0) {
    $(".no-tags-set-yet").hide();
    $(".tags-display-container").show();

    // Display the tags
    for (var i = 0; i < clipInfo.youtube_settings.tags.length; i++) {
      videoTagsList.push({tag_name: clipInfo.youtube_settings.tags[i], drawn: false, deleted: false});
    }

    _displayTagsHelper($, downloadID)
  }

  // Watch to see if the user wants to add custom tags
  $(".add-custom-tags-btn").click(function() {
    $(".add-custom-tags-btn").hide();
    $("#custom-tag-input-box").show();
    $(".add-unique-tag-btn").show();

    $(".add-unique-tag-btn").click(function() {
      // Make sure these are visible
      $(".no-tags-set-yet").hide();
      $(".tags-display-container").show();

      var tagValue = $("#custom-tag-input-box").val();
      if (tagValue && tagValue != "") {
        $("#custom-tag-input-box").val("");
        videoTagsList.push({tag_name: tagValue, drawn: false, deleted: false});
        _displayTagsHelper($, downloadID);

        // Send it to the server
        var dataOBJ = {
          "username": username,
          "user_id": ID,
          "email": email,
          "password": pass,

          "download_id": downloadID,
          "option_name": "custom_tags",
          "option_value": tagValue
        };
        _setCustomOption($, dataOBJ);
      }
    });
  });
}

// Handles a custom playlist
function handleCustomPlaylist($, username, ID, email, pass, downloadID, clipInfo) {
  var customPlaylist = false;
  var defaultPlaylist = false;

  if (clipInfo.youtube_settings.custom_playlist) {
    customPlaylist = true;
  }
  if (clipInfo.youtube_settings.playlist) {
    defaultPlaylist = true;
  }

  if (customPlaylist) {
    $(".playlist-item-not-set").hide();
    $(".playlist-item-set").show();
    $(".playlist-item-set-change").show();
    $(".playlist-item-set").attr("href", ("https://www.youtube.com/playlist?list=" + clipInfo.youtube_settings.custom_playlist));
    $("#clip-playlist-input").val(clipInfo.youtube_settings.custom_playlist);
  } else if (defaultPlaylist) {
    $(".playlist-item-not-set").hide();
    $(".playlist-item-set").show();
    $(".playlist-item-set-change").show();
    $(".playlist-item-set").attr("href", ("https://www.youtube.com/playlist?list=" + clipInfo.youtube_settings.playlist));
    $("#clip-playlist-input").val(clipInfo.youtube_settings.playlist);
  }

  handleTextAreaSaving($, username, ID, email, pass, downloadID, "clip-playlist-input", clipInfo);
  $(".playlist-item-set-change").click(function() {
    $(".playlist-item-set").hide();
    $(".playlist-item-set-change").hide();
    $(".playlist-item-not-set").hide();
    $("#clip-playlist-input").show();
    $(".playlist-item-cancel-input").show();
  });
  $(".playlist-item-not-set").click(function() {
    $(".playlist-item-not-set").hide();
    $("#clip-playlist-input").show();
    $(".playlist-item-cancel-input").show();
  });
  $(".playlist-item-cancel-input").click(function() {
    if ($("#clip-playlist-input").val() != "") {
      $("#clip-playlist-input").hide();
      $(".playlist-item-cancel-input").hide();
      $(".playlist-item-set").show();
      $(".playlist-item-set-change").show();
      $(".playlist-item-set").attr("href", ("https://www.youtube.com/playlist?list=" + $("#clip-playlist-input").val()));
    } else {
      $(".playlist-item-not-set").show();
      $("#clip-playlist-input").hide();
      $(".playlist-item-cancel-input").hide();
    }
  });
}

// Handles a custom category
function handleCustomCategory($, username, ID, email, pass, downloadID) {
  var dataOBJ = {
    "username": username,
    "user_id": ID,
    "email": email,
    "password": pass,

    "download_id": downloadID,
    "option_name": "custom_category",
  };

  $("#categories-selector").change(function() {
      dataOBJ.option_value = $("#categories-selector").val();

      _setCustomOption($, dataOBJ);
  });
}

// Handles a custom thumbnail upload
function handleCustomThumbnailUpload($, username, ID, email, pass, downloadID, clipInfo) {
  var dataURL = null;
  function allowUpload() {
    $("#change-set-thumbnail").hide();
    $("#remove-set-thumbnail").hide();
    $(".current-clip-thumbnail-not-set").hide();
    $(".current-clip-thumbnail-set").hide();
    $(".set-current-clip-thumbnail").show();
    $("#my-thumbnail-submission").change(function() {
      var file = document.getElementById('my-thumbnail-submission').files[0];
      var reader  = new FileReader();

      reader.addEventListener("load", function () {
        dataURL = reader.result;
      }, false);

      if (file) {
        reader.readAsDataURL(file);
      }
    });
    $("#upload-thumbnail-btn").click(function() {
      if (dataURL != null) {
        uploadThumbnailImg($, username, ID, email, pass, downloadID, dataURL, "custom-thumbnail");
      }
    });
  }

  $(".current-clip-thumbnail-not-set").click(function() {
    allowUpload();
  });
  $(".current-clip-thumbnail-set").click(function() {
    allowUpload();
  });
  $("#change-set-thumbnail").click(function() {
    allowUpload();
  });
  $("#cancel-thumbnail-upload").click(function() {
    $(".set-current-clip-thumbnail").hide();
    smartThumbnails($, clipInfo);
  });
}

// Draws the clips that will be combined together, in the correct order
function drawClipsToCombine($, clipsData, downloadID) {
  clipsData.sort(function(a, b) {
      return a.orderNumber - b.orderNumber;
  });

  // Draw it from the back to the front (since order will be lowest -> highest we need to draw highest first)
  for (var i = clipsData.length - 1; i >= 0; i--) {
    var clipDisplayData = "";
    if (clipsData[i].current_clip == true) {
      clipDisplayData = createClipItemCurrentOne(i, clipsData[i].current_clip_id);
    } else if (clipsData[i].current_clip == false && clipsData[i].previous_clip_data) {
      clipDisplayData = createClipItem(
        clipsData[i].previous_clip_data.download_id, 
        i, 
        clipsData[i].previous_clip_data.created_at,
        clipsData[i].previous_clip_data.twitch_link, 
        clipsData[i].previous_clip_data.downloaded_file, 
        clipsData[i].previous_clip_data.ID, 
        clipsData[i].previous_clip_data.extra_time,
        downloadID);
    }

    $(clipDisplayData).insertAfter("#number-of-clips-head");
  }
}

// Handles clicking the explain Youtube settings buttons
function handleExplainYoutubeSettings($) {
  $(".explain-video-settings-button").click(function() {
    if ($(".explain-video-settings-container").is(":visible")) {
      $(".explain-video-settings-container").hide();
    } else {
      $(".explain-video-settings-container").show();
      $('html, body').animate({ scrollTop: $(".explain-video-settings-container").offset().top - 100 }, 'slow');
    }
  });
  stretchAWB($);
}

// Helper
function _handleExpProgressWithWatcher($, username, ID, email, pass, downloadID, clipInfo, watchTheInput) {
  // Hide everything.
  $("#checking-if-video-will-begin-processing").hide();
  $("#video-wont-process-yet-info").hide();
  $("#video-processing-soon-info").hide();
  $("#not-processing-avoid-this-next-time").hide();
  $("#video-cant-process-till-done-clip").hide();
  $("#video-is-already-processing-info").hide();
  $("#force-video-processing-container").hide();
  $("#video-is-deleted-no-processing").hide();
  $("#waiting-on-title-desc-for-proc").hide();

  if (clipInfo.processing_start_estimate == null || clipInfo.processing_start_estimate == "wont_be_processed") { // Not going to process it.
    $("#video-wont-process-yet-info").show();
    $("#not-processing-avoid-this-next-time").show();
    $("#force-video-processing-container").show();
    $("#minimum-video-length-number").text(clipInfo.youtube_settings.minimum_video_length);
  } else if (clipInfo.processing_start_estimate == "still_currently_clipping") {
    $("#video-cant-process-till-done-clip").show();
    $("#force-video-processing-container").show();
  } else if (clipInfo.processing_start_estimate == "currently_processing") {
    $("#video-is-already-processing-info").show();
  } else if (clipInfo.processing_start_estimate == "clip_deleted") {
    $("#video-is-deleted-no-processing").show();
  } else if (clipInfo.processing_start_estimate == "need_title_description_first") {
    $("#waiting-on-title-desc-for-proc").show();
  } else {
    var startProcDate = new Date(clipInfo.processing_start_estimate);
    var startProcSplit = clipInfo.processing_start_estimate.split(" ");
    var startProcNice = startProcSplit[0] + " " + startProcSplit[1] + " " + startProcSplit[2] + ", " + startProcDate.toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });
    $("#expected-start-processing-datetime").text(startProcNice);
    $("#video-processing-soon-info").show();

    // If this has been done because of a forced video processing display the toggle to deactivate it
    if (clipInfo.youtube_settings.force_video_processing == "true" || clipInfo.youtube_settings.force_video_processing == true) {
      $("#force-video-processing-container").show();
    }
  }

  // Just watch for clicks of this button
  var forcedProcessing = false;
  if (clipInfo.youtube_settings.force_video_processing == "true" || clipInfo.youtube_settings.force_video_processing == true) {
    forcedProcessing = true;
  }

  $("#force-video-processing-input").prop('checked', forcedProcessing);

  if (watchTheInput) {
    var dataOBJ = {
      "username": username,
      "user_id": ID,
      "email": email,
      "password": pass,

      "download_id": downloadID,
      "option_name": "force_video_processing",
      "option_value": "false"
    };
    $("#force-video-processing-input").change(function() {
      if (this.checked) {
        dataOBJ.option_value = "true";
        clipInfo.youtube_settings.force_video_processing = "true";
      } else {
        dataOBJ.option_value = "false";
        clipInfo.youtube_settings.force_video_processing = "false";
      }

      _setCustomOptionCB($, dataOBJ, function() {
        _handleExpectedProgEndClipHelper($, username, ID, email, pass, downloadID, clipInfo, false);
      });
    });
  }
} 

// Handles updating the progress visible to the user
function handleExpectedProgressDisplaying($, username, ID, email, pass, downloadID, clipInfo) {
  _handleExpProgressWithWatcher($, username, ID, email, pass, downloadID, clipInfo, true);
}

// Gets an updated expected progress. Try for a max of two times (with a 5 second delay)
function _getUpdatedExpectedProgress($, username, ID, email, pass, downloadID, exitCB) {
  function makePollReq(cb) {
    $.ajax({
      type: "POST",
      url: autoTuberURL + "/user/video/processing/estimate",
      data: {
        "username": username,
        "user_id": ID,
        "email": email,
        "password": pass,

        "download_id": downloadID,
      },
      error: function(xhr,status,error) {
        console.log("Error: ", error);
        $(".dashboard-internal-server-error").show();
      },
      success: function(result,status,xhr) {
        if (result.processing_estimate != undefined) {
          return cb(true, result.processing_estimate);
        } else {
          return cb(false, null);
        }
      },
      dataType: "json"
    });
  }

  function next() {
    return makePollReq(function(success, newEstimate) {
      if (success) {
        return exitCB(newEstimate);
      } else {
        // Usually this won't be needed, but doesn't hurt to try again in 3 seconds.
        return setTimeout(function() {
          return makePollReq(function(success, newEstimate) {
            if (success) {
              return exitCB(newEstimate);
            } else {
              console.log("Error updating the expected progress.");
              return exitCB(null);
            }
          });
        }, 3000); // 3 seconds
      }
    });
  }

  return next();
}

// Helper
function _handleExpectedProgEndClipHelper($, username, ID, email, pass, downloadID, clipInfo, delayedCall) {
  $("#checking-if-video-will-begin-processing").show();
  $("#video-wont-process-yet-info").hide();
  $("#video-processing-soon-info").hide();
  $("#not-processing-avoid-this-next-time").hide();
  $("#video-cant-process-till-done-clip").hide();
  $("#video-is-already-processing-info").hide();
  $("#force-video-processing-container").hide();

  function next(cb) {
    return _getUpdatedExpectedProgress($, username, ID, email, pass, downloadID, function(newProcessingEstimate) {
      clipInfo.processing_start_estimate = newProcessingEstimate;
      $("#checking-if-video-will-begin-processing").hide();
      _handleExpProgressWithWatcher($, username, ID, email, pass, downloadID, clipInfo, false);
      return cb();
    });
  }

  return next(function() {
    if (delayedCall) {
      // Just retry in 7 seconds since it may be more accurate. Not really needed but doesn't hurt.
      return setTimeout(function() {
        return next(function() {});
      }, 7000);
    }
  });
}

// Handles the stop clipping button being pressed, and progress indicator starts polling
function handleExpectedProgressEndClip($, username, ID, email, pass, downloadID, clipInfo) {
  _handleExpectedProgEndClipHelper($, username, ID, email, pass, downloadID, clipInfo, true);
}

// Gets some information about the current clip
function getCurrentClipInfo($, username, ID, email, pass, downloadID) {
  $("#current-clip-video").hide();

  $.ajax({
    type: "POST",
    url: autoTuberURL + "/user/clip/info",
    data: {
      "username": username,
      "user_id": ID,
      "email": email,
      "password": pass,
      "download_id": downloadID
    },
    error: function(xhr,status,error) {
      console.log("Error: ", error);
      $(".dashboard-internal-server-error").show();
    },
    success: function(result,status,xhr) {
      if (result && result.clip_info) {
        let clipInfo = result.clip_info;
        var clipSeconds = 0;

        handleExplainYoutubeSettings($);

        // Set the clip game
        $("#clip-game").text(clipInfo.game);
        $("#clip-game").attr("href", "https://twitch.tv/directory/game/" + clipInfo.game);

        // Set the clip streamer
        var twitchLinkSplit = clipInfo.twitch_link.split("twitch.tv/");
        var streamerName = twitchLinkSplit[twitchLinkSplit.length - 1];
        $("#clip-streamer").text(streamerName);
        $("#clip-streamer").attr("href", clipInfo.twitch_link);

        // Add the video to be viewed if it exists, else just add a loading indicator
        if (clipInfo.downloaded_file) {
          showCurrentClip($, clipInfo);
        } else {
          $("#loading-current-clip-video").show();
        }

        // Add the number of clips to the video clips section
        var numberOfClips = (clipInfo.videos_to_combine.length) + 1;
        var originalNumberOfClips = numberOfClips;
        $("#total-clips-number").text(numberOfClips + "");

        // Add the first currently clipping clip.
        var toCombineClipsList = [];
        toCombineClipsList.push({
          current_clip: true,
          current_clip_id: downloadID,
          orderNumber: clipInfo.order_number
        });
        numberOfClips--;

        var currentDate = new Date();
        var clipStart = new Date(clipInfo.created_at);
        var extraVidTime = 0;

        // Add up the extra seconds from previous clips as well as create the array of clips for displaying
        if (clipInfo.videos_to_combine.length > 0) {
          for (var i = 0; i < clipInfo.videos_to_combine.length; i++) {
            // Add up the seconds from this clip
            var tmpCreated = new Date(clipInfo.videos_to_combine[i].created_at);
            var tmpUpdated = new Date(clipInfo.videos_to_combine[i].updated_at);
            var tmpDiff = tmpCreated.getTime() - tmpUpdated.getTime();
            var diffTmp2 = tmpDiff / 1000;
            var extraSeconds = Math.abs(diffTmp2);
            extraVidTime += extraSeconds;

            // Display this clip
            toCombineClipsList.push({
              current_clip: false,
              previous_clip_data: {
                download_id: downloadID,
                created_at: tmpCreated,
                twitch_link: clipInfo.videos_to_combine[i].twitch_link,
                downloaded_file: clipInfo.videos_to_combine[i].downloaded_file,
                ID: clipInfo.videos_to_combine[i].id,
                extra_time: extraSeconds
              },
              orderNumber: clipInfo.videos_to_combine[i].order_number
            });
            numberOfClips--;
          }
        }

        // Draw all the clips that are going to be combined
        drawClipsToCombine($, toCombineClipsList, downloadID);

        // Update the progress if there is any.
        handleExpectedProgressDisplaying($, username, ID, email, pass, downloadID, clipInfo);

        // Handles the logic related to showing, and now showing items if the clip is exclusive.
        var backupExtraTime = extraVidTime;
        function toggleExclusivity(isChecked) {
          if (isChecked) {
            totalVidSeconds = totalVidSeconds - backupExtraTime;
            updateTimer($, clipSeconds, totalVidSeconds);
            $("#total-clips-number").text("1");
            $(".original-clip-added-container").text("1");
            $(".extra-clips-added-container").hide();
          } else {
            totalVidSeconds = totalVidSeconds + backupExtraTime;
            updateTimer($, clipSeconds, totalVidSeconds);
            $("#total-clips-number").text(originalNumberOfClips + "");
            $(".original-clip-added-container").text(originalNumberOfClips + "");
            $(".extra-clips-added-container").show();
          }
        }

        // Watch for the exclusive video radio button
        $("#exclusive-video-input").change(function() {
          var isChecked = $('#exclusive-video-input').is(":checked");
          updateExclusive($, username, ID, email, pass, downloadID, isChecked);
          toggleExclusivity(isChecked);
          _handleExpectedProgEndClipHelper($, username, ID, email, pass, downloadID, clipInfo, false);
        });

        // Set the title and description to autogrow
        textareaAutoScaling($, "clip-description-input");
        textareaAutoScaling($, "clip-title-input");
        textareaAutoScaling($, "clip-playlist-input");

        // Handles the title and description saving
        handleTextAreaSaving($, username, ID, email, pass, downloadID, "clip-description-input", clipInfo);
        handleTextAreaSaving($, username, ID, email, pass, downloadID, "clip-title-input", clipInfo);

        // If the title or description are already set
        if (clipInfo.title) {
          $("#clip-title-input").val(clipInfo.title);
        }
        if (clipInfo.description) {
          $("#clip-description-input").val(clipInfo.description);
        }

        // Update the textarea sizes
        $("#clip-description-input").height( $("#clip-description-input")[0].scrollHeight );
        $("#clip-title-input").height( $("#clip-title-input")[0].scrollHeight );

        // Handle the thumbnail being displayed if it exists
        smartThumbnails($, clipInfo);

        // Watch for the thumbnail options
        handleCustomThumbnailUpload($, username, ID, email, pass, downloadID, clipInfo);
        $("#remove-set-thumbnail").click(function() {
          setNoThumbnailOption($, username, ID, email, pass, downloadID);
        });

        // Handles setting up the category list
        updateCategoriesView($);
        var categories = validCategories();
        var customCategory = false;
        if (clipInfo.youtube_settings.custom_category != null && clipInfo.youtube_settings.custom_category != "" && categories.get(parseInt(clipInfo.youtube_settings.custom_category))) {
          customCategory = true;
        }

        var categorySanitized = categories.get(parseInt(clipInfo.youtube_settings.category));
        if (customCategory) {
          $("#categories-selector").val(clipInfo.youtube_settings.custom_category);
        } else if (categorySanitized) {
          $("#categories-selector").val(clipInfo.youtube_settings.category);
        }
        handleCustomCategory($, username, ID, email, pass, downloadID);

        // Handles setting up the language list
        updateLanguagesView($);
        var languages = getLanguageMap();
        var customLanguage = false;
        if (clipInfo.youtube_settings.custom_language != null && clipInfo.youtube_settings.custom_language != "" && languages[clipInfo.youtube_settings.custom_language]) {
          customLanguage = true;
        }

        if (customLanguage) {
          $("#languages-selector").val(clipInfo.youtube_settings.custom_language);
        } else if (languages[clipInfo.youtube_settings.vid_language]) {
          $("#languages-selector").val(clipInfo.youtube_settings.vid_language);
        }
        handleCustomLanguage($, username, ID, email, pass, downloadID);

        // Handles setting up the custom playlist
        handleCustomPlaylist($, username, ID, email, pass, downloadID, clipInfo);

        // Handles the tags area
        handleCustomTags($, username, ID, email, pass, downloadID, clipInfo);

        // Handles the privacy status area
        handleCustomVideoPrivacyStatus($, username, ID, email, pass, downloadID, clipInfo);

        // The clip is still running in this state
        if (clipInfo.state == "started" || clipInfo.state == "init-stop" || clipInfo.state == "preparing") {
          $(".delete-clip-button").addClass("a-tag-disabled");

          // Still running get the difference in time between start and now
          var diff = currentDate.getTime() - clipStart.getTime();
          var diffTmp = diff / 1000;

          // Number of seconds that the clip has been running
          clipSeconds = Math.abs(diffTmp);

          // Number of seconds the clip has been running + previous clips
          var totalVidSeconds = clipSeconds + extraVidTime;

          // Set the initial timer value
          updateTimer($, clipSeconds, totalVidSeconds);

          // Start the timer interval
          var updateTimerInterval = setInterval(setTime, 1000);
          function setTime() {
            if (clipSeconds >= 1500) { // 25 Minutes is the max.
              clearInterval(updateTimerInterval);
              setClipStatusDone($);
            }

            ++clipSeconds;
            ++totalVidSeconds;
            updateTimer($, clipSeconds, totalVidSeconds);
          }

          if (clipInfo.state == "preparing") {
            inADPreparingState($, username, ID, email, pass, clipInfo, downloadID, updateTimerInterval, function(newCreatedAt) {
              var newCreatedAtDate = new Date(newCreatedAt);
              if (clipStart != newCreatedAtDate) {
                var diff = newCreatedAtDate.getTime() - clipStart.getTime();
                var diffSecs = diff / 1000;

                // Subtract this difference to update the timer
                console.log("Updating timer by " + diffSecs + " seconds.");

                // Display that we are removing the AD, and thats why there is a change in time
                if (parseInt(diffSecs) >= 15) {
                  var tmpOriginalVal = $("#clip-status").html();
                  $("#clip-status").html("Removing AD.");
                  setTimeout(function() {
                    $("#clip-status").html(tmpOriginalVal);
                  }, 5000);
                }

                totalVidSeconds -= diffSecs;
                clipSeconds -= diffSecs;
                updateTimer($, clipSeconds, totalVidSeconds);
              }
            });
          } else {
            watchStopClippingBtn($, username, ID, email, pass, clipInfo, downloadID, updateTimerInterval);
          }
        } else if (clipInfo.state == "done" || clipInfo.state == "done-need-info") { // The clip is in the stop state

          // Update the timers to the correct time
          var stoppedDate = new Date(clipInfo.updated_at);
          var diff = stoppedDate.getTime() - clipStart.getTime();
          var diffTmp = diff / 1000;
          var clipSeconds = Math.abs(diffTmp);
          var totalVidSeconds = clipSeconds + extraVidTime;
          updateTimer($, clipSeconds, totalVidSeconds);
          setClipStatusDone($);
          $(".stop-clipping-button").addClass("a-tag-disabled");

          // Specific things for this state
          if (clipInfo.state == "done-need-info") {
            scrollToTitleAndDescIfEmpty($, true);
          } else if (clipInfo.downloaded_file == undefined) {

            // If downloaded file isn't found yet start polling for it
            // This is a case where maybe a refresh, and the video is still uploading to S3
            // This is an edge case.
            startPollingForClipVideo($, username, ID, email, pass, downloadID);
          }

          // Handle possible deletions
          handleDeleteClipBtn($, username, ID, email, pass, clipInfo, downloadID);

        } else if (clipInfo.state == "deleted") {

          // Update the timers to the correct time
          var stoppedDate = new Date(clipInfo.updated_at);
          var diff = stoppedDate.getTime() - clipStart.getTime();
          var diffTmp = diff / 1000;
          var clipSeconds = Math.abs(diffTmp);
          var totalVidSeconds = clipSeconds + extraVidTime;
          updateTimer($, clipSeconds, totalVidSeconds);
          setClipStatusDone($);

          $(".stop-clipping-button").addClass("a-tag-disabled");
            handleDeleteClipBtn($, username, ID, email, pass, clipInfo, downloadID);
        } else if (clipInfo.state == "deleted-soon" || clipInfo.deleted) {

          // Update the timers to the correct time
          var stoppedDate = new Date(clipInfo.updated_at);
          var diff = stoppedDate.getTime() - clipStart.getTime();
          var diffTmp = diff / 1000;
          var clipSeconds = Math.abs(diffTmp);
          var totalVidSeconds = clipSeconds + extraVidTime;
          updateTimer($, clipSeconds, totalVidSeconds);
          setClipStatusDone($);

          $(".stop-clipping-button").addClass("a-tag-disabled");
            handleDeleteClipBtn($, username, ID, email, pass, clipInfo, downloadID);
        } else if (clipInfo.state == "processing" || clipInfo.state == "uploading" || clipInfo.state == "uploaded" || clipInfo.state == "processing-failed" || clipInfo.state == "uploading-failed") {

          // Update the timers to the correct time
          var stoppedDate = new Date(clipInfo.updated_at);
          var diff = stoppedDate.getTime() - clipStart.getTime();
          var diffTmp = diff / 1000;
          var clipSeconds = Math.abs(diffTmp);
          var totalVidSeconds = clipSeconds + extraVidTime;
          updateTimer($, clipSeconds, totalVidSeconds);
          $(".stop-clipping-button").addClass("a-tag-disabled");
          $(".delete-clip-button").addClass("a-tag-disabled");

          $("#clip-status").removeClass("clip-status-active");
          $("#clip-status").addClass("clip-status-done");

          if (clipInfo.state == "processing") {
            $("#clip-status").text("Processing");
          } else if (clipInfo.state == "uploading") {
            $("#clip-status").text("Uploading");
          } else if (clipInfo.state == "uploaded") {
            $("#clip-status").text("Uploaded (Clips will be deleted after 48 hours)");
          } else if (clipInfo.state == "processing-failed") {
            $("#clip-status").text("Processing Failed");
          } else if (clipInfo.state == "uploading-failed") {
            $("#clip-status").text("Uploading Failed");
          }
        }

        // Set the exclusive checkbox value
        if (clipInfo.exclusive) {
          $('#exclusive-video-input').prop('checked', true);
          toggleExclusivity(true);
        }

        // From what I can tell the action of calling "a.vp-a".YouTubePopUp() is causing the error I am fixing below that.
        // However I need to do the first action or the extra clips don't show up. So for now these both seem necessary.

        // Re enable to video popup (this needs to be done since we are dynamically creating the links above)
        $("a.vp-a").YouTubePopUp();
        // Start watching for the Youtube item dom to be added (to fix a bug with the plugin)
        $(".vp-a").click(function() {
          $(".VideoPopUpWrap .Video-PopUp-Content").slice(1).remove();
          $(".VideoPopUpWrap").slice(1).remove();
        });
        
      }
    },
    dataType: "json"
  });
}

// Checks if the user is already clipping, and if they are redirects to this page with the '?clipping=true&download_id=ID' query params.
function checkIfAlreadyClipping($, username, ID, email, pass) {
  $.ajax({
    type: "POST",
    url: autoTuberURL + "/user/currently-downloading",
    data: {
      "username": username,
      "user_id": ID,
      "email": email,
      "password": pass
    },
    error: function(xhr,status,error) {
      console.log("Error: ", error);
      $(".dashboard-internal-server-error").show();
    },
    success: function(result,status,xhr) {

      // Are we already on the clipping page
      var urlParams = new URLSearchParams(window.location.search);
      var isAlreadyClipping = urlParams.get("clipping");
      var downloadID = urlParams.get("download_id");

      if (isAlreadyClipping) {
        $(".currently-clipping-container").show();
        if (!result.download_id) {
          console.log("Somehow the user got here, but doesn't actually have a clip started.");
          return getCurrentClipInfo($, username, ID, email, pass, downloadID);
        } else {
          return getCurrentClipInfo($, username, ID, email, pass, result.download_id);
        }
      } else {
        if (result.download_id) {
          console.log("Already have a download. Redirecting.");
          window.location.href = "https://twitchautomator.com/dashboard/?clipping=true&download_id=" + result.download_id;
        } else {
          foundAuth($, username, ID, email, pass);
        }
      }
    },
    dataType: "json"
  });
}

// Asks the backend server if there has been a succesfull token saved.
function getHasToken($, username, ID, email, pass) {
  $.ajax({
    type: "POST",
    url: autoTuberURL + "/user/has-token",
    data: {
    	"username": username,
      "user_id": ID,
      "email": email,
      "password": pass
    },
    error: function(xhr,status,error) {
      console.log("Error: ", error);
    	$(".dashboard-internal-server-error").show();
    },
    success: function(result,status,xhr) {
      if (result.exists) {
        console.log("The token exists");
        toggleLoading($);
        $(".authenticate-with-youtube-block").hide();
        checkIfAlreadyClipping($, username, ID, email, pass);
      } else {
        console.log("The token doesnt exist");
        toggleLoading($);
        $(".authenticate-with-youtube-block").show();
        getTokenLink($, username, ID, email, pass);
        stretchAWB($);
      }
    },
    dataType: "json"
  });
}

// Custom route for the dashboard since it has some unique attributes.
function dashboardAuthenticator($, username, ID, email, subscriptions, passwordHash, payments) {
    $.ajax({
      type: "POST",
      url: autoTuberURL + "user/create",
      data: {
      	"username": username,
        "user_id": ID,
        "email": email,
        "subscriptions": JSON.stringify(subscriptions),
        "password": passwordHash,
        "payments": JSON.stringify(payments),
        "current_route": "dashboard"
      },
      error: function(xhr,status,error) {
        console.log("Error: ", error);
      	$(".dashboard-internal-server-error").show();
        stretchAWB($);
      },
      success: function(result,status,xhr) {
        if (result.success) {
		      toggleBasedOnSubscription($, result);
          toggleDashboardNotification($, result, username, ID, email, passwordHash);
          getHasToken($, username, ID, email, passwordHash);
        } else {
          console.log("Unsuccesfully authenticated.");
        }
      },
      dataType: "json"
    });
}

// -----------------------------------------
// Ending point for all Dashboard code
// -----------------------------------------

// -----------------------------------------
// Starting point for all Globally used code
// -----------------------------------------

// Authenticates with the AutoTuber Host. This is the default route. Does nothing except authenticate.
function authenticateWithAutoTuberHost($, username, ID, email, subscriptions, passwordHash, payments) {
    $.ajax({
      type: "POST",
      url: autoTuberURL + "user/create",
      data: {
        "username": username,
        "user_id": ID,
        "email": email,
        "subscriptions": JSON.stringify(subscriptions),
        "password": passwordHash,
        "payments": JSON.stringify(payments)
      },
      error: function(xhr,status,error) {
        console.log("Error: ", error);
      },
      success: function(result,status,xhr) {
        if (result.success) {
          toggleBasedOnSubscription($, result);
          console.log("Succesfully authenticated.");
        } else {
          console.log("Unsuccesfully authenticated.");
        }
      },
      dataType: "json"
    });
}

// Authentication route to check for notifications.
function notificationsAuth($, username, ID, email, subscriptions, passwordHash, payments, route) {
  $.ajax({
      type: "POST",
      url: autoTuberURL + "user/create",
      data: {
        "username": username,
        "user_id": ID,
        "email": email,
        "subscriptions": JSON.stringify(subscriptions),
        "password": passwordHash,
        "payments": JSON.stringify(payments),
        "current_route": route
      },
      error: function(xhr,status,error) {
        console.log("Error: ", error);
        $(".dashboard-internal-server-error").show();
        stretchAWB($);
      },
      success: function(result,status,xhr) {
        if (result.success) {
          toggleBasedOnSubscription($, result);
          
          switch (route) {
            case "videos":
              toggleVideosNotification($, result, username, ID, email, passwordHash);
              getVideoPageData($, username, ID, email, passwordHash);
              break;
            case "account":
              toggleAccountNotification($, result, username, ID, email, passwordHash);
              break;
            case "defaults":
              defaultSettings($, username, ID, email, passwordHash, result.active_subscription);
              toggleDefaultsNotification($, result, username, ID, email, passwordHash);
              toggleDefaultSavedValues($, username, ID, email, passwordHash);
              break;
          }
        } else {
          console.log("Unsuccesfully authenticated.");
        }
      },
      dataType: "json"
    });
}

// Disables intro outro options
function _disableIntroOutroOption($) {
  // Defaults page
  $("#intro-outro-container").addClass("intro-outro-container-disabled");
  $("#intros-outros-count-container").hide();
  $("#intros-outros-count-disabled-container").show();
  $("#intro-outro-title-disabled-text").show();
}

// Toggles anything based on what the subscription level for the user is
// What currently is being toggled: 
// 1) The upgrade to professional prompt at the bottom of the screen.
// 2) The info notification that you have no more videos to make.
// 3) The user is banned notification. If this is present (2) is not.
// 4) Disable and Enable the ability to upload intros/outros
function toggleBasedOnSubscription($, result) {
  if (result.active_subscription == "716") { // If they are professional.
    $(".upgrade-to-professional-prompt").hide(); 
  } else { // Everything else
    _disableIntroOutroOption($);
  }

  if (result.user_banned == true) {
    $(".user-banned-notification").show();
    $("#user-banned-reason-text").text(result.user_banned_reason);
  } else if (result.number_videos_left <= 0) {
    $(".no-videos-left-notification").show();
  }
}

function formatDateNicely(clipDate) {
  var monthStr = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var clipDay = clipDate.getDate();
  var clipMonth = monthStr[clipDate.getMonth()];
  var clipYear = clipDate.getFullYear();
  var clipDateStr = clipMonth + " " + clipDay + ", " + clipYear + ".";

  return clipDateStr;
}

// Resizes all the objects on the page
function stretchAWB($) {
    var wndW = $('body').width();

    $('.nk-awb.alignfull > .nk-awb-wrap').each(function () {
        var $this = $(this);

        var rect = this.getBoundingClientRect();
        var left = rect.left;
        var right = wndW - rect.right;

        var ml = parseFloat($this.css('margin-left') || 0);
        var mr = parseFloat($this.css('margin-right') || 0);

        $this.css({
            'margin-left': ml - left,
            'margin-right': mr - right,
        });
    });
}

// Closes a notification
function closeNotification($, notificationName, username, ID, email, passwordHash) {
  $.ajax({
      type: "POST",
      url: autoTuberURL + "user/notification/seen",
      data: {
        "username": username,
        "user_id": ID,
        "email": email,
        "password": passwordHash,
        "notifiation_name": notificationName
      },
      error: function(xhr,status,error) {
        console.log("Error: ", error);
      },
      success: function(result,status,xhr) {
        if (result.success) {
          console.log("Succesfully closed notification.");
        } else {
          console.log("Unsuccesfully closed notification.");
        }
        
        switch (notificationName) {
          case "dashboard-intro":
            $(".dashboard-into-notification").hide();
            break;
          case "videos-intro":
            $(".videos-notification-container").hide();
            break;
          case "account-intro":
            $(".account-notification-container").hide();
            break;
          case "defaults-intro":
            $(".defaults-intro-notification").hide();
            break;
          case "currently-clipping":
            $(".currently-clipping-notification").hide();
            break;
          case "need-title-or-description":
            $(".clipping-need-info-notification").hide();
            break;
          case "currently-processing":
            $(".video-processing-notification").hide();
            break;
          case "currently-uploading":
            $(".video-uploading-notification").hide();
            break;
          case "done-uploading":
            $(".video-done-uploading-notification").hide();
            break;
        }
      },
      dataType: "json"
    });
}

// Intro point.
jQuery(document).ready(function( $ ){
  globalJQuery = $;

  // Can we authenticate with the host server. This is only possible if a user has been logged into the frontend.
  var canAuth = (theUser.username != "" && theUser.id != 0 && theUser.email != "" && theUser.unique_identifier != "");

  // Hide the authenticate with youtube block unless we actually need it
  $(".authenticate-with-youtube-block").hide();
  $(".dashboard-have-auth-token").hide();
  $(".currently-clipping-container").hide();
  $(".clipping-need-info-notification").hide();
  $(".currently-clipping-notification").hide();
  $(".videos-notification-container").hide();
  $(".account-notification-container").hide();
  $(".defaults-intro-notification").hide();
  $(".dashboard-internal-server-error").hide();
  $(".video-uploading-notification").hide();
  $(".video-processing-notification").hide();
  $(".video-done-uploading-notification").hide();
  $(".no-videos-left-notification").hide();
  
  // Logic now based on the specific route
  var pageURL = $(location).attr("href").split(".com/");
  if (pageURL.length >= 1) {

    // Dashboard route
    if (pageURL[1].startsWith("dashboard")) {
      var urlParams = new URLSearchParams(window.location.search);

      // Check if this is the Auth popup
      var isPopup = urlParams.get('done_auth');
      var popupReason = urlParams.get('reason');
      if (isPopup) { // If this is a popup
        if (isPopup == 'true') { // Successfull popup authentication
        	window.close();
        } else { // Failed popup authentication
          $("#header").hide();
          $(".authenticate-with-youtube-block").hide();
          $("#dashboard-error-reason").text(atob(popupReason));
          $(".dashboard-internal-server-error").addClass("full-height-popup");
          $(".dashboard-internal-server-error").show();
          stretchAWB($);
          return;
        }
      }

      // If we can authenticate get the dashboard elements
      if (canAuth) {
      	dashboardAuthenticator($, theUser.username, theUser.id, theUser.email, theUser.subscriptions, theUser.unique_identifier, theUser.payments);
      }
    } else if (pageURL[1].startsWith("register") && canAuth) { // If we are on the register route, and we are already logged in redirect to dashboard.
        //window.location.href = "https://twitchautomator.com/dashboard/";
    } else if (pageURL[1].startsWith("videos")) { // Videos route
        notificationsAuth($, theUser.username, theUser.id, theUser.email, theUser.subscriptions, theUser.unique_identifier, theUser.payments, "videos");
    } else if (pageURL[1].startsWith("account")) { // Account route
        notificationsAuth($, theUser.username, theUser.id, theUser.email, theUser.subscriptions, theUser.unique_identifier, theUser.payments, "account");
    } else if (pageURL[1].startsWith("defaults")) { // Defaults route
        var urlParams = new URLSearchParams(window.location.search);

        // Check if we need to automatically open up a view
        var viewOpen = urlParams.get("view");
        if (viewOpen) {
          handleDefaultViewOpen($, theUser.username, theUser.id, theUser.email, theUser.unique_identifier, viewOpen);
        }

        notificationsAuth($, theUser.username, theUser.id, theUser.email, theUser.subscriptions, theUser.unique_identifier, theUser.payments, "defaults");
    } else {
      if (canAuth) {
      	authenticateWithAutoTuberHost($, theUser.username, theUser.id, theUser.email, theUser.subscriptions, theUser.unique_identifier, theUser.payments);
      }
    }
  }
});

// -----------------------------------------
// Ending point for all Globally used code
// -----------------------------------------
