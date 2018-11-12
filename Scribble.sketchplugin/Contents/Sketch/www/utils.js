var utils = {
    projectScales: [0.5, 1, 1.5, 2, 3],

    isRetinaDisplay: function(){
        return NSScreen.isOnRetinaScreen();
    },

    escapedFileName: function(string){
        var notAllowedChars = [NSCharacterSet characterSetWithCharactersInString:@"\\<>=,!#$&'()*+/:;=?@[]%"];
        var cleanString = [[string componentsSeparatedByCharactersInSet:notAllowedChars] componentsJoinedByString:@""];
        return cleanString;
    },

    isDebugModeEnabled: function(context){
        var debug = NSUserDefaults.standardUserDefaults().objectForKey("isdebug");
        if (debug) {
            return debug;
        } else {
            return 0;
        }
    },

    getUserDefaultsValue: function(context, key){
        var value = NSUserDefaults.standardUserDefaults().objectForKey(key);
        if (value) {
            return value;
        } else {
            return false;
        }
    },

    setUserDefaultsValue: function(context, key, val){
        [[NSUserDefaults standardUserDefaults] setObject:val forKey:key]
        [[NSUserDefaults standardUserDefaults] synchronize]
        this.sketchLog(context,"setUserDefaultsValue(): key:" + key + ", value:" + val);
    },

    removeUserDefaultsValue: function(context, key) {
        NSUserDefaults.standardUserDefaults().removeObjectForKey(key);
        this.sketchLog(context,"removeUserDefaultsValue(): key:" + key);
    },

    sketchLog: function(context, string){
        NSLog("CFLog::" + string)
    },

    triggerError: function(title, text){
        [[NSApplication sharedApplication] displayDialog:text withTitle:title]
        this.sketchLog(context,"triggerError(): title:" + title + ", text:" + text);
    },

    //get plugin path
    getPluginPath: function (context) {
        return context.scriptPath.stringByDeletingLastPathComponent();
    },

    //render web view with settings data
    renderWebView: function(context, url, width, height, settings, state, callback){
    var result = false;
    url = encodeURI("file://" + url);

    COScript.currentCOScript().setShouldKeepAround_(true);

    var webViewPanel = NSPanel.alloc().init();
    webViewPanel.setTitleVisibility(NSWindowTitleHidden);
    webViewPanel.setTitlebarAppearsTransparent(true);
    webViewPanel.standardWindowButton(NSWindowCloseButton).setHidden(false);
    webViewPanel.standardWindowButton(NSWindowMiniaturizeButton).setHidden(true);
    webViewPanel.standardWindowButton(NSWindowZoomButton).setHidden(true);
    webViewPanel.setFrame_display(NSMakeRect(0, 0, width, (height + 32)), false);
    webViewPanel.setBackgroundColor(NSColor.colorWithRed_green_blue_alpha(0.96, 0.96, 0.96, 1));

    var contentView = webViewPanel.contentView(),
        webView = WebView.alloc().initWithFrame(NSMakeRect(0, 0, width, height)),
        windowObject = webView.windowScriptObject(),
        delegate = new MochaJSDelegate();

        delegate.setHandlerForSelector("webView:didFinishLoadForFrame:", function(webView, webFrame){
            //initialize settings
            windowObject.evaluateWebScript("webViewInit(" + JSON.stringify(settings) + ")");
            COScript.currentCOScript().setShouldKeepAround_(false);
        })

        delegate.setHandlerForSelector("webView:didChangeLocationWithinPageForFrame:", function(webView, webFrame){
            var webViewRequest = NSURL.URLWithString(webView.mainFrameURL()).fragment();

            if(webViewRequest == "close") {
                webViewPanel.orderOut(nil);
                NSApp.stopModal();
            } else {
                //get result data and execute callback
                var webViewData = JSON.parse(decodeURI(windowObject.valueForKey("webViewData")));
                callback(webViewPanel, NSApp, webViewRequest, webViewData, windowObject);
                result = true;
            }
            COScript.currentCOScript().setShouldKeepAround_(false);
        });

        contentView.setWantsLayer(true);
        contentView.layer().setFrame( contentView.frame() );
        contentView.layer().setCornerRadius(6);
        contentView.layer().setMasksToBounds(true);

        webView.setBackgroundColor(NSColor.colorWithRed_green_blue_alpha(0.96, 0.96, 0.96, 1));
        webView.setFrameLoadDelegate_(delegate.getClassInstance());
        webView.setMainFrameURL_(url);

        contentView.addSubview(webView);

        var closeButton = webViewPanel.standardWindowButton(NSWindowCloseButton);
        closeButton.setCOSJSTargetFunction(function(sender) {
            var webViewRequest = NSURL.URLWithString(webView.mainFrameURL()).fragment();
            if (state == 0 && webViewRequest == "submit") {
                data = JSON.parse(decodeURI(windowObject.valueForKey("webViewData")));
                callback(data);
            }
            self.wantsStop = true;
            webViewPanel.orderOut(nil);
            NSApp.stopModal();
        });
        closeButton.setAction("callAction:");

        var titlebarView = contentView.superview().titlebarViewController().view(),
            titlebarContainerView = titlebarView.superview();
        closeButton.setFrameOrigin(NSMakePoint(8, 8));
        titlebarContainerView.setFrame(NSMakeRect(0, height, width, 32));
        titlebarView.setFrameSize(NSMakeSize(width, 32));
        titlebarView.setTransparent(true);
        titlebarView.setBackgroundColor(NSColor.colorWithRed_green_blue_alpha(0.9, 0.9, 0.9, 1));
        titlebarContainerView.superview().setBackgroundColor(NSColor.colorWithRed_green_blue_alpha(0.9, 0.9, 0.9, 1));
        
        NSApp.runModalForWindow(webViewPanel);

        return result;
    }
}