@import 'www/app.js'

var syncArtboards = function (context) {
    //get token
    var cfToken = utils.getUserDefaultsValue(context, "cfToken");

    if (cfToken) {
        //token available
        utils.sketchLog(context, "syncArtboards: openSyncArtboards");
        openSyncArtboards(context, cfToken);
    } else {
        //token not available
        utils.sketchLog(context, "syncArtboards: openLogin");
        openLogin(context, cfToken);
    }
};

var syncBackArtboards = function (context) {
    //get token
    var cfToken = utils.getUserDefaultsValue(context, "cfToken");

    if (cfToken) {
        //token available
        utils.sketchLog(context, "syncBackArtboards: openSyncBackArtboards");
        openSyncBackArtboards(context, cfToken);
    } else {
        //token not available
        utils.sketchLog(context, "syncBackArtboards: openLogin");
        openLogin(context, cfToken);
    }
};

var reportIssue = function (context) {
    //get token
    var cfToken = utils.getUserDefaultsValue(context, "cfToken");

    if (cfToken) {
        //token available
        utils.sketchLog(context, "reportIssue: logged in");
    } else {
        //token not available
        utils.sketchLog(context, "reportIssue: not logged in");
    }

    openReportIssue(context, cfToken);
};