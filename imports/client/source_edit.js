/*
 * Edition + build + emulation
 */
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { checkUserRole } from '../api/roles.js';
import { SourceAsm, SourceBuilds } from '../api/sourceAsm.js';
import './source_edit.html';
import { dev_log, getParentId } from './globals.js';

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


Template.SourceEdit.onCreated(function () {
  // TODO: Reactive vars?
  Session.set('displayEmu', false);
  Session.set("srcFromDB", false);
  Session.set("srcChanged", false);

  // Autorun, so if we fork, we can subscribe to the new source
  this.autorun(() => {

    let sid = FlowRouter.getParam('sourceId');

    // TODO: Ne souscrire qu'aux builds de sa session/du source?
    this.subscribe('sourceBuilds');

    if (sid) {
      // Ranking attributed by the user for this source
      this.subscribe('userratings', sid);

      this.subscribe('sourceAsm', sid, function () {
        let res = SourceAsm.findOne(sid);
        if (res) {
          //console.info('source id changed, storing build options', res, res.buildOptions);
          Session.set('buildSettings', res.buildOptions);
          Session.set("srcFromDB", true);
          assemble(sid);
        }
        else {
          const label = "You're not allowed to access this source code. Either it doesn't exist,or its owner has set it as private. Ask its owner to share it in another group (public for example)"
          //notification(1, 'alert', label)
          alert(label);
          FlowRouter.go('/');
        }
      });
    }
  })

});

Template.SourceEdit.helpers({
  autobuildclass: function () {
    if (Session.equals("autobuild", true)) {
      return 'ok-button';
    }
    //    return 'ko';
  },
  uiclass: function () {
    if (Session.equals("emuui", true)) {
      return 'ok-button';
    }
  },
  // Return true if source is owned by the user
  isOwner() {
    const tid = FlowRouter.getParam('sourceId');
    if (tid) {
      res = SourceAsm.findOne(tid);
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
      res = SourceAsm.findOne(tid);
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
      mode: "z80A"
    };
  },

  // Recupere l'url du fichier, en 2 versions
  emufile: function () {

    let cid = Session.get('curBuildSession');
    let url = Session.get('fileServerURL');
    let bset = Session.get('buildSettings');
    let res = undefined;

//    console.error('emufile...', cid, url, bset);
    let sb = SourceBuilds.findOne({
      buildId: cid
    });

    if (cid) {
      //console.error('emufile... sb=', sb);
      if (sb) {
        res = url + '/' + sb.output;
      }
      else // pas de session de build associée
        return undefined; //(url + '/' + 'Jedi.sna');
    } else {

      // On utilise le source pour retrouver la session de build
      // Ce qui n'est pas bien
      console.warn('Using source name for finding build');
      if (FlowRouter.getParam('sourceId')) {
        //if (Session.equals('displayPrebuilt', true))
        {
          const src = SourceAsm.findOne(FlowRouter.getParam('sourceId'));
          //console.error('source = ', src, FlowRouter.getParam('sourceId')());
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
     //cmd = encodeURIComponent(cmd)
     console.error(cmd, encodeURIComponent(cmd));
    return ({ file: res, cmd: cmd })
  },

  // Récupere le résultat du build
  buildResult: function () {
    let cid = Session.get('curBuildSession');
    if (!cid)
      return;

    let sb = SourceBuilds.findOne({
      buildId: cid
    });
    return sb
  },
  status: function (status) {
    if (status == 1) return ('warn');
    if (status == 2) return ('ko');
    if (status == 0) return ('ok');
  },
  //a mettre en globals
  equal: function (a, b) {
    return a === b;
  },
  collection: function () {
    return SourceAsm;
  },
  showResult: function (b) {
    let res = b.status;
    // Ou alors si on le demande explicitement

    return res;
  },
  /*  filterResult: function(txt,src) {
      regex = new RegExp(src, 'g');
      let res = txt.replace(regex,"");
      return res;
    }*/
});

// Recupere le code au niveau de l'éditeur
let getSource = function () {
  let d = document.getElementById("source");
  let s = "";
  if (d) s = d.value;
  return s;
}

/**
 * Reassemble source code. If sourceId is provided, get the code from database, otherwier
 * use code in editor
 * @param {String} sourceId : index of source code
 */
function assemble(sourceId) {
  //console.error('Assemble', sourceId);

  try {
    let s;

    if (sourceId) {
      let src = SourceAsm.findOne(sourceId);

      if (src)
        s = src.code;
      else {
        console.error('No source code available');
        return;
      }
    }
    else {
      // Get source from editor
      console.info("Get source from editor!");
      s = getSource();
    }

    if (!s) {
      console.error("Assemble: no code!");
      return;
    }

    // Check if source code is valid
    if (s.length == 0) return;


    Session.set('displayEmu', false);
    Session.set('curBuildSession', false);

    // Recupere les settings
    // Soit au n
    let settings = Session.get('buildSettings');
    console.error('Assemble - Build settings = ', settings);

    if (!settings)
      settings = {
      };


    // ???
    //if (FlowRouter.getParam('sourceId'))
    //  settings.sourceId = FlowRouter.getParam('sourceId');
    if (sourceId)
      settings.sourceId = sourceId;

    //if (!settings.exportType)
    //  settings.exportType = Session.get('exportType');

    // Assemblage distant (serveur meteor=>serveur de compilation)

    // OPTIM:
    // Voir si il ne faut pas passer par une db pour stocker le source plutot que le passer en parametre
    // => La c'est le client qui envoit au serveur qui envoit au compilateur...
    // Marcherait pour le code deja en base, mais pas en cours d'edition

    Meteor.call('assemble', s, settings, function (err, data) {
      if (err) console.error('Assemble error: ', err);
      if (data) console.error('Assemble data: ', data);

      Session.set('curBuildSession', data);
      Session.set('displayEmu', true);
    });
  } catch (e) {
    console.error(e.stack);
  }
}

// Mise a jour du code source (et uniquement du code) en DB
// Si c'est un fichier en lib, ca stockera le fichier
function updateSource(srcId) {
  // On verifie que le source a été changé
  if (Session.equals('srcChanged', true)) {
    // On récupere le doc
    doc = SourceAsm.findOne(srcId);
    if (doc) {
      // On récupere le code source modifié
      let ncode = getSource();
      // On met a jour
      SourceAsm.update(srcId, { $set: { code: ncode } });
      Session.set('srcChanged', false);
    }
  }
}

Template.SourceEdit.events({
  // Sauvegarde en base, si il y a eu modification
  "click .updatebtn": function (event) {
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
      // Ajout des options courantes
      doc.buildOptions = Session.get('buildSettings');
      Meteor.call('insertSource', doc, function (err, id) {
        console.error('insert Source: err=', err, 'data=', id);
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
  "click .emulbtn": function (event) {
  },
  // Bouton Run
  "click button": function (event) {
    switch (event.target.id) {
      case 'emul':
        assemble();
        break;
      case 'auto':
        Session.set('autobuild', !Session.get('autobuild'));
        break;
    }
  },
  //
  "input .CodeMirror ": function () {
    Session.set('srcChanged', true); // Pour le bouton save TODO
  },
  // Modification dans l'editeur
  "input .CodeMirror": _.debounce(function (event) {
    // Auto assemblage
    if (Session.equals("autobuild", true)) {
      assemble();
    }
  }, 1500),
  // Chaine différente
  "keyup .CodeMirror ": _.debounce(function (event) {
    if (event.key == 'Backspace') {
      if (Session.equals("autobuild", true)) {
        Session.set('srcChanged', true);
        assemble();
      }
    }
  }, 1500),
  // CTRL+R , CTRL+S dans l'editeur
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
    return true;
  },
  "click .buildsettings": function (event) {

    // Récuperer des reglages courants => a faire dans le modal
    //    let doc = { buildOptions: Session.get('buildSettings') };
    // Inserer l'id du doc courant si existant
    doc = { 'mode': 'build' };
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
    let sid = FlowRouter.getParam('sourceId');
    if (!sid)
      return;

    // Must be loguer and owner (or admin) to be allowed to change ettings
    let u = Meteor.user();
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
      let l = parseInt(p[0].slice(1, -1))
      l -= 1;
      l -= sb.header.length;
      let d = CodeMirrors['source'];
      d.focus();
      // Corriger le numero de ligne en fonction du nombre de lignes du header
      d.setCursor({ line: l, ch: 0 });
    }
  }
});
