/* global firebaseBaseUrl */
/* global signUpSecretKey */
/* global Firebase */
/* global qr */
$(document).ready(function() {
    var ref = new Firebase(firebaseBaseUrl), privTextsRef;
    var authData = ref.getAuth();
    
    location.queryString = {};
    location.search.substr(1).split("&").forEach(function (pair) {
        if (pair === "") return;
        var parts = pair.split("=");
        location.queryString[parts[0]] = parts[1] &&
            decodeURIComponent(parts[1].replace(/\+/g, " "));
    });
    
    var updateQrCodeCanvas = function(input) {
        qr.canvas({
            canvas: document.getElementById('qr-code'),
            value: input,
            size: 10
          });
    };
    
    var performFunc = function() {
       
     var input = $("#input-text-area").val().replace("\n", " ");
     $("#input-text-area").val("");
     
     if (input.length > 0) {
         
         if ($("#save-input-text").is(':checked')) {
             privTextsRef = ref.child("texts/"+authData.uid+"/private");
             privTextsRef.push().set({
                time: parseInt(Date.now() / 1000),
                text: input
              });
         }
         
         $("#code-result").html(input);
     }
     
     updateQrCodeCanvas(input);
    
    }
    
    var updateLTFunc = function(authData) {
       $("#app .container").show();
       $("#user-name").html(authData.google.displayName);
       var uLT = ref.child("users/"+authData.uid+"/lastLogin");
       uLT.once("value", function(snap) {
           var s = new Date(parseInt(snap.val() * 1000)).toISOString();
         $("#user-login-time").show().html(
              s.replace("Z", "").replace("T", " ").substring(0, s.length - 5)
         );
       });
    }
    
    if (authData) {
      updateLTFunc(authData);
      updateQrCodeCanvas("qrSamurai loves you!");
    } else {
       ref.authWithOAuthPopup("google", function(error, data) {
         if (error) {
          console.log("Login Failed!", error);
         } else {
          console.log("Authenticated successfully with payload:", data);

          if (signUpSecretKey == "" || (typeof location.queryString["s"] !== "undefined" &&
              signUpSecretKey == location.queryString["s"])) {
            
            var usersRef = ref.child("users");
            usersRef.child(data.uid).set({
                displayName: data.google.displayName,
                email: data.google.email,
                lastLogin: parseInt(Date.now() / 1000)
              });  
            
          }
          
          var userNameRef = ref.child("users/"+data.uid+"/displayName");
         
          userNameRef.once("value", function(snap) {
              if (snap.val() !== null) {
                  authData = ref.getAuth();
                  updateLTFunc(data);
                  updateQrCodeCanvas("qrSamurai loves you!");
              } else {
                  ref.unauth();
              }
          }, function (err) {
             ref.unauth();
             console.log(err);
          });
          
         } 
       }, { remember: "sessionOnly", scope: "email" });
    }
    
    
    $("#button-logout").click(function(elem) {
      ref.unauth();
      window.location.href = "index.html";
      return false; 
    });
    
    var removeMenuItemsActive = function() {
        $("#navbar li").each(function(elem) {
            $(this).removeClass("active");
        });
        return false;
    };
    $("#navbar li a").click(function(elem) { removeMenuItemsActive(); $(this).parent().addClass("active"); return false; });
    
    $("#link-code-generator").click(function(elem) {
        $("#app #paste-bin").hide();
        $("#app #code-generator").show();
        $("#app #text-form").show();
    });
    
    var pasteBinCount = 0, currentPasteBinPos = 0;
    var loadPasteBinEntries = function(nextMaxCount) {

        privTextsRef.orderByChild("time").limitToLast(nextMaxCount).on('child_added', function(snap) {
            snap = snap.val();
            
            var s = new Date(parseInt(snap.time * 1000)).toISOString();
            
            $("#paste-bin ul").prepend(
                $('<li>').append(s.replace("Z", "").replace("T", " ").substring(0, s.length - 5) + ": " + snap.text)
            );
          });
        currentPasteBinPos = currentPasteBinPos - nextMaxCount;
    };
    
    $("#link-paste-bin").click(function(elem) {
        if (currentPasteBinPos == 0) {
         privTextsRef = ref.child("texts/"+authData.uid+"/private");
         
         privTextsRef.once("value", function(snap) {
                pasteBinCount = snap.numChildren();
                currentPasteBinPos = pasteBinCount;
                $("#app #paste-bin").append("<em>" + (pasteBinCount - 5) + " hidden entries, feature to load more is coming soon ...</em>")
                 loadPasteBinEntries(5);
         });
        }
        $("#app #paste-bin").show();
        $("#app #code-generator").hide();
        $("#app #text-form").hide();
    });
    $("#button-load-next-entries").click(function(elem) {
       loadPasteBinEntries(5); 
    });
    
    $("#button-send-input").click(function(elem) {
        performFunc();
    });
    
    $("#button-logout").click(function(elem) {
      ref.unauth();
      window.location.href = "index.html";
      return false; 
    });
    
});