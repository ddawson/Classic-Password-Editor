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

const Cc = Components.classes,
      Ci = Components.interfaces,
      Cu = Components.utils;
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");

var EXPORTED_SYMBOLS = ["ClassicPasswordEditor"];

XPCOMUtils.defineLazyGetter(
  this, "prefs", () =>
    Cc["@mozilla.org/preferences-service;1"].
      getService(Ci.nsIPrefService).
      getBranch("extensions.classicpasswordeditor."));
XPCOMUtils.defineLazyServiceGetter(
  this, "pwdSvc",
  "@mozilla.org/login-manager;1", "nsILoginManager");
XPCOMUtils.defineLazyServiceGetter(
  this, "stringSvc",
  "@mozilla.org/intl/stringbundle;1", "nsIStringBundleService");
XPCOMUtils.defineLazyServiceGetter(
  this, "alertsSvc",
  "@mozilla.org/alerts-service;1", "nsIAlertsService");
XPCOMUtils.defineLazyServiceGetter(
  this, "promptSvc",
  "@mozilla.org/embedcomp/prompt-service;1", "nsIPromptService");
XPCOMUtils.defineLazyGetter(
  this, "genStrBundle", () =>
    stringSvc.createBundle(
      "chrome://classicpasswordeditor/locale/cpe.properties"));
XPCOMUtils.defineLazyGetter(
  this, "pmoStrBundle", () =>
    stringSvc.createBundle(
      "chrome://classicpasswordeditor/locale/pwdmgrOverlay.properties"));

const el = (aWindow, aId) => aWindow.document.getElementById(aId);

function showAlert (aMsg) {
  alertsSvc.showAlertNotification(
    "chrome://classicpasswordeditor/skin/logo.svg",
    genStrBundle.GetStringFromName("classicpasswordeditor"), aMsg);
}

var ClassicPasswordEditor = {
  _deleting: false,
  _signonMap: {},

  openSavedPasswords: function () {
    var spWin = Cc["@mozilla.org/appshell/window-mediator;1"].
                  getService(Ci.nsIWindowMediator).
                  getMostRecentWindow("Toolkit:PasswordManager");
    if (spWin)
      spWin.focus();
    else
      Cc["@mozilla.org/embedcomp/window-watcher;1"].
        getService(Ci.nsIWindowWatcher).
        openWindow(
          null, "chrome://passwordmgr/content/passwordManager.xul", "",
          "chrome,titlebar,toolbar,centerscreen,resizable", null);
  },

  updateLoginInfo (aLoginInfo) {
    this.curInfo = aLoginInfo;
  },

  saveLoginInfo: function (aWindow, aEvt) {
    function _finish (aNewSignon) {
      if (!aNewSignon) return;
      try {
        let newSignon = Cc["@mozilla.org/login-manager/loginInfo;1"].
                        createInstance(Ci.nsILoginInfo);
        newSignon.init(aNewSignon.hostname, aNewSignon.formSubmitURL,
                       aNewSignon.httpRealm, aNewSignon.username,
                       aNewSignon.password, aNewSignon.usernameField,
                       aNewSignon.passwordField);
        pwdSvc.addLogin(newSignon);
        showAlert(genStrBundle.GetStringFromName("logininfosaved"));
      } catch (e) {
        promptSvc.alert(
          aWindow,
          genStrBundle.GetStringFromName("error"),
          pmoStrBundle.formatStringFromName("badnewentry", [e.message], 1));
      }
    }

    lsm("Opening dialog");
    var ret = { newSignon: null, callback: _finish, parentWindow: null };
    aWindow.openDialog(
      "chrome://classicpasswordeditor/content/pwdedit.xul", "",
      "centerscreen,dependent,dialog,chrome",
      [this.curInfo], 0, false, ret);
    this.curInfo = null;
  },

  _finishEdit: function (aNewSignon, aParentWindow) {
    if (!aNewSignon) return;

    var newSignon = Cc["@mozilla.org/login-manager/loginInfo;1"].
                    createInstance(Ci.nsILoginInfo);
    newSignon.init(aNewSignon.hostname, aNewSignon.formSubmitURL,
                   aNewSignon.httpRealm, aNewSignon.username,
                   aNewSignon.password, aNewSignon.usernameField,
                   aNewSignon.passwordField);
    try {
      pwdSvc.modifyLogin(ClassicPasswordEditor.oldSignon, newSignon);
      showAlert(genStrBundle.GetStringFromName("logininfochanged"));
    } catch (e) {
      promptSvc.alert(
        aParentWindow,
        genStrBundle.GetStringFromName("error"),
        genStrBundle.formatStringFromName("failed", [e.message], 1));
    }
  },

  _handleDisambigSelection: function (aEvt) {
    var cpe = ClassicPasswordEditor, target = aEvt.target,
        window = target.ownerDocument.defaultView,
        dp = el(window, "classicpasswordeditor-disambig-popup");

    if (cpe._deleting) {
      try {
        pwdSvc.removeLogin(cpe._signonMap[target.label]);
        showAlert(genStrBundle.GetStringFromName("logininfodeleted"));
      } catch (e) {
        promptSvc.alert(
          window,
          genStrBundle.GetStringFromName("error"),
          genStrBundle.formatStringFromName("failed", [e.message], 1));
      }
    } else {
      ClassicPasswordEditor.oldSignon = cpe._signonMap[target.label];
      window.openDialog(
        "chrome://classicpasswordeditor/content/pwdedit.xul", "",
        "centerscreen,dependent,dialog,chrome",
        [ClassicPasswordEditor.oldSignon], 1, false,
        { newSignon: null, callback: cpe._finishEdit, parentWindow: window });
    }

    cpe._deleting = false;
  },

  _showDisambig: function (aWindow, aSignons) {
    var dp = el(aWindow, "classicpasswordeditor-disambig-popup");
    while (dp.hasChildNodes()) dp.removeChild(dp.firstChild);

    this._signonMap = {};
    for (let signon of aSignons) {
      this._signonMap[signon.username] = signon;
      let mi = aWindow.document.createElement("menuitem");
      mi.setAttribute("label", signon.username);
      dp.appendChild(mi);
    }

    dp.addEventListener("command", this._handleDisambigSelection, false);
    var cpe = this;
    dp.addEventListener(
      "popuphidden",
      function _phHandler () {
        dp.removeEventListener("command", cpe._handleDisambigSelection, false);
        dp.removeEventListener("popuphidden", _phHandler, false);
      },
      false);

    var bo = el(aWindow, "contentAreaContextMenu").boxObject,
        x = bo.x, y = bo.y;
    aWindow.setTimeout(
      function () { dp.openPopup(null, null, x, y, true, false, null); }, 1);
  },

  editLoginInfo: function (aWindow) {
    var signons = pwdSvc.findLogins({}, this.curInfo.hostname,
                                    this.curInfo.formSubmitURL, null);
    this.curInfo = null;
    this._deleting = false;

    if (signons.length == 0) {
      promptSvc.alert(
        aWindow,
        genStrBundle.GetStringFromName("error"),
        genStrBundle.GetStringFromName("nologinstoedit"));
    } else if (signons.length == 1) {
      ClassicPasswordEditor.oldSignon = signons[0];
      aWindow.openDialog(
        "chrome://classicpasswordeditor/content/pwdedit.xul", "",
        "centerscreen,dependent,dialog,chrome",
        [signons[0]], 1, false,
        { newSignon: null, callback: this._finishEdit,
          parentWindow: aWindow });
    } else
      this._showDisambig(aWindow, signons);
  },

  deleteLoginInfo: function (aWindow) {
    var signons = pwdSvc.findLogins({}, this.curInfo.hostname,
                                    this.curInfo.formSubmitURL, null);
    this.curInfo = null;
    this._deleting = true;

    if (signons.length == 0) {
      promptSvc.alert(
        aWindow,
        genStrBundle.GetStringFromName("error"),
        genStrBundle.GetStringFromName("nologinstodelete"));
    } else if (signons.length == 1) {
      try {
        let res;
        if (prefs.getBoolPref("confirm_ctxmenu_delete")) {
          let cs = { value: false };
          res = promptSvc.confirmEx(
            aWindow, genStrBundle.GetStringFromName("deletinglogininfo"),
            genStrBundle.GetStringFromName("deletingareyousure"),
            promptSvc.STD_YES_NO_BUTTONS | promptSvc.BUTTON_POS_1_DEFAULT
            | promptSvc.BUTTON_DELAY_ENABLE, null, null, null,
            genStrBundle.GetStringFromName("deletingdontask"), cs);
          if (res == 0 && cs.value)
            prefs.setBoolPref("confirm_ctxmenu_delete", false);
        } else
          res = 0;

        if (res == 0) {
          pwdSvc.removeLogin(signons[0]);
          showAlert(genStrBundle.GetStringFromName("logininfodeleted"));
        }
      } catch (e) {
        promptSvc.alert(
          aWindow,
          genStrBundle.GetStringFromName("error"),
          genStrBundle.formatStringFromName("failed", [e.message], 1));
      }
    } else
      this._showDisambig(aWindow, signons);
  },
};
