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
      var fileNameSplit = fileName.split("/uploads");
      fileName = fileNameSplit[fileNameSplit.length - 1];

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
        gameContent = "<img src=\"" + urlPrefix + gameContent + "\">";
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
        }
        $("#ugc-input-select-game").append("<option value=\"other\">Other</option>");
        $(".game-selector-base").append("<option value=\"other\">Other</option>");
        $("#ugc-input-select-game").val(initialVal);
        $(".game-selector-base").val(initialVal);
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

// Calls the server for the thumbnail items, and then once returned updates the view
function getAndUpdateThumbnails($, username, ID, email, pass) {
  return getAndUpdateHelper($, username, ID, email, pass, "default-thumbnail", function(result) {
    for (var i = 0; i < result.results.length; i++) {
      if (contentAlreadyExists(gameThumbnailsCombo, result.results[i].game, result.results[i].image_name)) continue;
      gameThumbnailsCombo.push({gameName: result.results[i].game, playlistID: result.results[i].image_name, drawn: false, hardSaved: true, userDeleted: false});
    }

    if (gameThumbnailsCombo.length == 0) return;
    $("#no-comments-set").hide();

    // Toggle the thumbnails disable button
    toggleThumbnailsBtnDisable($);

    drawOptions($, gameThumbnailsCombo, "#thumbnails-saved-table-body", "thumbnail");
    getAndPopulateGames($);
  });
}

// Calls the server for the comment items, and then once returned updates the view
function getAndUpdateCommentsView($, username, ID, email, pass) {
  return getAndUpdateHelper($, username, ID, email, pass, "default-comments", function(result) {
    for (var i = 0; i < result.results.length; i++) {
      if (contentAlreadyExists(gameCommentsCombo, result.results[i].game, result.results[i].comment)) continue;
      gameCommentsCombo.push({gameName: result.results[i].game, playlistID: result.results[i].comment, drawn: false, hardSaved: true, userDeleted: false});
    }

    if (gameCommentsCombo.length == 0) return;
    $("#no-comments-set").hide();

    toggleCommentsBtnDisable($);

    drawOptions($, gameCommentsCombo, "#comments-saved-table-body", "comment");
    getAndPopulateGames($);
  });
}

// Calls the server for the comment items, and then once returned updates the view
function getAndUpdateTagsView($, username, ID, email, pass) {
  return getAndUpdateHelper($, username, ID, email, pass, "default-tags", function(result) {
    for (var i = 0; i < result.results.length; i++) {
      if (contentAlreadyExists(gameTagsCombo, result.results[i].game, result.results[i].tag)) continue;
      gameTagsCombo.push({gameName: result.results[i].game, playlistID: result.results[i].tag, drawn: false, hardSaved: true, userDeleted: false});
    }

    if (gameTagsCombo.length == 0) return;
    $("#no-tags-set").hide();

    toggleTagBtnDisable($);

    drawOptions($, gameTagsCombo, "#tags-saved-table-body", "tag");
    getAndPopulateGames($);
  });
}

// Calls the server for the playlist items, and then once returned updates the view
function getAndUpdatePlaylistView($, username, ID, email, pass) {
  return getAndUpdateHelper($, username, ID, email, pass, "game-playlists", function(result) {
    for (var i = 0; i < result.results.length; i++) {
      if (contentAlreadyExists(gamePlaylistsCombo, result.results[i].game, result.results[i].playlist_id)) continue;
      gamePlaylistsCombo.push({gameName: result.results[i].game, playlistID: result.results[i].playlist_id, drawn: false, hardSaved: true, userDeleted: false});
    }

    if (gamePlaylistsCombo.length == 0) return;
    $("#no-playlists-set").hide();

    togglePlaylistsBtnDisable($);

    drawOptions($, gamePlaylistsCombo, "#playlists-saved-table-body", "playlist");
    getAndPopulateGames($);
  });
}

// Calls the server for the signature items, and then once returned updates the view
function getAndUpdateSignatureView($, username, ID, email, pass) {
  return getAndUpdateHelper($, username, ID, email, pass, "default-signature", function(result) {
    for (var i = 0; i < result.results.length; i++) {
      if (contentAlreadyExists(gameDescriptionsCombo, result.results[i].game, result.results[i].signature)) continue;
      gameDescriptionsCombo.push({gameName: result.results[i].game, playlistID: result.results[i].signature, drawn: false, hardSaved: true, userDeleted: false});
    }

    if (gameDescriptionsCombo.length == 0) return;
    $("#no-descriptions-set").hide();

    toggleSignatureBtnDisable($);

    drawOptions($, gameDescriptionsCombo, "#signatures-saved-table-body", "description");
    getAndPopulateGames($);
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

// Toggles the defaults notifications if they are set or not
function toggleDefaultsNotification($, result, username, ID, email, passwordHash) {
  var showNotification = false;
  if (result.notifications.length > 0) {
    for (var i = 0; i < result.notifications.length; i++) {
     if (result.notifications[i].notification == "defaults-intro") {
       showNotification = true;
     } else if (result.notifications[i].notification == "currently-clipping") {
        showDLNotification = true;
        dlContent = JSON.parse(result.notifications[i].content);
     }
    }
  }
  
  if (showNotification) {
    $(".defaults-intro-notification").show();
    $(".close-notification").click(function() {
      closeNotification($, "defaults-intro", username, ID, email, passwordHash); 
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
      if (stepParsed < 2) {
        $("#min-vid-input").val("2");
        stepParsed = 2;
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
    if (settingsOverview != null && settingsOverview.playlists_count > gamePlaylistsCombo.length) {
      // This means its opened for the first time
      // We can pretty much guarantee this since we never hard delete stored options
      getAndUpdatePlaylistView($, username, ID, email, pass);
    }

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
    if (settingsOverview != null && settingsOverview.comments_count > gameCommentsCombo.length) {
      // This means its opened for the first time
      // We can pretty much guarantee this since we never hard delete stored options
      getAndUpdateCommentsView($, username, ID, email, pass);
    }

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

// Handles the thumbnail settings
function thumbnailSettings($, username, ID, email, pass) {
  $("#thumbnails-default-setting").click(function() {
    getAndPopulateGames($);
    if (settingsOverview != null && settingsOverview.thumbnails_count > gameThumbnailsCombo.length) {
      // This means its opened for the first time
      // We can pretty much guarantee this since we never hard delete stored options
      getAndUpdateThumbnails($, username, ID, email, pass);
    }

    $("#thumbnails-default-subsection").toggle();
  });

  $("#ugc-input-select-game").change(function() {
    toggleOtherGameInput($, "ugc-input-select-game", "images-other-game-input");
  });

  $("#my-thumbnail-submission").change(function() {
    var currGameName = $("#ugc-input-select-game").val();
    if (currGameName == "") {
      currGameName = "None";
    }
    var fileName = $("#my-thumbnail-submission").val();
    var fileNameSanitized = fileName.split("fakepath\\")[1];
    var currentDate = new Date();
    var currentMonth = ('0' + (currentDate.getMonth() + 1)).slice(-2);
    var currentYear = currentDate.getFullYear();
    fileNameSanitized = "/" + currentYear + "/" + currentMonth + "/" + "user_" + ID + "_" + fileNameSanitized;

    var gameBtoa = btoa(currGameName);
    var fileNameBtoa = btoa(fileNameSanitized);
    $("#ugc-input-success_page").val("https://twitchautomator.com/defaults/?thumbnail_upload=true&gameName=" + gameBtoa + "&fileName=" + fileNameBtoa);
  });

  $("#upload-thumbnail-btn").click(function() {
    if ($("#ugc-input-select-game").val() == "other") {
      var initial = $("#ugc-input-success_page").val();
      var splitOnGameName = initial.split("gameName=");
      var splitOnFileName = splitOnGameName[1].split("&fileName=");
      var newURL = splitOnGameName[0] + "gameName=" + btoa($("#images-other-game-input").val()) + "&fileName=" + splitOnFileName[1];
      $("#ugc-input-success_page").val(newURL);
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
    if (settingsOverview != null && settingsOverview.signatures_count > gameDescriptionsCombo.length) {
      // This means its opened for the first time
      // We can pretty much guarantee this since we never hard delete stored options
      getAndUpdateSignatureView($, username, ID, email, pass);
    }

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

// Handles the tag settings
function tagSettings($, username, ID, email, pass) {
  $("#tags-default-setting").click(function() {
    if (settingsOverview != null && settingsOverview.tags_count > gameTagsCombo.length) {
      // This means its opened for the first time
      // We can pretty much guarantee this since we never hard delete stored options
      getAndUpdateTagsView($, username, ID, email, pass);
    }

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
function defaultSettings($, username, ID, email, pass) {
  minVideoSettings($, username, ID, email, pass);
  maxVideoSettings($, username, ID, email, pass);
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
  var showNotification = false;
  if (result.notifications.length > 0) {
    for (var i = 0; i < result.notifications.length; i++) {
     if (result.notifications[i].notification == "account-intro") {
       showNotification = true;
     } else if (result.notifications[i].notification == "currently-clipping") {
        showDLNotification = true;
        dlContent = JSON.parse(result.notifications[i].content);
     }
    }
  }
  
  if (showNotification) {
    $(".account-notification-container").show();
    $(".close-notification").click(function() {
      closeNotification($, "account-intro", username, ID, email, passwordHash); 
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
}

// -----------------------------------------
// Ending point for all Account code
// -----------------------------------------

// -----------------------------------------
// Starting point for all Videos code
// -----------------------------------------

// Toggles the video notifications if they are set or not
function toggleVideosNotification($, result, username, ID, email, passwordHash) {  
  var showNotification = false;
  var showDLNotification = false; var dlContent = {download_id: -1};
  if (result.notifications.length > 0) {
    for (var i = 0; i < result.notifications.length; i++) {
     if (result.notifications[i].notification == "videos-intro") {
       showNotification = true;
     } else if (result.notifications[i].notification == "currently-clipping") {
        showDLNotification = true;
        dlContent = JSON.parse(result.notifications[i].content);
     }
    }
  }
  
  // Intro notification
  if (showNotification) {
    $(".videos-notification-container").show();
    $(".close-notification").click(function() {
      closeNotification($, "videos-intro", username, ID, email, passwordHash); 
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
}

// Toggles the dashboard notifications if they are set or not
function toggleDashboardNotification($, result, username, ID, email, passwordHash) {  
  var showNotification = false;
  if (result.notifications.length > 0) {
    for (var i = 0; i < result.notifications.length; i++) {
     if (result.notifications[i].notification == "dashboard-intro") {
       showNotification = true;
     }
    }
  }
  
  if (showNotification) {
    $(".dashboard-into-notification").show();
    $(".close-notification").click(function() {
      closeNotification($, "dashboard-intro", username, ID, email, passwordHash); 
    });
  }
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

// Update timer
function updateTimer($, sec, totalVidSeconds) {
  var secondsSanitized = pad(Math.round(sec % 60));
  var minutesSanitized = pad(parseInt(sec / 60));
  $("#clip-minutes").text(minutesSanitized);
  $("#clip-seconds").text(secondsSanitized);


  var secondsSanitized2 = pad(Math.round(totalVidSeconds % 60));
  var minutesSanitized2 = pad(parseInt(totalVidSeconds / 60));
  $("#total-vid-minutes").text(minutesSanitized2);
  $("#total-vid-seconds").text(secondsSanitized2);

  function pad(val) {
    var valString = val + "";
    if (valString.length < 2) {
      return "0" + valString;
    } else {
      return valString;
    }
  }
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

// Scrolls to the title and description section if it isn't filled out yet. Also updates the state to "Done (Need Title/Description)".
function scrollToTitleAndDescIfEmpty($) {
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
    $('html, body').animate({ scrollTop:$('#top-of-clip-info-table').position().top }, 'slow');
  }
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
        scrollToTitleAndDescIfEmpty($);
      }
    },
    dataType: "json"
  });
}

// Returns a row for a done clip
function createClipItem(clipNumber, clipDate, clipStreamer, clipLink) {
  // Sanitize the date
  var monthStr = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var clipDay = clipDate.getDate();
  var clipMonth = monthStr[clipDate.getMonth()];
  var clipYear = clipDate.getFullYear();
  var clipDateStr = clipMonth + " " + clipDay + ", " + clipYear + ".";

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

  return "<tr class=\"extra-clips-added-container\"><td style=\"width: 50%;\"><h4 class=\"clip-info-headers\">Clip " + clipNumber + ":&nbsp;&nbsp;&nbsp; </td><td style=\"width: 50%;\"><span id=\"combined-clip-date\" style=\"color:#2c2c2c; font-size: 16px; ;display: inline-block; margin-top: 10px;\">" + clipDateStr + "</span></br><span id=\"combined-clip-streamer\" style=\"color:#6441A5 !important; font-size: 20px; font-weight: bold;display: inline-block;\">" + clipStreamerLink + "</span></br><span id=\"combined-clip-view\" style=\"color:#6441A5; font-size: 20px; font-weight: bold;display: inline-block;\">" + clipLinkHtml + "</span></br><span id=\"combined-clip-view\" style=\"color:red; font-size: 20px; font-weight: bold;display: inline-block;\">Delete</span></h4></td></tr>"
}

// Returns a row for the clip already running
function createClipItemCurrentOne(clipNumber) {
  return "<tr><td style=\"width: 50%;\"><h4 class=\"clip-info-headers\">Clip <span class=\"original-clip-added-container\">" + clipNumber + "</span>:&nbsp;&nbsp;&nbsp; </td><td style=\"width: 50%;\"><span id=\"combined-clip-streamer\" style=\"color:#6441A5 !important; font-size: 20px; font-weight: bold;display: inline-block;\">Active Clip!</span></h4></td></tr>"
}

// Updates the exclusivity of a clip in the backend
function updateExclusive($, username, ID, email, pass, downloadID, exclusive) {
  console.log("Type of exclusive: " + typeof exclusive);
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

        // Set the clip game
        $("#clip-game").text(clipInfo.game);

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
        $(createClipItemCurrentOne(numberOfClips)).insertAfter("#number-of-clips-head");
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
            $(createClipItem(numberOfClips, tmpCreated, clipInfo.videos_to_combine[i].twitch_link, clipInfo.videos_to_combine[i].downloaded_file)).insertAfter("#number-of-clips-head");
            numberOfClips--;
          }
        }

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
        });

        // Set the title and description to autogrow
        textareaAutoScaling($, "clip-description-input");
        textareaAutoScaling($, "clip-title-input");

        // The clip is still running in this state
        if (clipInfo.state == "started" || clipInfo.state == "init-stop") {

          // Still running get the difference in time between start and now
          var diff = currentDate.getTime() - clipStart.getTime();
          var diffTmp = diff / 1000;

          // Number of seconds that the clip has been running
          var clipSeconds = Math.abs(diffTmp);

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

          // Watch for the stop clipping button
          $(".stop-clipping-button").click(function() {
            return endClipping($, username, ID, email, pass, downloadID, clipInfo.twitch_link, updateTimerInterval);
          });

        } else if (clipInfo.state == "done") { // The clip is in the stop state

          var stoppedDate = new Date(clipInfo.updated_at);
          var diff = stoppedDate.getTime() - clipStart.getTime();
          var diffTmp = diff / 1000;
          var clipSeconds = Math.abs(diffTmp);
          var totalVidSeconds = clipSeconds + extraVidTime;
          updateTimer($, clipSeconds, totalVidSeconds);
          setClipStatusDone($);
          $(".stop-clipping-button").addClass("a-tag-disabled");

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
      },
      success: function(result,status,xhr) {
        if (result.success) {
		      toggleProfessionalPrompt($, result);
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
          toggleProfessionalPrompt($, result);
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
      },
      success: function(result,status,xhr) {
        if (result.success) {
          toggleProfessionalPrompt($, result);
          
          switch (route) {
            case "videos":
              toggleVideosNotification($, result, username, ID, email, passwordHash);
              break;
            case "account":
              toggleAccountNotification($, result, username, ID, email, passwordHash);
              break;
            case "defaults":
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

// Toggles the professional prompt if the professional subscription is active
function toggleProfessionalPrompt($, result) {
  if (result.active_subscription == "716") { // If they are professional.
    $(".upgrade-to-professional-prompt").hide(); 
  }
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
  
  // Logic now based on the specific route
  var pageURL = $(location).attr("href").split(".com/");
  if (pageURL.length >= 1) {

    // Dashboard route
    if (pageURL[1].startsWith("dashboard")) {
      var urlParams = new URLSearchParams(window.location.search);
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
          return;
        }
      }
      
      // If we can authenticate get the dashboard elements
      if (canAuth) {
      	dashboardAuthenticator($, theUser.username, theUser.id, theUser.email, theUser.subscriptions, theUser.unique_identifier, theUser.payments);
      }
    } else if (pageURL[1].startsWith("register") && canAuth) { // If we are on the register route, and we are already logged in redirect to dashboard.
        window.location.href = "https://twitchautomator.com/dashboard/";
    } else if (pageURL[1].startsWith("videos")) { // Videos route
        notificationsAuth($, theUser.username, theUser.id, theUser.email, theUser.subscriptions, theUser.unique_identifier, theUser.payments, "videos");
    } else if (pageURL[1].startsWith("account")) { // Account route
        notificationsAuth($, theUser.username, theUser.id, theUser.email, theUser.subscriptions, theUser.unique_identifier, theUser.payments, "account");
    } else if (pageURL[1].startsWith("defaults")) { // Defaults route
        var urlParams = new URLSearchParams(window.location.search);
        var isThumbnailSuccess = urlParams.get("thumbnail_upload");
        var thumbnailGame = urlParams.get("gameName");
        var fileName = urlParams.get("fileName");
        if (isThumbnailSuccess) {
          if (isThumbnailSuccess == "true") {
            uploadThumbnailToBackendServer($, theUser.username, theUser.id, theUser.email, theUser.unique_identifier, thumbnailGame, fileName);
            getAndPopulateGames($);
            $("#thumbnails-default-subsection").toggle();
            $("html, body").animate({ scrollTop: $('#thumbnails-top-table').offset().top + 25}, 2000);
          }
        }

        notificationsAuth($, theUser.username, theUser.id, theUser.email, theUser.subscriptions, theUser.unique_identifier, theUser.payments, "defaults");
        defaultSettings($, theUser.username, theUser.id, theUser.email, theUser.unique_identifier);
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
