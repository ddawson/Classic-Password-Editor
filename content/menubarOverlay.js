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

{
  let shortcutKey, shortcutKeycode, shortcutModifiers;
  let Cc = Components.classes, Ci = Components.interfaces;
  let prefsSvc = Cc["@mozilla.org/preferences-service;1"]
    .getService(Ci.nsIPrefService);
  let prefs = prefsSvc.getBranch("extensions.classicpasswordeditor.");

  let observe = function (aSubject, aTopic, aData) {
    if (aData.startsWith("opensp")) {
      let keyObj = document.getElementById(
        "classicpasswordeditor-key-opensavedpasswords");
      let miObj = document.getElementById(
        "classicpasswordeditor-toolsmenuitem");
      let key = prefs.getCharPref("openspkey");
      let keyMods = prefs.getCharPref("openspkeymodifiers");

      if (key.length <= 1) {
        shortcutKey = key;
        shortcutKeycode = 0;
        keyObj.setAttribute("keycode", "");
        keyObj.setAttribute("key", key);
      } else {
        shortcutKey = "";
        shortcutKeycode = prefs.getIntPref("openspkeycode");
        keyObj.setAttribute("key", "");
        keyObj.setAttribute("keycode", "VK_" + key);
      }
      keyObj.setAttribute("modifiers", keyMods);
      miObj.setAttribute("acceltext", "");
      miObj.removeAttribute("acceltext");

      shortcutModifiers = [];
      var keyElemModList = keyMods.replace(" ", ",").split(",");
      [["control", "ctrlKey"], ["alt", "altKey"], ["meta", "metaKey"],
       ["shift", "shiftKey"]].forEach(function (e) {
        shortcutModifiers.push(
          [e[1], (keyElemModList.indexOf(e[0]) != -1)]);
      });
    }
  };

  prefs.addObserver("", { observe: observe }, false);

  window.addEventListener(
    "keypress",
    function (evt) {
      if (shortcutKeycode != 0 ?
            evt.keyCode != shortcutKeycode
            : String.fromCharCode(evt.charCode) != shortcutKey)
        return;

      if (!shortcutModifiers.every(function (e) evt[e[0]] == e[1])) return;
      document.getElementById(
        "classicpasswordeditor-command-opensavedpasswords").doCommand();
    },
    false);

  window.addEventListener(
    "load",
    function init_menuitemDynamic (evt) {
      const prefBranch =
        Components.classes["@mozilla.org/preferences-service;1"].
        getService(Components.interfaces.nsIPrefService).
        getBranch("extensions.classicpasswordeditor.");

      function menuitemDynamic (evt) {
        var mi = document.getElementById("classicpasswordeditor-toolsmenuitem");
        var renameTo =
          prefBranch.getComplexValue(
            "rename_menuitem_to",
            Components.interfaces.nsISupportsString).data;
        if (renameTo) {
          mi.setAttribute("label", renameTo);
          mi.removeAttribute("tooltiptext");
          mi.removeAttribute("accesskey");
          mi.setAttribute("style", "list-style-image:none;");
        } else {
          mi.setAttribute("label", mi.getAttribute("standardlabel"));
          mi.setAttribute(
            "tooltiptext", mi.getAttribute("standardtooltiptext"));
          mi.setAttribute("accesskey", mi.getAttribute("standardaccesskey"));
          mi.removeAttribute("style");
        }
        var hidden = !prefBranch.getBoolPref("display_menuitem");
        mi.hidden = hidden;
        return true;
      }

      function register_menuitemDynamic (popup) {
        if (popup)
          popup.addEventListener("popupshowing", menuitemDynamic, false);
      }

      function appmenuitemDynamic (evt) {
        var mi = document.getElementById("classicpasswordeditor-appmenuitem");
        var renameTo =
          prefBranch.getComplexValue(
            "rename_menuitem_to",
            Components.interfaces.nsISupportsString).data;
        if (renameTo) {
          mi.setAttribute("label", renameTo);
          mi.removeAttribute("tooltiptext");
          mi.removeAttribute("accesskey");
          mi.setAttribute("style", "list-style-image:none;");
        } else {
          mi.setAttribute("label", mi.getAttribute("standardlabel"));
          mi.setAttribute(
            "tooltiptext", mi.getAttribute("standardtooltiptext"));
          mi.setAttribute("accesskey", mi.getAttribute("standardaccesskey"));
          mi.removeAttribute("style");
        }
        var hidden = !prefBranch.getBoolPref("display_menuitem");
        mi.hidden = hidden;
        return true;
      }

      function register_appmenuitemDynamic (popup) {
        if (popup)
          popup.addEventListener("popupshowing", appmenuitemDynamic, false);
      }

      observe(null, null, "opensp");

      register_menuitemDynamic(document.getElementById("menu_ToolsPopup"));
      register_menuitemDynamic(document.getElementById("taskPopup"));
      register_appmenuitemDynamic(document.getElementById("appmenu-popup"));
      window.removeEventListener("load", init_menuitemDynamic, false);
    },
    false);
}
