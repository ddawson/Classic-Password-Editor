/*
    Classic Password Editor, extension for Gecko applications
    Copyright (C) 2017  Daniel Dawson <danielcdawson@gmail.com>

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

"use strict";

var EXPORTED_SYMBOLS = [];

const Cc = Components.classes,
      Ci = Components.interfaces,
      Cu = Components.utils,
      SEAMONKEY = "{92650c4d-4b8e-4d2a-b7eb-24ecf4f6b63a}",
      THUNDERBIRD = "{3550f703-e582-4d05-9a08-453d09bdfdc6}",
      PREFNAME = "currentVersion",
      THISVERSION = "1.0",
      WELCOMEVERSION = "1.0",
      CONTENT = "chrome://classicpasswordeditor/content/",
      WELCOMEURL = CONTENT + "welcome.xhtml",
      WELCOMEURL_SM = CONTENT + "welcome_sm.xhtml";

var timer;

function welcome () {
  var wm = Cc["@mozilla.org/appshell/window-mediator;1"].
           getService(Ci.nsIWindowMediator),
      appId = Cc["@mozilla.org/xre/app-info;1"].
              getService(Ci.nsIXULAppInfo).ID;

  switch (appId) {
  case SEAMONKEY:
    var curWin = wm.getMostRecentWindow("navigator:browser");

    if (!curWin) {
      var cmdLine = {
        handleFlagWithParam: flag => flag == "browser" ? WELCOMEURL_SM : null,
        handleFlag: () => false,
        preventDefault: true
      };

      const clh_prefix = 
        "@mozilla.org/commandlinehandler/general-startup;1";
      Cc[clh_prefix + "?type=browser"].
        getService(Ci.nsICommandLineHandler).handle(cmdLine);
    } else
      curWin.gBrowser.selectedTab = curWin.gBrowser.addTab(WELCOMEURL_SM);
    break;

  case THUNDERBIRD:
    var curWin = wm.getMostRecentWindow("mail:3pane");
    curWin.focus();
    curWin.document.getElementById("tabmail").openTab(
      "contentTab", { contentPage: WELCOMEURL });
    break;
  }
}

function set_welcome () {
  try {
    Cu.import("resource:///modules/CustomizableUI.jsm", {});
    return;  /* Don't do it on Australis */
  } catch (e) {}

  timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
  timer.initWithCallback({ notify: function () { welcome(); } },
                         500, Ci.nsITimer.TYPE_ONE_SHOT);
}

{
  let prefs = Cc["@mozilla.org/preferences-service;1"].
              getService(Ci.nsIPrefService).
              getBranch("extensions.classicpasswordeditor.");

  if (prefs.prefHasUserValue(PREFNAME)) {
    let vc = Cc["@mozilla.org/xpcom/version-comparator;1"].
             getService(Ci.nsIVersionComparator),
        lastVersion = prefs.getCharPref(PREFNAME);
    if (vc.compare(lastVersion, WELCOMEVERSION) < 0)
      set_welcome();
    if (vc.compare(lastVersion, THISVERSION) < 0)
      prefs.setCharPref(PREFNAME, THISVERSION);
  } else {
    set_welcome();
    prefs.setCharPref(PREFNAME, THISVERSION);
  }
}
