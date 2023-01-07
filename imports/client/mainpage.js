import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { addEvent, updateHeight } from './globals.js';

import './mainpage.html';
import './modal.js';
import { Tracker } from 'meteor/tracker';

Template.Page.onRendered(function () {
  // L'evenement resize force le calcul des elements en hateur
  addEvent(window, 'resize', updateHeight);
  // this.subscribe('sourceAsm');

});


Template.Page.helpers({
  notifications: function () {
    // Recupere la liste des notifs dans la variable de sessions
    let notifs = Session.get('notifications');
    if (notifs === undefined) notifs = [];
    else {
      // Si il ya trop de notifs, on se limite au n premiers...
      if (notifs.length > 5) {
        notifs.splice(5, notifs.length - 5);
      }
    }
    // Et y ajoute une si la connexion n'est pas lieu
    if (Meteor.status().connected === false) {
      notifs.push({ 'id': '', 'type': 'error', 'label': 'Connecting to server...' });
    }
    return notifs;
  },
  dialog_template: function () {
    return Session.get('dialog_template');
  },
  dialog_active: function () {
    return (!Session.equals('dialog_template', undefined));
  },
});

Template.Page.events({
  'click .notif': function (event) {
    Session.set('notifications', []);
    if (event.target.id) {
      let dest = '/edit/' + event.target.id;
      if (event.target.className.indexOf('alert') >= 0)
        dest += '/functions';
      else
        dest += '/activity';
      // Utiliser le routeur pour changer de page
      FlowRouter.go(dest);
    }
    return false;
  },
});

// -- PageTop
Template.PageTop.helpers({
  active: function (rt) {
    FlowRouter.watchPathChange(); // Pour que le path soit réactif
    let r = FlowRouter.current();
    if (r)
      return ((r.path.indexOf(rt) > 0) ? 'pure-menu-active' : '');
    return '';
  }

});

Template.PageTop.events({
  "click .pure-menu-link": function (event) {
    let active = document.getElementsByClassName('pure-menu-active')[0];
    if (active != undefined) {
      active.className = active.className.replace('pure-menu-active', '');
    }
    event.currentTarget.className += ' pure-menu-active';
    // A la place de Meteor.logout()
    if (event.target.id === 'logout') Meteor.logout();
  }
});
