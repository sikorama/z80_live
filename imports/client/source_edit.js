/*
 * Edition + build + emulation
 */
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { checkUserRole } from '../api/roles.js';
import { SourceAsm, SourceBuilds } from '../api/sourceAsm.js';
import './source_edit.html';
import { getParentId, updateHeight, setHeight } from './globals.js';
import {Log} from 'meteor/logging';

let curByteCode = "";

// SNA fichiers
// http://cpctech.cpc-live.com/docs/snapshot.html

Template.registerHelper('getCode', function () {
  let res;
  let sid = FlowRouter.getParam('sourceId');

  if (sid) {
    res = SourceAsm.findOne(sid);
  }

  if (!res) {
    res = {
      name: 'Source Code',
      code: ';Sample Test\nloop:\n LD A,R\n AND 31\n OR #40\n ld bc, #7f10\n Out (c),c\n out (c),a\n jr loop\n',
      buildOptions: { buildmode: 'sna' }
    };
  }

  return res;
});


Template.ClearSource.onRendered(function () {
  FlowRouter.go('/edit');
});


Template.SourceEdit.onRendered(function () {
  this.autorun(() => {

    let sid = FlowRouter.getParam('sourceId');

    let handle = Meteor.setInterval(() => {
      if (setHeight()) {
        Meteor.clearTimeout(handle);
      }
    }, 500);

  });



});

Template.SourceEdit.onCreated(function () {
  // TODO: User reactive vars instead?
  Session.set('displayEmu', false);
  Session.set("srcFromDB", false);
  Session.set("srcChanged", false);
  Session.setDefault('showAsmOutput', false);

  // Autorun, so if we fork, we can subscribe to the new source
  this.autorun(() => {

    let sid = FlowRouter.getParam('sourceId');

    

    // TODO: Only Subscribe to current builds
    this.subscribe('sourceBuilds');

    if (sid) {
      // Ranking attributed by the user for this source
      this.subscribe('userratings', sid);

      this.subscribe('sourceAsm', sid, function () {
        let res = SourceAsm.findOne(sid);
        // Search using slugname
        //if (!res)
        //  res = SourceAsm.findOne({name: sid});

        if (res) {
          Session.set('buildSettings', res.buildOptions);
          Session.set("srcFromDB", true);
        }
        else {
          const label = "You're not allowed to access this source code. Either it doesn't exist,or its owner has set it as private. Ask its owner to share it in another group (public for example)";
          //notification(1, 'alert', label)
          alert(label);
          FlowRouter.go('/');
        }
      });
    }
    else {
      // if there is a slug name, try to find corresponding source
      const slugname = FlowRouter.getQueryParam('name');
      if (slugname) {
        Meteor.call('getSourceIdFromSlugName', slugname, (err,res)=> {
          if (res) 
            FlowRouter.go('/edit/'+res);
        });
      }
    }
  });

  // debounce?
  this.autorun(() => {
    let sid = FlowRouter.getParam('sourceId');
    assemble(sid);
  });
});

Template.SourceEdit.helpers({
  autobuildclass() {
    if (Session.equals("autobuild", true)) {
      return 'ok-button';
    }
    //    return 'ko';
  },
  uiclass() {
    if (Session.equals("emuui", true)) {
      return 'ok-button';
    }
  },
  // Return true if source is owned by the user
  isOwner() {
    const tid = FlowRouter.getParam('sourceId');
    if (tid) {
      const res = SourceAsm.findOne(tid);
      if (res)
        if (res.owner === Meteor.userId()) return true;
    }
    return false;
  },
  // Return true if admin or if source is owned by the user
  canEdit() {
    if (checkUserRole(['admin'])) return true;
    const tid = FlowRouter.getParam('sourceId');
    if (tid) {
      const res = SourceAsm.findOne(tid);
      if (res)
        if (res.owner === Meteor.userId()) return true;
    }
    return false;
  },
  editorOptions: function () {
    return {
      lineNumbers: true,
      lineWrapping: true,
      scrollbarStyle: "simple",
      mode: "z80A",
      indentUnit: 4,
      // Replace Tabs by Spaces
      extraKeys: {
        Tab: function (cm) {
          if (cm.doc.somethingSelected()) {
            return CodeMirror.Pass;
          }
          const spacesPerTab = cm.getOption('indentUnit');
          Log.error(spacesPerTab);
          const spacesToInsert = spacesPerTab - (cm.doc.getCursor("start").ch % spacesPerTab);
          const spaces = Array(spacesToInsert + 1).join(' ');
          cm.replaceSelection(spaces, 'end', '+input');
        }
      }
    };
  },
  // get tiny 8 bit URL (CPC or ZX)
  turl() {
    try {
      let bset = Session.get('buildSettings');
      if (bset.buildmode === 'z80') {
        return Session.get('tinyZXURL');
      }

      else {
        // cpc
        return Session.get('tinyCPCURL');
      }
    }
    catch (e) {
      Log.error(e);
      return 'http://';
    }
  },
  emuoptions() {
    let bset = Session.get('buildSettings');
    if (bset.buildmode === 'z80') {
      return "joystick=kempston&type=zx48k";
    }
    else {
      // cpc
      return '&joystick=true';
    }
  },
  // Get File URL
  emufile() {
    let cid = Session.get('curBuildSession');
    let url = Session.get('fileServerURL');
    let bset = Session.get('buildSettings');
    let res;

    let sb = SourceBuilds.findOne({
      buildId: cid
    });

    if (cid) {
      if (sb) {
        res = url + '/' + sb.output;
      }
      else // pas de session de build associée
        return undefined; //(url + '/' + 'Jedi.sna');
    } else {

      // On utilise le source pour retrouver la session de build
      // Ce qui n'est pas bien

      if (FlowRouter.getParam('sourceId')) {
        //if (Session.equals('displayPrebuilt', true))
        {
          const src = SourceAsm.findOne(FlowRouter.getParam('sourceId'));
          if (src) {
            const sb = SourceBuilds.findOne({
              src: src.name + '.asm'
            }, {
              sort: {
                date: -1
              }
            });
            if (sb) {
              res = url + '/' + sb.output;
            }
          }
        }
      }
    }

    // Ajout de l'éventuelle commande (DSK)
    let cmd = res;
    if (bset)
      if (bset.command)
        cmd += '&input=' + bset.command + '%0A';

    return ({ file: res, cmd: cmd });
  },

  // Get Build Result
  buildResult() {
    let cid = Session.get('curBuildSession');
    if (!cid)
      return;

    let sb = SourceBuilds.findOne({
      buildId: cid
    });
    return sb;
  },
  status(status) {
    if (status == 1) return ('warn');
    if (status == 2) return ('ko');
    if (status == 0) return ('ok');
  },
  equal(a, b) {
    return a === b;
  },
  collection() {
    return SourceAsm;
  },
  showResult(b) {
    return b.status || Session.get('showAsmOutput');
  },
});

// Grab source code from editor 
function getSource() {
  let d = document.getElementById("source");
  let s = "";
  if (d) s = d.value;
  return s;
}

/**
 * Reassemble source code. If sourceId is provided, get the code from database, otherwise
 * use code in editor
 * @param {String} sourceId : index of source code
 */
function assemble(sourceId) {
  try {
    let code;

    // Retrieve build settings
    // from Session/from DB
    let settings = Session.get('buildSettings');

    if (!settings)
      settings = {
      };

    if (sourceId)
      settings.sourceId = sourceId;

    if (sourceId) {
      const src = SourceAsm.findOne(sourceId, { fields: { score: 0, rank: 0, numvotes: 0 } });
      code = getSource();

      if (src)
        code = src.code;
      else {
        //Log.error('No source code available');
        return;
      }
    }
    else {
      // Get source from editor
      code = getSource();
    }

    if (!code) {
      //Log.error("Assemble: no code!");
      return;
    }

    // Check if source code is valid
    if (code.length == 0) return;

    Session.set('displayEmu', false);
    Session.set('curBuildSession', false);

    // Assemblage distant (serveur meteor=>serveur de compilation)
    // OPTIM:
    // Voir si il ne faut pas passer par une db pour stocker le source plutot que le passer en parametre
    // => La c'est le client qui envoit au serveur qui envoit au compilateur...
    // Marcherait pour le code deja en base, mais pas en cours d'edition

    Meteor.call('assemble', code, settings, function (err, data) {
      if (err) Log.error('Assemble error: ', err);

      Session.set('curBuildSession', data);
      Session.set('displayEmu', true);
    });
  } catch (e) {
    Log.error(e.stack);
  }
}

// Updates source code source in database, based on editor's content
function updateSource(srcId) {
  // Check source chode has changed
  if (Session.equals('srcChanged', true)) {
    // Retrieve the doc
    const doc = SourceAsm.findOne(srcId);
    if (doc) {
      //Get modified code (in editor) 
      let ncode = getSource();
      // On met a jour
      SourceAsm.update(srcId, { $set: { code: ncode, timestamp: Date.now() } });
      Session.set('srcChanged', false);
    }
  }
}

Template.SourceEdit.events({
  "click .toggleShowResult": function (event) {
    Session.set('showAsmOutput', !Session.get('showAsmOutput'));
  },
  "click .updatebtn": function (event) {
    // Get button id, to know wht to do
    let tid = event.target.id;
    let doc = {};
    const sid = FlowRouter.getParam('sourceId');

    // Comment mettre a jour le contenu de l'éditeur?
    if (tid === 'newbtn') {
      if (confirm('Are you sure you want to open a new file?') === true) {
        FlowRouter.go('/clear/');
      }
    }

    // Save/Update
    if (tid === 'updatebtn') {
      if (sid) {
        updateSource(sid);
      }
    }

    if (tid === 'delbtn') {
      if (sid) {
        if (confirm('Are you sure you want to delete this source file?') === true) {
          SourceAsm.remove(sid);
          FlowRouter.go('/clear/');
        }
      }
    }

    // Save/Create a new file
    if (tid === 'duplicatebtn') {
      doc.code = getSource();
      doc.buildOptions = Session.get('buildSettings');

      Meteor.call('insertSource', doc, function (err, id) {
        if (id) {
          Session.set('dialog_param', {
            id: id,
          });
          Session.set('dialog_template', 'PopUpFileSettings');
          FlowRouter.go('/edit/' + id);
        }
      });
    }
  },
  // Bouton Run
  //"click .emulbtn": function (event) {
  //},

  // Run button; re assemble and reload emulator
  "click button": function (event) {
    switch (event.target.id) {
      case 'emul':
        assemble();
        break;
      // Toggle autobuild mode
      case 'auto':
        Session.set('autobuild', !Session.get('autobuild'));
        break;
    }
  },
  // When source code is change, 'save' button is enabled
  // And can be reassembled
  "input .CodeMirror ": function () {
    Session.set('srcChanged', true);
  },
  "input .CodeMirror": _.debounce(function (event) {
    // Auto assemblage
    if (Session.equals("autobuild", true)) {
      Session.set('srcChanged', true);
      assemble();
    }
  }, 1500),
  "keyup .CodeMirror ": _.debounce(function (event) {
    if (event.key == 'Backspace') {
      if (Session.equals("autobuild", true)) {
        Session.set('srcChanged', true);
        assemble();
      }
    }
  }, 1500),
  // CTRL+R , CTRL+S, CTRL+B in editor
  "keydown .CodeMirror": function (event) {
    if (event.key == 'r' && event.ctrlKey) {
      assemble();
      return false;
    }
    if (event.key == 's' && event.ctrlKey) {
      if (FlowRouter.getParam('sourceId')) {
        updateSource(FlowRouter.getParam('sourceId'));
      }
      return false;
    }
    if (event.key == 'b' && event.ctrlKey) {
      Session.set("autobuild", !Session.get("autobuild"));
      return false;
    }
  },
  "click .buildsettings": function (event) {
    // Récuperer des reglages courants => a faire dans le modal
    //    let doc = { buildOptions: Session.get('buildSettings') };
    // Inserer l'id du doc courant si existant
    const doc = { 'mode': 'build' };
    let sid = FlowRouter.getParam('sourceId');
    if (sid)
      doc.id = sid;

    // On duplique trop ce code, alors que l'id est suffisant
    // On peut récuperer au niveau de la modale
    Session.set('dialog_param', doc);
    Session.set('dialog_template', 'PopUpFileSettings');
    return false;
  },

  "click .filesettings": function (event) {
    // It must be a file
    const sid = FlowRouter.getParam('sourceId');
    if (!sid)
      return;

    // Must be loguer and owner (or admin) to be allowed to change ettings
    const u = Meteor.user();
    if (!u) return;

    Session.set('dialog_param', {
      'id': sid,
      'mode': 'file'
    });
    Session.set('dialog_template', 'PopUpFileSettings');

  },

  'click .cmdresult': function (event) {
    // Recherche de :XXX]
    let cid = Session.get('curBuildSession');
    if (!cid)
      return;
    let sb = SourceBuilds.findOne({
      buildId: cid
    });

    let rx = RegExp(':[0-9]+]');
    let p = rx.exec(event.target.textContent);
    if (p) {
      let l = parseInt(p[0].slice(1, -1));
      l -= 1;
      let d = CodeMirror.source;
      d.focus();
      d.setCursor({ line: l, ch: 0 });
    }
  }
});
