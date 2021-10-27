
import { Accounts } from 'meteor/accounts-base';
import { Session } from 'meteor/session';
import '../imports/client/globals.js';
import '../imports/client/admin.js';
import '../imports/client/doc.js';
import '../imports/client/mainpage.js';
import '../imports/client/myprofile.js';
import '../imports/client/source_edit.js';
import '../imports/client/source_table.js';
import '../imports/client/stars.js';
import { init_cm } from '../imports/client/z80A.js';
import '../imports/routes.js';

init_cm();

Accounts.ui.config({
  //passwordSignupFields: 'USERNAME_ONLY'
  passwordSignupFields: 'USERNAME_AND_OPTIONAL_EMAIL'
})

// English by defaut
//T9n.setLanguage('en');
//AutoForm.debug();
AutoForm.setDefaultTemplate('plain');


/* Valeur par défaut des variables de session */
Meteor.call('getURL', function(err,res) {Session.setDefault('URL',res);});
Meteor.call('getParam', 'logoText', function(err,res) {Session.setDefault('logoText', res);});
Meteor.call('getParam', 'logoFile', function(err,res) {Session.setDefault('logoFile', res);});
Meteor.call('getParam', 'fileServerURL', function(err,res) {Session.setDefault('fileServerURL', res);});
/// Urls to TinyCPC 
Meteor.call('getParam', 'tinyCPCURL', function(err,res) {Session.setDefault('tinyCPCURL', res);});
Meteor.call('getParam', 'tinyCPCURL_UI', function(err,res) {Session.setDefault('tinyCPCURL_UI', res);});
Meteor.call('getParam', 'tinyZXURL', function(err,res) {Session.setDefault('tinyZXURL', res);});
Meteor.call('getParam', 'tinyZXURL_UI', function(err,res) {Session.setDefault('tinyZXURL_UI', res);});

Session.setDefault('dumpFormat', 'basic');
Session.setDefault('buildSettings', {buildmode: 'sna'});

Session.setDefault("sourceSearchTags",[]);  // Liste des tags pour la recherche courante
Session.setDefault("sourceSearchString",'')
Session.setDefault("sourceSearchSkip",0)
Session.setDefault("sourceSearchFilters",[])
Session.setDefault("sourceSearchGroups",[])

Session.setDefault('sourceSortDir',1);
Session.setDefault('sourceSortField','name');

Session.setDefault("curSelected",'');

//Session.set("srcFromDB", true); //
Session.setDefault("autobuild",false); // Auto build, enabled by default
