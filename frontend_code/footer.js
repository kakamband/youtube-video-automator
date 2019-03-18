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

// Specifies that the auth token has been found, and we don't need to authenticate with Youtube anymore.
function foundAuth($, username, ID, email, pass) {
  $(".dashboard-have-auth-token").show();
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
  var removeNotification = true;
  if (result.notifications.length > 0) {
    for (var i = 0; i < result.notifications.length; i++) {
     if (result.notifications[i].notification == "defaults-intro") {
       removeNotification = false;
     }
    }
  }
  
  if (removeNotification) {
    $(".defaults-intro-notification").hide();
  } else {
    $(".close-notification").click(function() {
      closeNotification($, "defaults-intro", username, ID, email, passwordHash); 
    });
  }
}

// Toggles the account notifications if they are set or not
function toggleAccountNotification($, result, username, ID, email, passwordHash) {
  var removeNotification = true;
  if (result.notifications.length > 0) {
    for (var i = 0; i < result.notifications.length; i++) {
     if (result.notifications[i].notification == "account-intro") {
       removeNotification = false;
     }
    }
  }
  
  if (removeNotification) {
    $(".account-notification-container").hide();
  } else {
    $(".close-notification").click(function() {
      closeNotification($, "account-intro", username, ID, email, passwordHash); 
    });
  }
}

// Toggles the video notifications if they are set or not
function toggleVideosNotification($, result, username, ID, email, passwordHash) {
  var removeVideosNotification = true;
  if (result.notifications.length > 0) {
    for (var i = 0; i < result.notifications.length; i++) {
     if (result.notifications[i].notification == "videos-intro") {
       removeVideosNotification = false;
     }
    }
  }
  
  if (removeVideosNotification) {
    $(".videos-notification-container").hide();
  } else {
    $(".close-notification").click(function() {
      closeNotification($, "videos-intro", username, ID, email, passwordHash); 
    });
  }
}

// Toggles the dashboard notifications if they are set or not
function toggleDashboardNotification($, result, username, ID, email, passwordHash) {
  var removeDashboardNotification = true;
  if (result.notifications.length > 0) {
    for (var i = 0; i < result.notifications.length; i++) {
     if (result.notifications[i].notification == "dashboard-intro") {
       removeDashboardNotification = false;
     }
    }
  }
  
  if (removeDashboardNotification) {
    $(".dashboard-into-notification").hide();
  } else {
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
    } else {
      if (canAuth) {
      	authenticateWithAutoTuberHost($, theUser.username, theUser.id, theUser.email, theUser.subscriptions, theUser.unique_identifier, theUser.payments);
      }
    }
  }
});