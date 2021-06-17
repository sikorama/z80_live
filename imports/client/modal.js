import { SourceAsm, SourceGroups } from '../api/sourceAsm.js';
import { Session } from 'meteor/session';

import { userGroupList, schemas } from './globals.js';

import './modal.html';
import { Schemas } from './schemas.js';

//getSchema
Template.registerHelper('params', ()=>Session.get('dialog_param') );

Template.registerHelper('getSchema', (s)=>Schemas[s]);

Template.registerHelper('getCollection', function(s) {
    if (s==='SourceGroups') return SourceGroups;
    if (s==='SourceAsm') return SourceAsm;
});

// ------------- File Settings -----------------------

// Nom du source, description, etc.
Template.PopUpFileSettings.onRendered(function () {
  // Pour avoir la liste des groupes pour le formulaire
  this.subscribe("groupList");
  // On recupere l'id et le type de forum
  let param = Session.get('dialog_param');
  if (param.id)
    this.subscribe('sourceInfos', param.id);
//  else
//    Session.set('dialog_template',undefined);
});

Template.PopUpFileSettings.helpers({
  collection: function() { return SourceAsm; },
  // Récupere le document
  doc : function() {
    let param = Session.get('dialog_param');
    let res;
    // TODO: Si on n'est pas logué,
    // on devrait récuperer les variable de session
    if (param.id) // && Meteor.userId()
     res = SourceAsm.findOne(param.id, {fields: {code:0}});
    else
    {
      // On recupere la variable de session qui contient les reglages courants
      res.buildOptions = Session.get('buildSettings');
    }
    return res;
  },
  build_settings: function() {
    let param = Session.get('dialog_param');
    return (param.mode==='build');
  }
});


Template.PopUpFileSettings.events({
  "submit": function (event) {
    // Fermeture popup
    Session.set('dialog_template',undefined );  
    let d = Session.get('dialog_param');
    //return false;
  }
});

// Evenements pour fermer la fenetre modale: cliquer a coté, touche escape
Template.ModalWindow.events({
  "click div": function (event) {
    if (event.target.id === "bg")
      Session.set("dialog_template", undefined);
  },
  "keyup": function (event) {
    if (event.keyCode === 27)
      Session.set("dialog_template", undefined);
  }
})
