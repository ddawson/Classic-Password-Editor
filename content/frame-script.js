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

const Ci = Components.interfaces, Cu = Components.utils;
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://classicpasswordeditor/ClassicPasswordEditor-frame.jsm");

addEventListener(
  "contextmenu",
  aEvent => {
    var target = aEvent.target;
    if (Ci.nsIDOMXULElement
        && target instanceof Ci.nsIDOMXULElement)  // SeaMonkey, why?
      target = target.triggerNode;

    sendSyncMessage(
      "ClassicPasswordEditor:contextshowing",
      ClassicPasswordEditor.getFormData(target));
  },
  false);

addMessageListener(
  "ClassicPasswordEditor:getlocation",
  () => {
    let loc = content.location;
    sendAsyncMessage("ClassicPasswordEditor:returnlocation",
                     `${loc.protocol}//${loc.host}`);
  });

addMessageListener(
  "ClassicPasswordEditor:scanforloginforms",
  ClassicPasswordEditor.scanForLoginForms);
