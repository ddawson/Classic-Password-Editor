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

Components.utils.import("resource://gre/modules/Services.jsm");

document.addEventListener(
  "DOMContentLoaded",
  function dclHandler (ev) {
    cpEditor.signonBundle = document.getElementById("signonBundle");
    cpEditor.genStrBundle =
      document.getElementById("classicpwdedit-gen-stringbundle");
    cpEditor.pmoStrBundle =
      document.getElementById("classicpwdedit-overlay-stringbundle");
    cpEditor.signonsTree = document.getElementById("signonsTree");
    document.removeEventListener("DOMContentLoaded", dclHandler, false);
  },
  false);

function checkPasswordsShowing () {
  if (window.hasOwnProperty("showingPasswords"))
    return showingPasswords;
  else
    // New versions have the variable hidden away; no way to keep it in sync
    return !document.getElementById("passwordCol").hidden;
}

function showPasswords () {
  if (!checkPasswordsShowing()) {
    let togglePasswords = document.getElementById("togglePasswords");

    if (togglePasswords &&
        (!cpEditor.prefs.getBoolPref("force_prompt_for_masterPassword")
         || masterPasswordLogin(() => true))) {
      if (window.hasOwnProperty("showingPasswords"))
        showingPasswords = true;

      if (window.getLegacyString) {
        togglePasswords.label = getLegacyString("hidePasswords");
        togglePasswords.accessKey = getLegacyString("hidePasswordsAccessKey");
      } else {
        togglePasswords.label =
	  cpEditor.signonBundle.getString("hidePasswords");
        togglePasswords.accessKey =
	  cpEditor.signonBundle.getString("hidePasswordsAccessKey");
      }

      document.getElementById("passwordCol").hidden = false;
      _filterPasswords();
    }
  }
}

window.addEventListener(
  "load",
  function _loadHandler (ev) {
    if (cpEditor.prefs.getBoolPref("always_show_passwords"))
      showPasswords();

    if (cpEditor.prefs.getBoolPref("preselect_current_site")) {
      let wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].
               getService(Components.interfaces.nsIWindowMediator);
      let brWin = wm.getMostRecentWindow("navigator:browser");
      let browser = brWin.gBrowser.selectedBrowser;

      if (brWin) {
        let returnHandler = ({ data: hostname }) => {
          browser.messageManager.removeMessageListener(
            "ClassicPasswordEditor:returnlocation", returnHandler);
          let col = getColumnByName("hostname");

          for (let i = 0; i < cpEditor.signonsTree.view.rowCount; i++)
            if (cpEditor.signonsTree.view.getCellText(i, {id:col.id})
                == hostname) {
              cpEditor.signonsTree.view.selection.select(i);
              setTimeout(
                () => {
                  cpEditor.signonsTree.treeBoxObject.ensureRowIsVisible(i);
                }, 0);
              break;
            }
        };

        browser.messageManager.addMessageListener(
          "ClassicPasswordEditor:returnlocation", returnHandler);
        browser.messageManager.sendAsyncMessage(
          "ClassicPasswordEditor:getlocation");
      }
    }

    var menuBtnAnon =
      document.getAnonymousNodes(document.getElementById("cpeMenuBtn"));
    var innerBtn = menuBtnAnon[1], dropMarker = menuBtnAnon[2];
    innerBtn.removeAttribute("class");
    dropMarker.removeAttribute("class");
    var innerBtnCS = getComputedStyle(innerBtn),
        dropMarkerStl = dropMarker.style;
    dropMarkerStl.marginTop = innerBtnCS.marginTop;
    dropMarkerStl.marginBottom = innerBtnCS.marginBottom;
    window.removeEventListener("load", _loadHandler, false);
  },
  false);

document.getElementById("signonsTree").addEventListener(
  "select",
  () => {
    if (!cpEditor.selectionsEnabled) return;
    var selections = GetTreeSelections(cpEditor.signonsTree);
    if (selections.length > 0
        && (!window.hasOwnProperty("gSelectUserInUse") || !gSelectUserInUse)) {
      document.getElementById("key_editSignon").removeAttribute("disabled");
      document.getElementById("edit_signon").removeAttribute("disabled");
      document.getElementById("visit_site").removeAttribute("disabled");
      document.getElementById("cpeMenuBtn_editSignon").
        removeAttribute("disabled");
      if (!cpEditor.userChangedMenuBtn) {
        document.getElementById("cpeMenuBtn").command = "edit_signon";
        document.getElementById("cpeMenuBtn").
          setAttribute("icon", "properties");
      }
    } else {
      document.getElementById("cpeMenuBtn").command = "new_signon";
      document.getElementById("cpeMenuBtn").setAttribute("icon", "add");
      document.getElementById("key_editSignon").
        setAttribute("disabled", "true");
      document.getElementById("edit_signon").setAttribute("disabled", "true");
      document.getElementById("visit_site").setAttribute("disabled", "true");
      document.getElementById("cpeMenuBtn_editSignon").
        setAttribute("disabled", "true");
      cpEditor.userChangedMenuBtn = false;
    }

    if (selections.length == 1
        && (!window.hasOwnProperty("gSelectUserInUse") || !gSelectUserInUse)) {
      document.getElementById("key_cloneSignon").removeAttribute("disabled");
      document.getElementById("clone_signon").removeAttribute("disabled");
      document.getElementById("cpeMenuBtn_cloneSignon").
        removeAttribute("disabled");
    } else {
      document.getElementById("key_cloneSignon").
        setAttribute("disabled", "true");
      document.getElementById("clone_signon").
        setAttribute("disabled", "true");
      document.getElementById("cpeMenuBtn_cloneSignon").
        setAttribute("disabled", "true");
    }
  },
  false);

var cpEditor = {
  signonBundle: null,
  genStrBundle: null,
  pmoStrBundle: null,
  signonsTree: null,
  prefs: Components.classes["@mozilla.org/preferences-service;1"].
         getService(Components.interfaces.nsIPrefService).
         getBranch("extensions.classicpasswordeditor."),

  selectionsEnabled: true,
  userChangedMenuBtn: false,

  menuBtnSel: function (ev, elem) {
    this.userChangedMenuBtn = true;
    var mb = document.getElementById("cpeMenuBtn");
    switch(elem.id) {
    case "cpeMenuBtn_editSignon":
      mb.command = "edit_signon";
      mb.setAttribute("icon", "properties");
      this.editSignon();
      break;

    case "cpeMenuBtn_cloneSignon":
      mb.command = "clone_signon";
      mb.removeAttribute("icon");
      this.cloneSignon();
      break;

    case "cpeMenuBtn_newSignon":
      mb.command = "new_signon";
      mb.setAttribute("icon", "add");
      this.newSignon();
      break;
    }

    ev.stopPropagation();
  },

  _mergeSignonProps: (oldSignon, newProps) => {
    var merged = {};
    for (let prop in newProps)
      if (newProps[prop] === undefined)
        merged[prop] = oldSignon[prop];
      else
        merged[prop] = newProps[prop];

    var newSignon =
      Components.classes["@mozilla.org/login-manager/loginInfo;1"].
      createInstance(Components.interfaces.nsILoginInfo);
    newSignon.init(merged.hostname, merged.formSubmitURL,
                   merged.httpRealm, merged.username, merged.password,
                   merged.usernameField, merged.passwordField);
    return newSignon;
  },

  _getFilterSet: () => {
    if (window.signons) {
      let treeView = signonsTreeView;
      return treeView._filterSet.length ? treeView._filterSet : signons;
    } else {
      let filterField = document.getElementById("filter");
      return _filterPasswords(filterField.value);
    }
  },

  editSignon: function () {
    this.selectionsEnabled = false;
    var selections = GetTreeSelections(this.signonsTree);
    if (selections.length < 1) return;
    let filterSet = this._getFilterSet();
    var table = filterSet.length ? filterSet : signons;
    var selSignons = selections.map(el => table[el]);
    var ret = { newSignon: null, callback: null };
    window.openDialog(
      "chrome://classicpasswordeditor/content/pwdedit.xul", "",
      "centerscreen,dependent,dialog,chrome,modal",
      selSignons, 1, checkPasswordsShowing(), ret);

    this.selectionsEnabled = true;
    if (!ret.newSignon) return;

    try {
      for (let i = 0; i < selSignons.length; i++)
        Services.logins.modifyLogin(
          selSignons[i], this._mergeSignonProps(selSignons[i], ret.newSignon));
      var fv = document.getElementById("filter").value;
      setFilter("");
      setFilter(fv);
      this.signonsTree.view.selection.clearSelection();
    } catch (e) {
      Components.classes["@mozilla.org/embedcomp/prompt-service;1"].
        getService(Components.interfaces.nsIPromptService).
        alert(window, this.genStrBundle.getString("error"),
              this.pmoStrBundle.getFormattedString("badnewentry",
                                                   [e.message]));
    }
  },

  cloneSignon: function () {
    this.selectionsEnabled = false;
    var selections = GetTreeSelections(this.signonsTree);
    if (selections.length != 1) return;
    let filterSet = this._getFilterSet();
    var table = filterSet.length ? filterSet : signons;
    var signon = table[selections[0]];
    var ret = { newSignon: null, callback: null };
    window.openDialog(
      "chrome://classicpasswordeditor/content/pwdedit.xul", "",
      "centerscreen,dependent,dialog,chrome,modal",
      [signon], 2, checkPasswordsShowing(), ret);
    this.selectionsEnabled = true;
    if (!ret.newSignon) return;
    try {
      Services.logins.addLogin(this._mergeSignonProps(signon, ret.newSignon));
      var fv = document.getElementById("filter").value;
      setFilter("");
      setFilter(fv);
      this.signonsTree.view.selection.clearSelection();
    } catch (e) {
      Components.classes["@mozilla.org/embedcomp/prompt-service;1"].
        getService(Components.interfaces.nsIPromptService).
        alert(window, this.genStrBundle.getString("error"),
              this.pmoStrBundle.getFormattedString("badnewentry",
                                                   [e.message]));
    }
  },

  newSignon: function () {
    this.selectionsEnabled = false;
    var ret = { newSignon: null, callback: null };
    window.openDialog(
      "chrome://classicpasswordeditor/content/pwdedit.xul", "",
      "centerscreen,dependent,dialog,chrome,modal",
      [], 0, checkPasswordsShowing(), ret);
    this.selectionsEnabled = true;
    if (!ret.newSignon) return;
    try {
      let newSignon =
        Components.classes["@mozilla.org/login-manager/loginInfo;1"].
        createInstance(Components.interfaces.nsILoginInfo);
      newSignon.init(ret.newSignon.hostname, ret.newSignon.formSubmitURL,
                     ret.newSignon.httpRealm, ret.newSignon.username,
                     ret.newSignon.password, ret.newSignon.usernameField,
                     ret.newSignon.passwordField);
      Services.logins.addLogin(newSignon);
      var fv = document.getElementById("filter").value;
      setFilter("");
      setFilter(fv);
      this.signonsTree.view.selection.clearSelection();
    } catch (e) {
      Components.classes["@mozilla.org/embedcomp/prompt-service;1"].
        getService(Components.interfaces.nsIPromptService).
        alert(window, this.genStrBundle.getString("error"),
              this.pmoStrBundle.getFormattedString("badnewentry",
                                                   [e.message]));
    }
  },

  visitSite: function () {
    var selections = GetTreeSelections(this.signonsTree);
    if (selections.length < 1) return;
    let filterSet = this._getFilterSet();
    var table = filterSet.length ? filterSet : signons;
    var selSignons = selections.map(el => table[el]);

    var curWin =
        Components.classes["@mozilla.org/appshell/window-mediator;1"].
        getService(Components.interfaces.nsIWindowMediator).
        getMostRecentWindow("navigator:browser");

    if (curWin) {
      let error = false;
      for (let signon of selSignons) {
        try {
          curWin.openURL(signon.hostname);
        } catch (e) {
          if (e.name == "NS_ERROR_MALFORMED_URI")
            error = true;
          else
            throw e;
        }
      }

      if (error) {
        Components.classes["@mozilla.org/embedcomp/prompt-service;1"].
          getService(Components.interfaces.nsIPromptService).
          alert(window, this.genStrBundle.getString("error"),
                this.pmoStrBundle.getString(
                  selSignons.length == 1 ? "badurl" : "badmulturl"));
      }

      curWin.focus();
    } else {
      let ioSvc = Components.classes["@mozilla.org/network/io-service;1"].
        getService(Components.interfaces.nsIIOService);
      let extProtSvc = Components.classes[
        "@mozilla.org/uriloader/external-protocol-service;1"].
        getService(Components.interfaces.nsIExternalProtocolService);

      for (let signon of selSignons) {
        let uri = ioSvc.newURI(signon.hostname, null, null);
        extProtSvc.loadURI(uri, null);
      }
    }
  },
}
