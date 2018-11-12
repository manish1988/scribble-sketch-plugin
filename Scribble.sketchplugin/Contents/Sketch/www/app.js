@import 'www/MochaJSDelegate.js'
@import 'www/utils.js'
@import 'www/specs.js'

const sketchDom = require('sketch/dom');
const sketch = require('sketch');

var cfPluginVersion = "1.0.1",
    cfURLPrefix = "https://www.canvasflip.com",
    cfURLSocket = "https://www.canvasflip.com:3000",
    //cfURLPrefix = "http://192.168.0.199/canvasflip_fixes",
    //cfURLSocket = "http://192.168.0.199:3000",
    totalArtboardsForSync = 0;

function openLogin(context, cfToken) {
    var url = utils.getPluginPath(context) + "/www/html/login.html",
        settings = {
            //whatever settings data need to be passed to webview
            cfURLPrefix: cfURLPrefix,
            cfPluginVersion: cfPluginVersion
        },
        state = 1;

    utils.sketchLog(context, "openLogin: settings: " + JSON.stringify(settings));

    var webView = utils.renderWebView(context, url, 300, 437, settings, state, function(webViewPanel, NSApp, webViewRequest, webViewData, windowObject) {
        //execute action received from webview
        if (webViewRequest == "login") {
            //create cfToken and store
            cfToken = {
                username: webViewData.name,
                userid: webViewData.id,
                token: webViewData.token
            }
            utils.setUserDefaultsValue(context, "cfToken", cfToken);
            utils.sketchLog(context, "openLogin: click login: " + JSON.stringify(cfToken));

            //open sync artboards panel
            webViewPanel.orderOut(nil);
            NSApp.stopModal();
            syncArtboards(context);
        }

        if (webViewRequest == "forgot-pwd") {
            utils.sketchLog(context, "openLogin: click forgot-pwd");
            var url = [NSURL URLWithString:@"https://canvasflip.com/#/forgotpwd"]
            [[NSWorkspace sharedWorkspace] openURL:url]
        }

        if (webViewRequest == "create-new-account") {
            utils.sketchLog(context, "openLogin: click create-new-account");
            var url = [NSURL URLWithString:@"https://www.canvasflip.com/visual-inspector/scribble/"]
            [[NSWorkspace sharedWorkspace] openURL:url]
        }

        if (webViewRequest == "get-latest-plugin") {
            utils.sketchLog(context, "openLogin: click get-latest-plugin");
            var url = [NSURL URLWithString:@"https://www.canvasflip.com/visual-inspector/scribble/"]
            [[NSWorkspace sharedWorkspace] openURL:url]
        }
    });
}

function openReportIssue(context, cfToken){
    var url = utils.getPluginPath(context) + "/www/html/report.html",
        username = cfToken ? new String(cfToken.username).toString() : nil,
        userid = cfToken ? new String(cfToken.userid).toString() : nil,
        token = cfToken ? new String(cfToken.token).toString() : nil,
        settings = {
            //whatever settings data need to be passed by webview
            cfURLPrefix: cfURLPrefix,
            cfPluginVersion: cfPluginVersion,
            cfToken: {
                username: username,
                userid: userid,
                token: token
            }
        },
        state = 1;

    utils.sketchLog(context, "openReportIssue: settings: " + JSON.stringify(settings));
    var webView = utils.renderWebView(context, url, 300, 437, settings, state, function(webViewPanel, NSApp, webViewRequest, webViewData, windowObject) {
        //execute action received from webview
        if (webViewRequest == "report") {
            utils.sketchLog(context, "openReportIssue: click report");

            //read log and send
            var root = "/private/var/log/system.log";
            var sysLogs = [NSString stringWithContentsOfFile:root encoding:NSUTF8StringEncoding error:nil]

            // first, separate by new line
            var logs = [sysLogs componentsSeparatedByCharactersInSet:[NSCharacterSet newlineCharacterSet]],
            filteredLogs = [];

            //filter cf logs
            for (var i = 0; i <= 100; i++) {
                filteredLogs.push(logs[i]);
            }

            filteredLogs = filteredLogs.join("\n");
            windowObject.evaluateWebScript("reportIssue(" + JSON.stringify(filteredLogs) + ")");
        }
    });
}

function openSyncArtboards(context, cfToken) {
    var url = utils.getPluginPath(context) + "/www/html/sync.html",
        username = cfToken ? new String(cfToken.username).toString() : nil,
        userid = cfToken ? new String(cfToken.userid).toString() : nil,
        token = cfToken ? new String(cfToken.token).toString() : nil,
        projectId = utils.getUserDefaultsValue(context, "cfProjectId"),
        isSyncAll = utils.getUserDefaultsValue(context, "cfIsSyncAll"),
        state = 1;

    //change values to string to pass inside the webview
    projectId = projectId ? new String(projectId).toString() : nil;
    isSyncAll = isSyncAll ? new String(isSyncAll).toString() : "false";

    var settings = {
        //whatever settings data need to be passed by webview
        cfURLPrefix: cfURLPrefix,
        cfURLSocket: cfURLSocket,
        cfPluginVersion: cfPluginVersion,
        projectScales: utils.projectScales,
        projectId: projectId,
        isSyncAll: isSyncAll,
        cfToken: {
            username: username,
            userid: userid,
            token: token
        }
    };

    utils.sketchLog(context, "openSyncArtboards: settings: " + JSON.stringify(settings));
    utils.renderWebView(context, url, 300, 437, settings, state, function(webViewPanel, NSApp, webViewRequest, webViewData, windowObject) {
        //execute action received from webview
        if (webViewRequest == "sync-start") {
            var document = sketchDom.getSelectedDocument(),
                selection = nil,
                totalArtboardsForSync = 0;

            //save selected project and scale values as default for next time
            utils.setUserDefaultsValue(context, "cfProjectId", webViewData.projectId);
            utils.setUserDefaultsValue(context, "cfIsSyncAll", webViewData.isSyncAll);
            utils.sketchLog(context,"openSyncArtboards: cfProjectId: " + webViewData.projectId);

            if(webViewData.isSyncAll == "true") {
                //sync all artboards
                selection = context.document.currentPage().artboards();
                utils.sketchLog(context, "openSyncArtboards: selected all artboards");
            } else {
                //sync selected artboard
                selection = context.selection;

                var selectedArtboardsLoop = selection.objectEnumerator();
                var selected = false;
                while (msArtboard = selectedArtboardsLoop.nextObject()) {
                    if (msArtboard instanceof MSArtboardGroup) {
                        selected = true;
                    }
                }
                if (!selected) {
                    //reset sync button
                    windowObject.evaluateWebScript("ActivateSyncButton()");
                    utils.triggerError("No artboards selected.", "Select at least one artboard and try to sync again.");
                    return false;
                }
                utils.sketchLog(context, "openSyncArtboards: selected " + context.selection.length + " artboards");
            }

            //now sync artboards async
            COScript.currentCOScript().setShouldKeepAround_(true);
            specsObject = new Specs();
            specsObject.init(context);

            //now sync all artboards
            utils.sketchLog(context, "openSyncArtboards: now sync artboards.");
            var artboards = selection.objectEnumerator(),
                syncArtboardsDataArray = [],
                artboardWeight = 1000;

            while (msArtboard = artboards.nextObject()) {
                if (msArtboard.className() == "MSArtboardGroup") {
                    var filename = utils.escapedFileName(msArtboard.name()) + ".png";
                    var thumbnailPath = NSTemporaryDirectory() + msArtboard.objectID() + '/' + msArtboard.name() + '_thumb.png';
                    var path = NSTemporaryDirectory() + msArtboard.objectID() + '/' + msArtboard.name() + '.png';
                    var syncArtboardsData = {
                        filename: filename
                    };
                    
                    //get specs
                    utils.sketchLog(context,"getArtboard: start:" + filename);
                    var specs = specsObject.getArtboard(msArtboard, [], null, null, null);
                    utils.sketchLog(context,"getArtboard: end.");

                    //save thumbnail file to temp path
                    var scale = parseFloat(250 / msArtboard.frame().width()).toFixed(2);
                    var contextDocument = context.document;
                    var request = MSExportRequest.new();
                    request.rect = msArtboard.absoluteInfluenceRect();
                    request.format = 'png';
                    request.scale = scale;
                    request.includeArtboardBackground = true;
                    [contextDocument saveExportRequest:request toFile:thumbnailPath]
                    utils.sketchLog(context, "openSyncArtboards: saveArtboardOrSlice thumbnail complete - filename - " + filename);
                    
                    //iterate through all text layers and hide it before taking screenshot image
                    specsObject.showHideArtboardTextLayers(msArtboard, specs.layers, false);
                    sketch.getSelectedDocument().sketchObject.documentData().invalidateAffectedSymbolInstances();

                    //save file to temp path
                    var contextDocument = context.document;
                    var request = MSExportRequest.new();
                    request.rect = msArtboard.absoluteInfluenceRect();
                    request.format = 'png';
                    request.includeArtboardBackground = true;
                    [contextDocument saveExportRequest:request toFile:path]
                    utils.sketchLog(context, "openSyncArtboards: saveArtboardOrSlice complete - filename - " + filename);
                    
                    //iterate through all text layers and show it
                    specsObject.showHideArtboardTextLayers(msArtboard, specs.layers, true);

                    var dataImgAttrs = [[NSFileManager defaultManager] attributesOfItemAtPath:path error:nil],
                        dataImgSize = dataImgAttrs.fileSize();
                    if (dataImgSize >= 15728640) {
                        utils.sketchLog(context, "openSyncArtboards: file size is more than 15MB: " + dataImgSize);
                        utils.triggerError("Large artboard size.", "The artboard you want to sync has size more than allowed upload size(15MB).");
                    } else {
                        //read file content and convert to base64
                        var thumbURL = NSURL.fileURLWithPath(thumbnailPath);
                        var thumbImg = [[NSData alloc] initWithContentsOfURL:thumbURL];
                        var thumbBase64 = thumbImg.base64EncodedStringWithOptions(0);
                        utils.sketchLog(context, "openSyncArtboards: thumbBase64 generated");
                        
                        //read file content and convert to base64
                        var dataURL = NSURL.fileURLWithPath(path);
                        var dataImg = [[NSData alloc] initWithContentsOfURL:dataURL];
                        var base64 = dataImg.base64EncodedStringWithOptions(0);
                        utils.sketchLog(context, "openSyncArtboards: base64 generated");

                        syncArtboardsData.height = msArtboard.frame().height();
                        syncArtboardsData.width = msArtboard.frame().width();
                        syncArtboardsData.projectId = webViewData.projectId;
                        syncArtboardsData.isSyncAll = webViewData.isSyncAll;
                        syncArtboardsData.userId = userid;
                        syncArtboardsData.token = token;
                        syncArtboardsData.specs = specs;
                        syncArtboardsData.weight = artboardWeight;

                        //increment artboardWeight
                        artboardWeight = artboardWeight + 1;

                        syncArtboardsDataArray.push({
                            data: syncArtboardsData,
                            base64: base64,
                            thumbBase64: thumbBase64
                        });
                        utils.sketchLog(context, "openSyncArtboards: syncArtboardsData: " + JSON.stringify(syncArtboardsData));
                    }
                } else {
                    utils.sketchLog(context, "openSyncArtboards: artboard is not of MSArtboardGroup type - " + msArtboard.name());
                }
            }

            //first get the totalArtboardsForSync
            totalArtboardsForSync = selection.length;
            windowObject.evaluateWebScript("SyncArtboardInit(" + totalArtboardsForSync + ")");

            //loop and upload all artboards
            for (var i = 0; i < syncArtboardsDataArray.length; i++) {
                windowObject.evaluateWebScript("SyncArtboard(" + JSON.stringify(syncArtboardsDataArray[i].data) + ", '" + syncArtboardsDataArray[i].base64 + "', '" + syncArtboardsDataArray[i].thumbBase64 + "')");
            }
        }

        if (webViewRequest == "logout") {
            utils.sketchLog(context, "openSyncArtboards: click logout");
            utils.removeUserDefaultsValue(context, "cfToken");

            //open login panel
            webViewPanel.orderOut(nil);
            NSApp.stopModal();
            syncArtboards(context);
        }

        if (webViewRequest == "go-to-preview") {
            var url = [NSURL URLWithString:webViewData.projectLink]
            utils.sketchLog(context, "openSyncArtboards: click go-to-preview: " + url);
            [[NSWorkspace sharedWorkspace] openURL:url]
        }

        if (webViewRequest == "get-latest-plugin") {
            utils.sketchLog(context, "openSyncArtboards: click get-latest-plugin");
            var url = [NSURL URLWithString:@"https://www.canvasflip.com/visual-inspector/scribble/"]
            [[NSWorkspace sharedWorkspace] openURL:url]
        }
    });
}

function openSyncBackArtboards(context, cfToken) {
    var url = utils.getPluginPath(context) + "/www/html/sync-back.html",
        username = cfToken ? new String(cfToken.username).toString() : nil,
        userid = cfToken ? new String(cfToken.userid).toString() : nil,
        token = cfToken ? new String(cfToken.token).toString() : nil,
        projectId = utils.getUserDefaultsValue(context, "cfProjectId"),
        isSyncAll = utils.getUserDefaultsValue(context, "cfIsSyncAll"),
        state = 1;

    //change values to string to pass inside the webview
    projectId = projectId ? new String(projectId).toString() : nil;
    isSyncAll = isSyncAll ? new String(isSyncAll).toString() : "false";

    var settings = {
        //whatever settings data need to be passed by webview
        cfURLPrefix: cfURLPrefix,
        cfURLSocket: cfURLSocket,
        cfPluginVersion: cfPluginVersion,
        projectScales: utils.projectScales,
        projectId: projectId,
        isSyncAll: isSyncAll,
        cfToken: {
            username: username,
            userid: userid,
            token: token
        }
    };

    utils.sketchLog(context, "openSyncBackArtboards: settings: " + JSON.stringify(settings));
    utils.renderWebView(context, url, 300, 437, settings, state, function(webViewPanel, NSApp, webViewRequest, webViewData, windowObject) {
        //execute action received from webview
        if (webViewRequest == "sync-back-init") {
            var document = sketchDom.getSelectedDocument(),
                selection = nil;

            //save selected project and scale values as default for next time
            utils.setUserDefaultsValue(context, "cfProjectId", webViewData.projectId);
            utils.setUserDefaultsValue(context, "cfIsSyncAll", webViewData.isSyncAll);
            utils.sketchLog(context,"openSyncBackArtboards: cfProjectId: " + webViewData.projectId);

            if(webViewData.isSyncAll == "true") {
                //sync all artboards
                selection = context.document.currentPage().artboards();
                utils.sketchLog(context, "openSyncBackArtboards: selected all artboards");
            } else {
                //sync selected artboard
                selection = context.selection;

                var selectedArtboardsLoop = selection.objectEnumerator();
                var selected = false;
                while (msArtboard = selectedArtboardsLoop.nextObject()) {
                    if (msArtboard instanceof MSArtboardGroup) {
                        selected = true;
                    }
                }
                if (!selected) {
                    //reset sync button
                    windowObject.evaluateWebScript("ActivateSyncButton()");
                    utils.triggerError("No artboards selected.", "Select at least one artboard and try to sync again.");
                    return false;
                }
                utils.sketchLog(context, "openSyncBackArtboards: selected " + context.selection.length + " artboards");
            }
            
            //now sync all artboards
            utils.sketchLog(context, "openSyncBackArtboards: now sync back artboards.");
            var artboards = selection.objectEnumerator(),
                artboardNames = [],
                syncArtboardsData = {},
                artboardWeight = 1000;

            while (msArtboard = artboards.nextObject()) {
                if (msArtboard.className() == "MSArtboardGroup") {
                    var artboardName = utils.escapedFileName(msArtboard.name());
                    artboardNames.push(artboardName);
                } else {
                    utils.sketchLog(context, "openSyncBackArtboards: artboard is not of MSArtboardGroup type - " + msArtboard.name());
                }
            }
            
            syncArtboardsData.artboards = artboardNames.join(",");
            syncArtboardsData.projectId = webViewData.projectId;
            syncArtboardsData.userId = userid;
            syncArtboardsData.token = token;
            syncArtboardsData.isSyncAll = webViewData.isSyncAll;

            windowObject.evaluateWebScript("SyncBackArtboardInit(" + JSON.stringify(syncArtboardsData) + ")");
        }
        
        //execute action received from webview
        if (webViewRequest == "sync-back-start") {
            var projectId = webViewData.projectId;
            var isSyncAll = webViewData.isSyncAll;
            var projectUUID = webViewData.projectUUID;
            var pageUUID = webViewData.pageUUID;
            var syncBackArtboards = webViewData.artboards;
            utils.sketchLog(context,"openSyncBackArtboards: sync-back-start");
            
            //get all artboards
            var document = sketchDom.getSelectedDocument();

            //now sync back artboards async
            COScript.currentCOScript().setShouldKeepAround_(true);
            specsObject = new Specs();
            specsObject.init(context, document);

            for (var i = 0; i < syncBackArtboards.length; i++) {
                //loop through all artboards
                var selection = context.document.currentPage().artboards();
                var artboards = selection.objectEnumerator();
                while (msArtboard = artboards.nextObject()) {
                    //validate artboard type
                    if (msArtboard.className() == "MSArtboardGroup") {
                        //validate name
                        var artboardName = utils.escapedFileName(msArtboard.name());
                        if(syncBackArtboards[i].name == artboardName) {
                            //sync back
                            utils.sketchLog(context,"setArtboard: start:" + artboardName);
                            var specs = specsObject.setArtboard(msArtboard, syncBackArtboards[i].scribble, null, null);
                            utils.sketchLog(context,"setArtboard: end.");
                        }
                    } else {
                        utils.sketchLog(context, "openSyncBackArtboards: artboard is not of MSArtboardGroup type - " + msArtboard.name());
                    }
                }
            }
            
            windowObject.evaluateWebScript("SyncBackArtboardProgressComplete(" + projectId + ", '" + isSyncAll + "', '" + projectUUID + "', '" + pageUUID + "')");
        }

        if (webViewRequest == "logout") {
            utils.sketchLog(context, "openSyncBackArtboards: click logout");
            utils.removeUserDefaultsValue(context, "cfToken");

            //open login panel
            webViewPanel.orderOut(nil);
            NSApp.stopModal();
            syncArtboards(context);
        }

        if (webViewRequest == "go-to-preview") {
            var url = [NSURL URLWithString:webViewData.projectLink]
            utils.sketchLog(context, "openSyncBackArtboards: click go-to-preview: " + url);
            [[NSWorkspace sharedWorkspace] openURL:url]
        }

        if (webViewRequest == "get-latest-plugin") {
            utils.sketchLog(context, "openSyncBackArtboards: click get-latest-plugin");
            var url = [NSURL URLWithString:@"https://www.canvasflip.com/visual-inspector/scribble/"]
            [[NSWorkspace sharedWorkspace] openURL:url]
        }
    });
}