
// Verification des roles. Coté client uniquement (coté serveur le code est dans le repertoire server)
// On peut envoyer un tableau ou une chaine séparée par des espace pour les roles
let checkUserRole = function(roles) {
  // Bypass pour les super admins
  if ( Roles.userIsInRole(Meteor.userId(),'superadmin')) return true;
  // Sinon on teste
  // Si c'est une chaine, on la split en tableau
  if (roles===undefined) return false;
  let r;

  // Tableau ou string?
  if (typeof roles === 'string')
    r = roles.split(' ');
  else
    r = roles;

  for (i=0; i<r.length; i++)
  {
      if (Roles.userIsInRole(Meteor.userId(), r[i] )) return true;
  }
  return false;
}
exports.checkUserRole = checkUserRole;
