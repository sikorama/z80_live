/**
 * Gestion des utilisateurs, coté serveur
 */
import {
  Meteor
} from 'meteor/meteor'

import {
  SourceGroups
} from '../imports/api/sourceAsm.js';

//Renvoie vrai si l'utilisateur est un admin
//Faire une fonction generale avec differents roles que l'on peut tester (cf api/roles.js?)
export function hasRole(userId, roles) {
  if (userId) {
    let user = Meteor.users.findOne({
      '_id': userId
    });

    if (user) {
      // Bypass pour les superadmins
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

// Raccourci pour tester si on est admin
export function isAdmin(userId) {
  return hasRole(userId, ['admin']);
}

// Recuper les groupes associés a un userId
export function getUserGroups(userId) {
  const user = Meteor.users.findOne({
    '_id': userId
  });
  if (!user) return [];
  const userg = user.groups;
  // Si pas de groupe => pas de resulat? ou 'default' ?
  if (userg === undefined) return [];
  return userg;
}


export function setUserGroups(userid, groups) {
  console.warn('Set User Group', userid, groups);
  // Ajouter groups ici?
  if (groups != undefined)
    Meteor.users.update(userid, {
      $set: {
        'groups': groups
      }
    });
};

export function setUserRoles(userid, roles) {
  console.warn("set User Roles", userid, roles)
  if (roles != undefined)
    Roles.setUserRoles(userid, roles);
};

//doc: username, mail, password, roles, groups
export function addUser(doc) {
  // TODO: filtrer les role, groupes, etc.. pour que ce soit légal

  // On créé un groupe associé a l'utilisateur
  //SourceGroups.insert({ name: doc.username, desc: 'Groupe pour '+doc.username });
  SourceGroups.upsert({ name: doc.username }, { name: doc.username, desc: 'Groupe pour ' + doc.username });
  doc.groups.push(doc.username);

  const u = Meteor.users.findOne({
    'username': doc.username
  });

  if (u === undefined) {

    Accounts.createUser({
      'username': doc.username,
      'email': doc.email,
      'password': doc.password,
      'autobuild': 1500,
      profile: {
        //publicly visible fields like firstname goes here
        // Modifiable par l'utilisateur lui meme
      },
      'groups': doc.groups
    });

    const user = Meteor.users.findOne({
      'username': doc.username
    });

    setUserGroups(user._id, doc.groups);
    setUserRoles(user._id, doc.roles);
  }
}

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


// Ajout des comptes utilisateurs par defaut
// Inciter a changer demo de passe
function createDefaultAccounts() {
  qaddUser('admin', 'admin@rasmlive.amstrad.info', 'password', ['admin', 'superadmin'], ['public']);
};

export function init_users() {
  Meteor.methods({
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
            // 2 cas: soit on a un unser.role, auquel cas on le remplace par un set.role
            // Soit un set role et dans ce cas il faut ajouter le superadmin dedans
            // FIXME: il doit y avoir un moyen plus elegant de faire ca, on a bcp de tests
            // de undefined et des delete...
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
                  console.error("Ajout d'un role superadmin illégal")
                  return;
                }
          }

          //console.error('modifier', doc.modifier);

          Meteor.users.update(doc._id, doc.modifier);
        }
      }
    },
    forcePassword: function (doc) {
      if (isAdmin(this.userId)) {
        try {
          const newPassword = doc.modifier['$set'].password;
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
        console.warn("SetUserRoles", name, roles)
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
