/*
  Detection et Notifications d'evenements:
    - déconnexion au serveur meteor
    - changement de sources
*/

import { Session } from 'meteor/session';
import { checkUserRole } from '../api/roles';

export function notification(id, type, label) {
  let notifs = Session.get('notifications');
  if (!notifs) notifs=[];
  // La limite du nombre de notif est faite au niveau de l'affichage graphique
  notifs.push({'id':id, 'type':type,'label': label});
  Session.set('notifications',notifs);

  // Timeout pour retirer l'alarme
  setTimeout(function() {
    let notifs = Session.get('notifications');
    if (notifs) {
      notifs.splice(0,1);
      Session.set('notifications',notifs);
    }
  },3000);
}
