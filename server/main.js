import { Meteor } from 'meteor/meteor';
import { SourceAsm, SourceGroups } from '../imports/api/sourceAsm.js';
import { init_assembler } from './assemble.js';
import { init_notifications } from './notifications.js';
import { init_publications } from './publications.js';
import { getParam, init_settings } from './settings.js';
import { init_users } from './user_management.js';
import { Log } from 'meteor/logging';

import '../imports/api/settings-server.js';

// Code a executer au démarrage du serveur
Meteor.startup(() => {
  try {

    // Parametres du serveur Meteor
    init_settings();

    const ng = SourceGroups.findOne({});
    if (!ng) {
      // Ajout de programmes d'exemple
      SourceGroups.insert({ name: 'public', desc: 'Public Group' });
    }

    // Init des utilisateurs
    init_users();
    // Publication des bases, gestion de droit d'acces
    init_publications();
    // Notifications rocket chat
    init_notifications();
    // Assemblage
    init_assembler();

    let n = SourceAsm.findOne({});
    if (!n) {
      // Ajout de programmes d'exemple
      SourceAsm.insert({
        name: 'Example1',
        group: 'public',
        options: {},
        code: 'loop: LD A,R\nAND 31\nOR #40\nld bc, #7f10\nOut (c),c\nout (c),a\njr loop\n'
      });
    }
    n = SourceAsm.findOne({}).count;
    //    Log.error(n,"sources");

    // Notification de démarrage du serveur meteor
    if (getParam('rocketNotifStart') === true) {
      Meteor.call('sendRocket', 'Démarrage', 'Démarrage du ' + getParam('Name'), ':+1:', getParam('URL'), {
        'text': 'Version' + getParam('version')
      });
    }
  } catch (e) {
    Log.error(e.stack);
  }
});

Meteor.methods({
  getParam: function (param) {
    // Limiter a certains parametres?
    return getParam(param);
  }
});

Meteor.methods({
  removesource: function (docid) {
    if (this.userId) {
      SourceAsm.remove(docid);
    }
  },
  // Passer un selecteur en param?
  getAllSources: Meteor.wrapAsync(function (cb) {
    const fs = require('fs'),
      archiver = require('archiver'),
      streamBuffers = require('stream-buffers');

    let outputStreamBuffer = new streamBuffers.WritableStreamBuffer({
      initialSize: (1000 * 1024),   // start at 1000 kilobytes.
      incrementAmount: (1000 * 1024) // grow by 1000 kilobytes each time buffer overflows.
    });

    let archive = archiver('zip', {
      zlib: { level: 9 } // Sets the compression level.
    });
    archive.pipe(outputStreamBuffer);

    SourceAsm.find().forEach(function (item) {
      archive.append(item.code, { name: item.name + '.asm' });
    });

    archive.finalize();

    archive.on('finish', function () {
      //      cb(null, JSON.stringify(outputStreamBuffer.getContents())); //"errprout","data");
      outputStreamBuffer.end();
      cb(null, outputStreamBuffer.getContents());
    });
  })
});
