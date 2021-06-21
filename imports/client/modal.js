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
  collection() { return SourceAsm; },
  // Récupere le document
  doc() {
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
  build_settings() {
    let param = Session.get('dialog_param');
    return (param.mode==='build');
  },
  formtype() {
    if (Meteor.user()) return 'update';
    return 'normal';
  }
});


Template.PopUpFileSettings.events({
  "click button,submit": function (event) {
    console.error('SUBMIT');
    // Fermeture popup
    Session.set('dialog_template',undefined );  
    // Either we get form's data
    // And store to buildSetting
  
    let doc = AutoForm.getFormValues('filesettings');
    console.error(doc);
    if (doc.insertDoc.buildOptions) {
      Session.set('buildSettings', doc.insertDoc.buildOptions);
      console.error(doc.insertDoc.buildOptions);
    }

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
