/**
 * Gestion des utilisateurs, coté serveur
 */
import { Meteor } from 'meteor/meteor';
import { SourceGroups } from '../imports/api/sourceAsm.js';

//Renvoie vrai si l'utilisateur est un admin
//Faire une fonction generale avec differents roles que l'on peut tester (cf api/roles.js?)
export function hasRole(userId, roles) {
  if (userId) {
    let user = Meteor.users.findOne({
      '_id': userId
    });

    if (user) {
      // Bypass for superadmin
      if (user.roles != undefined) {

        if (user.roles.indexOf("superadmin") >= 0) return true;

        let r;
        if (typeof roles === 'string')
          r = roles.split(' ');
        else
          r = roles;

        for (i = 0; i < r.length; i++) {
          if (user.roles.indexOf(r[i]) >= 0) return true;
        }
      }
    }
  }
  return false;
}

// Shortcut for checing if a user is an admin
export function isAdmin(userId) {
  return hasRole(userId, ['admin']);
}

// Get user's groups
export function getUserGroups(userId) {
  const user = Meteor.users.findOne({
    '_id': userId
  });
  if (!user) return ['public'];
  const userg = user.groups;
  if (!userg) return ['public'];
  return userg;
}

export function setUserGroups(userid, groups) {
  console.warn('Set User Group', userid, groups);
  if (groups != undefined)
    Meteor.users.update(userid, {
      $set: {
        'groups': groups
      }
    });
}

export function setUserRoles(userid, roles) {
  console.warn("set User Roles", userid, roles);
  if (roles != undefined)
    Roles.setUserRoles(userid, roles);
}

/**
 * 
 * @param {*} doc : contains: username, mail, password, roles, groups 
 */
export function addUser(doc) {
  if (!doc) return;
  if (!doc.username) return;

  // Check if user already exists
  // Otherwise, create a new user
  let u = Meteor.users.findOne({
    'username': doc.username
  });

  doc.groups=doc.groups || [];
  doc.groups.push(doc.username);

  if (u === undefined) {

    // Create a group for the user
    SourceGroups.upsert({ name: doc.username }, { name: doc.username, desc: 'Private group for ' + doc.username });

    u = Accounts.createUser({
      'username': doc.username,
      'email': doc.email,
      'password': doc.password,
      'autobuild': 1500,
      profile: {
        //publicly visible fields like firstname goes here
        //Canbe changes by the user
      },
      'groups': doc.groups
    });

//    u = Meteor.users.findOne({
//      'username': doc.username
//    });
    if (u) {
      setUserGroups(u._id, doc.groups);
      setUserRoles(u._id, doc.roles);
    }
    else {
      console.error('ERROR: User not created');
    }
  }
}

// Handy/Quick add user function
function qaddUser(name, mail, pw, roles, groups) {
  addUser({
    username: name,
    email: mail,
    password: pw,
    roles: roles,
    groups: groups,
    enableAudio: false
  });
}

// Add default Accounts (if none exists)
// TODO: Check if there is no superadmin
// FIXME: ask for changing password...
function createDefaultAccounts() {
  if (Meteor.users.find().count()===0)
    qaddUser('admin', 'admin@rasmlive.amstrad.info', 'password', ['admin', 'superadmin'], ['public']);
}

export function init_users() {
  Meteor.methods({
    removeUser: function(userid) {
      if (isAdmin(this.userId)) {
        // All sources of this user wich are not public
        // Should be moved to a specific group (admin or no-user)
        Meteor.users.remove(userid);
      }
    },
    insertUser: function (doc) {
      //console.error('insert user', doc);
      if (isAdmin(this.userId)) {
        // Ajout de l'utilisateur
        addUser(doc);
      }
    },
    updateUser: function (doc) {
      if (isAdmin(this.userId)) {
        let user = Meteor.users.findOne(doc._id);
        if (user != undefined) {
          // Cas particulier du superadmin: on ne peut pas lui retirer!
          if (hasRole(doc._id, ['superadmin'])) {
            // FIXME: could be easier...
            if ((doc.modifier.$unset != undefined) && (doc.modifier.$unset.roles != undefined)) {
              delete doc.modifier.$unset.roles;
              if (Object.keys(doc.modifier.$unset).length === 0)
                delete doc.modifier.$unset;
              if (doc.modifier.$set === undefined)
                doc.modifier.$set = {};
              doc.modifier.$set.roles = ['superadmin'];
            } else {
              if (doc.modifier.$set.roles === undefined)
                doc.modifier.$set.roles = {};
              if (doc.modifier.$set.roles.indexOf('superadmin') < 0)
                doc.modifier.$set.roles.push('superadmin');
            }
          } else {
            // Filtrage des roles autorisés: on n'a pas le droit de se mettre superadmin
            if (doc.modifier.$set !== undefined)
              if (doc.modifier.$set.roles !== undefined)
                if (doc.modifier.$set.roles.indexOf('superadmin') >= 0) {
                  console.error("Ajout d'un role superadmin illégal");
                  return;
                }
          }

          //console.error('modifier', doc.modifier);
          Meteor.users.update(doc._id, doc.modifier);
        }
      }
    },
    // An Admin can set a user password
    forcePassword: function (doc) {
      if (isAdmin(this.userId)) {
        try {
          const newPassword = doc.modifier.$set.password;
          console.error(doc, newPassword);
          Accounts.setPassword(doc._id, newPassword);
        }
        catch (e) {
          console.error(e);
        }
      }
    },
    setUserRoles: function (name, roles) {
      if (isAdmin(this.userId)) {
        const user = Meteor.users.findOne({
          'username': name
        });
        console.warn("SetUserRoles", name, roles);
        if (user != undefined)
          setUserRoles(user._id, roles);
      }
    },
    setUserGroups: function (name, groups) {
      if (isAdmin(this.userId)) {
        let user = Meteor.users.findOne({
          'username': name
        });
        if (user != undefined)
          setUserGroups(user._id, groups);
      }
    }

  });

  createDefaultAccounts();
}
