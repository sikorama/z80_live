import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { Settings } from '../api/settings-server.js';
import { SourceAsm, SourceBuilds, SourceGroups } from '../api/sourceAsm.js';
import './admin.html';
import { updateHeight } from './globals.js';


Template.registerHelper('formatFileSize', function (sb) {
  return (~~(sb / 1024) + ' Kb');
});

Template.AdminSession.onRendered(function () {
  updateHeight();
});

Template.AdminSession.helpers({
  // Recupere toutes les variables de session dans un dictionnaire (k,v)
  session_keys: function () {
    let res = [];
    for (let i in Session.keys) {
      let v = Session.get(i);
      try {
        res.push({
          'k': i,
          'v': JSON.stringify(v)
        });
      } catch (e) {
        res.push({
          'k': i,
          'v': e //.error
        });
      }
    }
    return (res.sort(function (a, b) {
      return (a.k > b.k ? 1 : -1);
    }));
  }
});

Template.AdminSettings.onRendered(function () {
  Meteor.subscribe("serverSettings");
});

Template.AdminSettings.helpers({
  params: function () {
    return Settings.find({});
  },
  paramType: function (param) {
    return (typeof param.value);
  },
  isTextArea: function (param) {
    return (['boolean'].indexOf(typeof param.value) < 0);
  },
  inputType: function (param) {
    switch (typeof param.value) {
      case 'boolean':
        return 'checkbox';
      default:
        return 'textarea';
    }
  },
  inputValue: function (param) {
    switch (typeof param.value) {
      case 'boolean':
        if (param.value === true)
          return 'checked';
        return '';
      default:
        return '';
    }
  }
});

Template.AdminSources.events({
"click button": function(event) {
    Meteor.call('getAllSources', function(err,res) {
      let blob  = new Blob([res]);
      let a = document.createElement('a');
      a.href = window.URL.createObjectURL(blob, {type: "application/zip"});
      a.download="allSources.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
  }
});

Template.AdminSettings.events({
  "click .resetSettings": function (event) {
    Meteor.call('resetSettings');
  },

  "change input,textarea": function (event) {
    let p = Settings.findOne({
      'param': event.target.id
    });
    let v;
    if (p != undefined) {
      switch (typeof p.value) {
        case 'boolean':
          v = !p.value;
          break;
        default:
          v = event.target.value;
          break;
      }
      Settings.update(p._id, {
        '$set': {
          'value': v
        }
      });
    }
  }
});

Template.AdminBuilds.onRendered(function () {
  Meteor.subscribe('sourceBuilds');
  Meteor.subscribe("serverSettings");
});

Template.AdminBuilds.helpers({
  builds: function () {
    return SourceBuilds.find({}, { sort: { date: -1 } });
  },
  urlservfile: function() {
    let s = Settings.findOne({param: 'fileServerURL'});
    if (s) return encodeURIComponent(s.value);
    return  '';
  }
});

Template.AdminBuilds.events({
  "click .clearbuilds": function (event) {
    Meteor.call('clearBuilds');
  }
});


// ---- Gestion  des Utilisateurs ------------
// https://github.com/mizzao/meteor-user-status pour le status de connexion
Template.AdminUsers.onRendered(function () {
  this.subscribe("userList");
  this.subscribe("groupList");
  this.subscribe("userRoles");

  updateHeight();
});

function getdoc(sel) {
  let doc = Meteor.users.findOne(sel);
  if (!doc)
    return;
  let r = Meteor.roleAssignment.find({ 'user._id': doc._id }).fetch();
  doc.roles = r.map((item) => { return item.role._id; });
  return doc;
}


Template.AdminUsers.helpers({
  roles(uid) {
    return getdoc({_id: uid}).roles;
    let r = Meteor.roleAssignment.find({ 'user._id': uid }).fetch();
    //console.error(uid,r);
    return r;
  },
  groupList: function () {
    return SourceGroups.find({}, { fields: { name: 1 } }).fetch().map(function (v) { return { value: v.name, label: v.name }; });
  },
  userList: function () {
    return Meteor.users.find({});
  },
  statusClass: function (status) {
    if (status === undefined) return 'ko';
    if (status.online === false) return 'ko';
    if (status.idle === true) return 'idle';
    return 'ok';
  },
  doc: function () {
    if (Session.equals('SelectedUser'), undefined)
      return {};
    return getdoc(Session.get('SelectedUser'));

//    return Meteor.users.findOne(Session.get('SelectedUser'));
  }
});

Template.AdminUsers.events({

  "submit form": function (event) {
    event.preventDefault();
    return false;
  },
  "click button": function (event) {
    if (event.target.id == 'newuser') {
      Session.set('SelectedUser',undefined);
    }
    if (event.target.id == 'removeUser') {
      let uid=Session.get('SelectedUser');
      if (confirm('Are you sure you want to delete this account?'))
      {
        Meteor.call('removeUser', uid);
      }

    }
  },
  "click tr": function (event) {
    Session.set('SelectedUser',event.currentTarget.id);
  }
});


Template.AdminGroups.onRendered(function () {
  Session.set('AdminPageMenuActive', 'groups');
  this.subscribe('groupList');
});

Template.AdminGroups.helpers({
  groups: function () {
    return SourceGroups.find();
  },
  numSource: function (g) {
    return (SourceAsm.find({ group: g }).count());
  },
  numUsers: function (g) {
    if (g)
      return (Meteor.users.find({ groups: {$in: [g]} }).count());
    return 0;
  }
});

Template.AdminGroups.events({
  'click .removebtn': function (event) {
    SourceGroups.remove(event.target.id);
  },
  'submit': function (event) {
    Session.set('dialog_template', undefined);
    return false;
  },
  'click .newitem': function (event) {
    // Popup avec formulaire pour le groupe
    Session.set('dialog_param', {
      title: 'Groupe',
      schema: 'Groups',
      formid: 'addgroupForm',
      typeform: 'insert',
      collection: "SourceGroups"
      //method: 'updateGroup'
    });
    Session.set('dialog_template', 'PopUpForm');
  }
});
