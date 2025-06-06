/*Settings*/
import { Log } from 'meteor/logging';

import {
//  Myservers,
  Settings
} from '../imports/api/settings-server.js';

function initParam(param, val, desc, force) {
  if ((force === true) ||  (Settings.findOne({
      'param': param
    }) === undefined))
    Settings.upsert({
      'param': param
    }, {
      'param': param,
      'value': val
    });

  // Description
  Settings.update({
    'param': param
  }, {
    $set: {
      'desc': desc
    }
  });
}

export function getParam(param) {
  try {
    return Settings.findOne({
      'param': param
    }).value;
  } catch (e) {
    Log.error('Parameter not found:', param);
    return undefined;
  }
}

function defaultParams() {
  // Settings du serveur
  let rooturl=  'https://z80live.amstrad.info';

  initParam('Name', 'Z80Live Live', 'Server name');
  initParam('URL', rooturl, 'Server URL');
  initParam('version', '0.40', 'Version number', true);
  initParam('buildServerURL', '127.0.0.1','Private URL for assembling server');
  initParam('buildServerPort', '8000', 'Assembling server port');
  initParam('fileServerURL', 'z80build.amstrad.info','URL pour le serveur de fichiers (public)');
  initParam('tinyCPCURL', rooturl+'/tiny8bit/cpc.html','Public URL for Tiny CPC');
  initParam('tinyCPCURL_UI', rooturl+'/tiny8bit/cpc-ui.html','Public URL for Tiny CPC (UI version)');
  initParam('tinyZXURL', rooturl+'/tiny8bit/zx.html','Public URL for Tiny ZX');
  initParam('tinyZXURL_UI', rooturl+'/tiny8bit/zx-ui.html','Public URL for Tiny ZX (UI version)');
  initParam('msxURL', 'https://webmsx.org/','Public URL for MSX emulator');
  initParam('rocketIP', '', 'Rocket chat for notification'); 
  initParam('rocketToken', '', 'Token for rocket chat notification');
  initParam('rocketNotifStart', false, 'Notify server start');
  initParam('rocketNotifUpdates', false, 'Notify source Updates');
  initParam('logoFile', '/logo.png', 'Z80 Live Logo');
  initParam('logoText', '', 'Additional text - to identify server instances');
  initParam('discord_invite', '', 'Link to discord server');
}

export function init_settings() {
  defaultParams();

  Meteor.methods({
    resetSettings: function() {
      Settings.remove({});
      defaultParams();
    }
  });
}
