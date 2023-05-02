/**
 * User management, server side
 * 
 **/
import { Meteor } from 'meteor/meteor';
import { role_exists } from '../imports/api/roles';
import { SourceGroups } from '../imports/api/sourceAsm.js';
import { Log } from 'meteor/logging';
import { assertMethodAccess,args } from './utils';
import { Roles } from 'meteor/alanning:roles';
import { Random } from 'meteor/random';

   
//Renvoie vrai si l'utilisateur a un role donnée
//Par défaut les superadmins on tous les roles
//Mais pour certains tests, on ne veut pas bypasser le test
//(Ex: restriction des droits si on est installateur)
//Faire une fonction generale avec differents roles que l'on peut tester (cf api/roles.js?)


Meteor.methods({
  'migrate1': function() {
    try {
      Package['alanning:roles'].Roles._forwardMigrate();
    } catch(e) {
      Log.error(e.stack);
    }
  },
  'migrate2': function() {
    try {
      Package['alanning:roles'].Roles._forwardMigrate2();
    } catch(e) {
      Log.error(e.stack);
    }
  }

});

//Renvoie vrai si l'utilisateur a un role donné
//Par défaut les superadmins on tous les roles
// roles: tableau ou string (séparé par des espaces)
export function hasRole(userId, roles, nobypass) {
  if (userId === undefined) return false;
  if (roles === undefined) return false;

  if (nobypass != true)
    if (Roles.userIsInRole(userId, 'superadmin')) return true;

  let r;
  if (typeof roles === 'string')
    r = roles.split(' ');
  else
    r = roles;

  for (let i = 0; i < r.length; i++) {
    if ((r[i].toLowerCase() != 'superadmin') && (!role_exists(r[i])))
      Log.error(args('has_role(): Role inexistant: ', r[i]));
    else
      if (Roles.userIsInRole(userId, r[i].toLowerCase())) return true;
  }
  return false;
}

// Recuper les groupes associés a un userId
export function getUserGroups(userId) {
  const user = Meteor.users.findOne({
    '_id': userId
  });
  if (user === undefined) return [];
  let userg = user.groups;
  // Si pas de groupe => pas de resulat? ou 'default' ?
  if (userg === undefined) return [];
  return userg;
}

export function setUserGroups(userid, groups) {
  Log.warn('Set User Group', userid, groups);
  if (groups != undefined)
    Meteor.users.update(userid, {
      $set: {
        'groups': groups
      }
    });
}


/**
 * Ajout d'un groupe à un utilisateur
 * @param {*} user_id _id de l'utilisateur a qui on veut ajouter un groupe      
 * @param {*} group  Nom du groupe a ajouter a l'utilisateur
 **/
export function addGroupToUser(user_id, group) {
  // TODO: Verifier l'existence du groupe

  // Verifier l'existen de l'utilisateur
  if (!user_id) {
    Log.error('Tentative d\'ajout d\'un groupe a un utlisateur indéfini');
    return;
  }

  if (!Meteor.users.findOne(user_id)) {
    Log.error('Tentative d\'ajout d\'un groupe a un utlisateur indéfini' + user_id);
    return;
  }

  Log.info('Ajout du groupe', group, 'à l\'utilisateur', user_id);
  Meteor.users.update(user_id, { $addToSet: { groups: group } });
}

/**
 * Affecte un groupe aux seuls utilisateurs de la liste passée en parametre, et retire le groups aux autres
 * @param {*} group Nom du groupe
 * @param {*} users Array of user ids
 * @returns 
 */
export function setUsersForGroup(group, users) {
  // TODO: Verifier l'existence du groupe
  Log.error('setUsersForGroup '+ group + ' ' + users);
  users = users || [];
  Meteor.users.find({}, { fields: { username: 1, _id: 1 } }).forEach((u) => {
    if (users.indexOf(u.username) < 0) {
      // On retire
//      Log.error('Groupe', group, 'Remove', u._id);
      Meteor.users.update(u._id, { $pull: { groups: group } });
    }
    else {
      //on ajoute
//      Log.error('Groupe', group, 'Add', u._id);
      Meteor.users.update(u._id, { $addToSet: { groups: group } });
    }
  });
}


/**
 * Affecte les roles d'un utilisateur
 * 
 * @param {*} userid uid de l'utilisateur 
 * @param {*} roles : tableau contenant la liste exhaustive des roles à affecter
 */
function setUserRoles(userid, roles) {
  if (roles != undefined) {
    Log.warn("set User Roles " + userid + ' ' + roles);
    if (!_.isArray(roles)) {
      Log.error('setUserRoles: roles must be an array');
      return; 
    }
    // Pour chaque role passé, on vire tout ce qui est apres un espace et on force en minuscule
    roles = roles.map((item) => item.split(' ')[0].toLowerCase());

    roles.forEach(function (role) {
      Roles.createRole(role, { unlessExists: true });
    });
    Roles.setUserRoles(userid, roles);
  }
}


//doc: username, mail, password, roles, groups
export function addUser(doc) {
  // TODO: filtrer les role, groupes, etc.. pour que ce soit légal
  const u = Meteor.users.findOne({
    'username': doc.username
  });
  let id;
  if (u) {
    Log.info(args("User", doc.username, 'already exists!', u._id));
    id = u._id;


    //    return;
  }
  else 
  {
  
    id = Accounts.createUser({
      'username': doc.username,
      'email': doc.email,
      'password': doc.password,
    });

    Log.info("Creating new User", doc.username, id);
    
  }

  // Update group
  SourceGroups.upsert({ name: doc.username },  { $set: {desc: 'Private group for ' + doc.username }});

  setUserGroups(id, doc.groups);
  setUserRoles(id, doc.roles);
}

// Ajout des comptes utilisateurs par defaut
// Inciter a changer demo de passe
function createDefaultAccounts() {
  function qaddUser(name, mail, pw, roles, groups) {
    addUser({
      username: name,
      email: mail,
      password: pw,
      roles: roles,
      groups: groups,
    });
  }

// Check if there is an admin account
//Meteor.users.remove({username:'admin'});
const u = Meteor.users.findOne({'username': 'admin'});
if (!u) 
{
  Log.info('Generating admin account');
  let adminpassword = process.env.ADMIN_PASSWORD;
  if (!adminpassword) {
    if (Meteor.isDevelopment) {
      adminpassword='admin';
    }
    else {
      adminpassword = Random.secret();
    }
    Log.info(args('Generated temporary admin password:', adminpassword));
  }
  
  qaddUser('admin', 'admin@z80.amstrad.info', adminpassword, ['admin', 'superadmin'], ['public']);
}

}




// -----------publication

// Publication universelle des Roles de l'utilisateur
Meteor.publish(null, function () {
  if (this.userId) {
    return Meteor.roleAssignment.find({ 'user._id': this.userId });
  } else {
    this.ready();
  }
});

// Publication des Roles
Meteor.publish('userRoles', function () {
  // Si admin
  if (hasRole(this.userId, ['admin'])) {
    return Meteor.roleAssignment.find();
  } else {
    this.ready();
  }
});

Meteor.methods({
  insertUser: function (doc) {
    assertMethodAccess('insertUser', this, ['admin']);
    addUser(doc);
  },
  removeUser: function (uid) {
    assertMethodAccess('removeUSer', this, ['admin']);
    if (!uid) return;
    Log.info(args('Removing user', uid));
    Meteor.users.remove(uid);
  },
  updateUser: function (doc) {
    assertMethodAccess('updateUser', this, ['admin']);

    Log.error(args('updateUser',doc));


    let isSuperAdmin = hasRole(doc._id, ['superadmin']);

    let user = Meteor.users.findOne(doc._id);
    if (user != undefined) {
      // Les roles sont gérés a part
      if (doc.modifier.$set) {

        if (doc.modifier.$set.roles) {
          //Log.error('Role change: ', doc.modifier.$set.roles);
          if (isSuperAdmin) {
            doc.modifier.$set.roles.push('superadmin');
          }
          // Filter super admin ici
          setUserRoles(doc._id, doc.modifier.$set.roles);
          // Si on modifie les roles, alors on retire le profile
          doc.modifier.$unset = doc.modifier.$unset || {};
          delete doc.modifier.$set.roles;
        }

        // Password
        if (doc.modifier.$set.password) {
          Accounts.setPassword(doc._id, doc.modifier.$set.password);
          delete doc.password;
        }

        // mail?
        if (doc.modifier.$set.email) {
          doc.modifier.$set.emails = [{ address: doc.modifier.$set.email, verified: true }];
          delete doc.email;
        }
        Log.warn(args("Update user: ", doc.modifier));
        //safe modifier
        if (Object.keys(doc.modifier.$set).length === 0)
          delete doc.modifier.$set;

        if (Object.keys(doc.modifier).length !== 0)
          Meteor.users.update(doc._id, doc.modifier);
      }
    }
  },
  updateMyUser: function (doc) {
    /**
     * modification de certaines valeurs pour un user
     */

    Log.info(args('updateMyUser', doc));

    if (this.userId === doc._id) {

      if (doc.modifier.$set) {
        // Le user ne peut modifier que 
        // * enableNotifMail

        // on supprime tous les autres
        let enableNotifMail = doc.modifier.$set.enableNotifMail;
        doc.modifier.$set = {};
        if (enableNotifMail != undefined)
          doc.modifier.$set.enableNotifMail = enableNotifMail;

        // safe modifier
        if (Object.keys(doc.modifier.$set).length === 0)
          delete doc.modifier.$set;

        if (Object.keys(doc.modifier).length !== 0)
          Meteor.users.update(doc._id, doc.modifier);
      }
    }
  },
  forcePassword: function (doc) {
    assertMethodAccess('forcePassword', this, ['admin_users']);
    try {
      const newPassword = doc.modifier.$set.password;
      if (_.isEmpty(newPassword)) {
        Log.error('Empty Password');
        return;
      }
      Accounts.setPassword(doc._id, newPassword);
    }
    catch (e) {
      Log.error(e);
    }
  },
  unlogUser: function(uid) {
    assertMethodAccess('unlogUser', this, ['admin_users']);
    const sel = {};
    if (uid)
      sel._id = uid;
    Meteor.users.update(sel, {$set : { "services.resume.loginTokens" : [] }}, {multi:true});
  },
  setUserRoles: function (name, roles) {
    assertMethodAccess('setUserRoles', this, ['admin_users']);
    const user = Meteor.users.findOne({
      'username': name
    });
    Log.warn("SetUserRoles "+ name+ 'Roles '+roles);
    if (user != undefined) {
      setUserRoles(user._id, roles);
    }

  },

 });

// Methodes pour les groupes
Meteor.methods({
  setUsersForGroup: function (doc) {
    assertMethodAccess('setUserGroups', this, ['admin_groups']);
    setUsersForGroup(doc.group, doc.users);
  },
  setUserGroups: function (name, groups) {
    assertMethodAccess('setUserGroups', this, ['admin_groups']);
    const user = Meteor.users.findOne({
      'username': name
    });
    if (user != undefined)
      setUserGroups(user._id, groups);
  },

});




export function init_users() {
  createDefaultAccounts();
}

/**
 * Get user nam from an ID
 * or "Server' if no user is found
 * @param {String} userid 
 * @returns Nom de l'utilisateur
 */
export function getUserName(userid) {
  let username = "Server";

  if (userid != undefined) {
    try {
      username = Meteor.users.findOne(userid).username;
    }
    catch (e) {
      Log.warn('getusername', userid, '=>', username);
    }
  }
  return username;
}

// Shortcut for checking if a user is an admin
export function isAdmin(userId) {
  return hasRole(userId, ['admin']);
}





/*
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
  Log.warn('Set User Group', userid, groups);
  if (groups != undefined)
    Meteor.users.update(userid, {
      $set: {
        'groups': groups
      }
    });
}

export function setUserRoles(userid, roles) {
  Log.warn("set User Roles", userid, roles);
  if (roles != undefined)
    Roles.setUserRoles(userid, roles);
}

/**
 * 
 * @param {*} doc : contains: username, mail, password, roles, groups 
 */
/*
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
      Log.error('ERROR: User not created');
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
      //Log.error('insert user', doc);
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
                  Log.error("Ajout d'un role superadmin illégal");
                  return;
                }
          }

          //Log.error('modifier', doc.modifier);
          Meteor.users.update(doc._id, doc.modifier);
        }
      }
    },
    // An Admin can set a user password
    forcePassword: function (doc) {
      if (isAdmin(this.userId)) {
        try {
          const newPassword = doc.modifier.$set.password;
          Log.error(doc, newPassword);
          Accounts.setPassword(doc._id, newPassword);
        }
        catch (e) {
          Log.error(e);
        }
      }
    },
    setUserRoles: function (name, roles) {
      if (isAdmin(this.userId)) {
        const user = Meteor.users.findOne({
          'username': name
        });
        Log.warn("SetUserRoles", name, roles);
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
*/
