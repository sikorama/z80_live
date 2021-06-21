/*Settings*/

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
    console.error('Parameter not found:', param);
    return undefined;
  }
}

function defaultParams() {
  // Settings du serveur
  initParam('Name', 'RASM Live', 'Server name');
  initParam('URL', 'https://rasmlive.amstrad.info', 'Server URL');
  initParam('version', '0.20', 'Version number', true);
  initParam('buildServerURL', '127.0.0.1','Private URL for assembling server');
  initParam('buildServerPort', '8000', 'Assembling server port');
  initParam('fileServerURL', 'rasm.amstrad.info','URL pour le serveur de fichiers (public)');
  initParam('tinyCPCURL', 'rasm.amstrad.info/tiny8bit/cpc.html','Public URL for Tiny CPC');
  initParam('tinyCPCURL_UI', 'rasm.amstrad.info/tiny8bit/cpc-ui.html','Public URL for Tiny CPC (UI version)');
  initParam('tinyZXURL', 'rasm.amstrad.info/tiny8bit/zx.html','Public URL for Tiny ZX');
  initParam('tinyZXURL_UI', 'rasl.amstrad.info/tiny8bit/zx-ui.html','Public URL for Tiny ZX (UI version)');
  initParam('rocketIP', '', 'Rocket chat for notification'); 
  initParam('rocketToken', '', 'Token for rocket chat notification');
  initParam('rocketNotifStart', false, 'Notify server start');
  initParam('rocketNotifUpdates', false, 'Notify source Updates');
  initParam('logoFile', '/logo.png', 'Rasm Live Logo');
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
