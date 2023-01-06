
import {Log} from 'meteor/logging';

// Verification des roles. Coté client uniquement (coté serveur le code est dans le repertoire server)
// On peut envoyer un tableau ou une chaine séparée par des espace pour les roles
export function checkUserRole(roles, uid, strict_check) {
//  if (uid === undefined)
//    uid = Meteor.userId();
  // Si c'est une chaine, on la split en tableau
  if (roles === undefined) {
    Log.error('checkUserRole: pas de role spécifié');
    return false;
  }

  uid = uid || Meteor.userId();
  //Log.debug('checkUserRole:',uid, roles);

  // Bypass pour les super admins,sauf si strict_check==true
  if ((strict_check !== true) && (Roles.userIsInRole(uid, 'superadmin')))
    return true;

  // Sinon on teste
  let r;

  // Tableau ou string?
  if (typeof roles === 'string')
    r = roles.split(' ');
  else
    r = roles;

  for (let i = 0; i < r.length; i++) {
    // Verification que le role existe
    if (!role_exists(r[i])) 
    {
      Log.error('Le role', r[i], "n'existe pas!");
//      return true;
    }
    else
    if (Roles.userIsInRole(uid, r[i].toLowerCase())) return true;
  }
  return false;
}

// Liste de tous les roles existants
export const all_roles = {  
  admin: 'Accede au panel admin',
};

export function get_all_roles() {
  return Object.keys(all_roles);
}

export function role_exists(role) {
  return all_roles.hasOwnProperty(role);
}