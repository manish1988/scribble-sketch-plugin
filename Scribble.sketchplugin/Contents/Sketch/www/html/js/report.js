var webViewInit=function(e){window.settings=e,window.webViewData=null,$("#reportBtn").on("click",function(e){$(this).html("<div class='btn-loader-msg'>Please Wait</div><div class='btn-loader btn-loader-small btn-loader-blue'></div>").attr("disabled",!0),window.location.hash="report",window.location.hash=""})},reportIssue=function(e){$.ajax({url:window.settings.cfURLPrefix+"/vi/svcs/scribble/sketch/sketchReportIssue.php",data:{email:null!=window.settings.cfToken.username?window.settings.cfToken.username:"",userid:null!=window.settings.cfToken.userid?window.settings.cfToken.userid:"",token:null!=window.settings.cfToken.token?window.settings.cfToken.token:"",comment:$("#reportText").val(),log:e},type:"POST",cache:!1,dataType:"json",success:function(e){reportSuccess()},error:function(e){reportSuccess()},fail:function(e){reportSuccess()}})},reportSuccess=function(){$("#reportForm").html("<p class='cf-body-header'>Thanks for reporting the issue!</p><br><p class='cf-body-header'>We are looking into the issue and one of our representative will get in touch with you soon.</p><br>")};