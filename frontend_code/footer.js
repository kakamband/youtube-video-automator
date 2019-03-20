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

var popupWindow = null;
function centeredPopup(url,winName,w,h,scroll){
  var LeftPosition = (screen.width) ? (screen.width-w)/2 : 0;
  var TopPosition = (screen.height) ? (screen.height-h)/2 : 0;
  var settings = 'height='+h+',width='+w+',top='+TopPosition+',left='+LeftPosition+',scrollbars='+scroll+',resizable'
  popupWindow = window.open(url,winName,settings);
}

// Toggles the loading dashboard block
function toggleLoading( $ ) {
  $(".loading-dashboard-block").toggle();
}

// Toggles the professional prompt if the professional subscription is active
function toggleProfessionalPrompt($, result) {
  if (result.active_subscription == "716") { // If they are professional.
    $(".upgrade-to-professional-prompt").hide(); 
  }
}

var gamePlaylistsCombo = [];
var gameCommentsCombo = [];
var gameDescriptionsCombo = [];
var gameTagsCombo = [];

// Function to be called from frontend, to handle deleting a setting
function deleteAddedSetting(name, index) {
  console.log("Clicked this: " + name + " and index: " + index);
  var arr = null;
  switch (name) {
    case "playlist":
      arr = gamePlaylistsCombo;
      break;
    case "comment":
      arr = gameCommentsCombo;
      break;
    case "description":
      arr = gameDescriptionsCombo;
      break;
    case "tag":
      arr = gameTagsCombo;
      break;
    default:
      return;
  }

  var elem = document.getElementById(name + "-" + index);
  elem.parentNode.removeChild(elem);
  arr[parseInt(index)].userRemoved = true;
 }

// draws the playlists that are in the gamePlaylistsCombo box
function drawOptions($, arr, anchor, name) {
  for (var i = 0; i < arr.length; i++) {
    if (!arr[i].drawn && !arr[i].userRemoved) {
      var uniqueName = name + "-" + i;
      $("<div id=\"" + uniqueName + "\"><strong>" + arr[i].gameName + ": </strong>" + arr[i].playlistID + "<span class=\"remove-defaults-cross\" style=\"display: inline-block; color: red; margin-left: 30px;\" onclick=\"deleteAddedSetting('" + name + "', " + i + ")\">&#10006;</span></div>").insertAfter(anchor);
      arr[i].drawn = true;
    }
  }
}

// Updates a setting in the backend
function updateSetting($, username, ID, email, pass) {

}

// Watches the default settings for changes
function defaultSettings($, username, ID, email, pass) {
  $("#min-vid-default-setting").click(function() {
    $("#min-vid-subsection").toggle();
  });
  $("#save-min-vid-value").click(function() {
    var stepVal = $("#min-vid-input").val();
    if (stepVal != "") {
      $(".invalid-min-vid-prompt").hide();
      var stepParsed = parseInt(stepVal);
      if (stepParsed < 2) {
        $("#min-vid-input").attr("value", "2");
        stepParsed = 2;
      } else if (stepParsed > 24) {
        $("#min-vid-input").attr("value", "24");
        stepParsed = 24;
      }

      $("#min-vid-value").text(stepParsed);
    } else {
      $(".invalid-min-vid-prompt").show();
      $(".invalid-min-vid-prompt").css('display','inline-block');
    }
  });
  $("#max-vid-default-setting").click(function() {
    $("#max-vid-subsection").toggle();
  });
  $("#playlists-default-setting").click(function() {
    $("#playlists-vid-subsection").toggle();
  });
  $("#add-playlist").click(function() {
    if ($("#playlist-game-input").val() == "" || $("#playlist-id-input").val() == "") {
      $(".max-playlists").hide();
      $(".invalid-playlist-combo").show();
      if ($(".invalid-playlist-combo").is(':visible'))
        $(".invalid-playlist-combo").css('display','inline-block');
    } else if (gamePlaylistsCombo.length == 15) {
      $(".invalid-playlist-combo").hide();
      $(".max-playlists").show();
      if ($(".max-playlists").is(':visible'))
        $(".max-playlists").css('display','inline-block');
    } else {
      $(".max-playlists").hide();
      $(".invalid-playlist-combo").hide();
      $("#no-playlists-set").hide();
      gamePlaylistsCombo.push({gameName: $("#playlist-game-input").val(), playlistID: $("#playlist-id-input").val(), drawn: false, userRemoved: false});
      drawOptions($, gamePlaylistsCombo, "#playlists-set-header", "playlist");
      $("#playlist-game-input").val("");
      $("#playlist-id-input").val("");
    }
  });
  $("#comments-default-setting").click(function() {
    $("#comments-vid-subsection").toggle();
  });
  $("#add-comment").click(function() {
    if ($("#comments-game-input").val() == "" || $("#comments-id-input").val() == "") {
      $(".max-comments").hide();
      $(".invalid-comments-combo").show();
      if ($(".invalid-comments-combo").is(':visible'))
        $(".invalid-comments-combo").css('display','inline-block');
    } else if (gameCommentsCombo.length == 45) {
      $(".invalid-comments-combo").hide();
      $(".max-comments").show();
      if ($(".max-comments").is(':visible'))
        $(".max-comments").css('display','inline-block');
    } else {
      $(".max-comments").hide();
      $(".invalid-comments-combo").hide();
      $("#no-comments-set").hide();
      gameCommentsCombo.push({gameName: $("#comments-game-input").val(), playlistID: $("#comments-id-input").val(), drawn: false, userRemoved: false});
      drawOptions($, gameCommentsCombo, "#comments-set-header", "comment");
      $("#comments-game-input").val("");
      $("#comments-id-input").val("");
    }
  });
  $("#like-default-setting").click(function() {
    $("#like-default-subsection").toggle();
  });
  $("#thumbnails-default-setting").click(function() {
    $("#thumbnails-default-subsection").toggle();
  });
  $("#category-default-setting").click(function() {
    $("#category-default-subsection").toggle();
  });
  $("#description-default-setting").click(function() {
    $("#default-description-subsection").toggle();
  });
  $("#add-description").click(function() {
    if ($("#descriptions-game-input").val() == "" || $("#descriptions-id-input").val() == "") {
      $(".max-descriptions").hide();
      $(".invalid-descriptions-combo").show();
      if ($(".invalid-descriptions-combo").is(':visible'))
        $(".invalid-descriptions-combo").css('display','inline-block');
    } else if (gameCommentsCombo.length == 10) {
      $(".invalid-descriptions-combo").hide();
      $(".max-descriptions").show();
      if ($(".max-descriptions").is(':visible'))
        $(".max-descriptions").css('display','inline-block');
    } else {
      $(".max-descriptions").hide();
      $(".invalid-descriptions-combo").hide();
      $("#no-descriptions-set").hide();
      gameDescriptionsCombo.push({gameName: $("#descriptions-game-input").val(), playlistID: $("#descriptions-id-input").val(), drawn: false, userRemoved: false});
      drawOptions($, gameDescriptionsCombo, "#descriptions-set-header", "description");
      $("#descriptions-game-input").val("");
      $("#descriptions-id-input").val("");
    }
  });
  $("#tags-default-setting").click(function() {
    $("#default-tags-subsection").toggle();
  });
  $("#add-tag").click(function() {
    if ($("#tags-game-input").val() == "" || $("#tags-id-input").val() == "") {
      $(".max-tags").hide();
      $(".invalid-tags-combo").show();
      if ($(".invalid-tags-combo").is(':visible'))
        $(".invalid-tags-combo").css('display','inline-block');
    } else if (gameCommentsCombo.length == 100) {
      $(".invalid-descriptions-tags").hide();
      $(".max-tags").show();
      if ($(".max-tags").is(':visible'))
        $(".max-tags").css('display','inline-block');
    } else {
      $(".max-tags").hide();
      $(".invalid-descriptions-tags").hide();
      $("#no-tags-set").hide();
      gameTagsCombo.push({gameName: $("#tags-game-input").val(), playlistID: $("#tags-id-input").val(), drawn: false, userRemoved: false});
      drawOptions($, gameTagsCombo, "#tags-set-header", "tag");
      $("#tags-game-input").val("");
      $("#tags-id-input").val("");
    }
  });
  $("#language-default-setting").click(function() {
    $("#language-default-subsection").toggle();
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
    if ($("#stream-name-input").val().startsWith("https://twitch.tv/")) {
      $("#bad-stream-link-text").hide();
    } else {
      $("#bad-stream-link-text").show();
    }
  });
  $("#youtube-settings-link").click(function() {
    window.location.href = "https://twitchautomator.com/defaults";
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
        }
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
     }
    }
  }
  
  if (showNotification) {
    $(".defaults-intro-notification").show();
    $(".close-notification").click(function() {
      closeNotification($, "defaults-intro", username, ID, email, passwordHash); 
    });
  }
}

// Toggles the account notifications if they are set or not
function toggleAccountNotification($, result, username, ID, email, passwordHash) {  
  var showNotification = false;
  if (result.notifications.length > 0) {
    for (var i = 0; i < result.notifications.length; i++) {
     if (result.notifications[i].notification == "account-intro") {
       showNotification = true;
     }
    }
  }
  
  if (showNotification) {
    $(".account-notification-container").show();
    $(".close-notification").click(function() {
      closeNotification($, "account-intro", username, ID, email, passwordHash); 
    });
  }
}

// Toggles the video notifications if they are set or not
function toggleVideosNotification($, result, username, ID, email, passwordHash) {  
  var showNotification = false;
  if (result.notifications.length > 0) {
    for (var i = 0; i < result.notifications.length; i++) {
     if (result.notifications[i].notification == "videos-intro") {
       showNotification = true;
     }
    }
  }
  
  if (showNotification) {
    $(".videos-notification-container").show();
    $(".close-notification").click(function() {
      closeNotification($, "videos-intro", username, ID, email, passwordHash); 
    });
  }
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
          foundAuth($, username, ID, email, pass);
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
              break;
          }
        } else {
          console.log("Unsuccesfully authenticated.");
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

// Intro point.
jQuery(document).ready(function( $ ){
  // Can we authenticate with the host server. This is only possible if a user has been logged into the frontend.
  var canAuth = (theUser.username != "" && theUser.id != 0 && theUser.email != "" && theUser.unique_identifier != "");

  // Hide the authenticate with youtube block unless we actually need it
  $(".authenticate-with-youtube-block").hide();
  
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
        notificationsAuth($, theUser.username, theUser.id, theUser.email, theUser.subscriptions, theUser.unique_identifier, theUser.payments, "defaults");
        defaultSettings($, theUser.username, theUser.id, theUser.email, theUser.unique_identifier);
    } else {
      if (canAuth) {
      	authenticateWithAutoTuberHost($, theUser.username, theUser.id, theUser.email, theUser.subscriptions, theUser.unique_identifier, theUser.payments);
      }
    }
  }
});