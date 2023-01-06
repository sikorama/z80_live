/* Notifications :
  - rocket chat
 sur
  - les ajouts de code source
 */

import { getParam } from './settings.js';
import { Log } from 'meteor/logging';

// Pour l'envoi de notif rocket.chat
let httpreq = require('httpreq');

// Notification modification/insertion ficher
export function sendNotifRocket(typestr, db, user, info, relurl, icon) {
  if (getParam('rocketNotifUpdates') === true)
    Meteor.call('sendRocket', typestr + ' ' + db + ' "' + info + '" par ' + user, '', icon, getParam('URL') + '/' + relurl);
  else {
    Log.info(typestr + db + ' "' + info + '" par ' + user);
  }
}

// Hooks pour notifications (matb33:collection-hooks)
// Permet d'avoir acces au _id a l'insertion et donc d'envoyer un lien avec la reference
export function init_notifications() {
  Meteor.methods({
    sendRocket: function (title, text, icon, title_link, additional_attachments) {

      try {
        let payload = {};

        if (title !== undefined) {
          payload.attachments = [{
            "title": title,
            "text": text,
            'title_link': title_link
          }];
          if (additional_attachments != undefined) {
            payload.attachments = payload.attachments.concat(additional_attachments);
          }
        } else {
          payload.text = text;
        }

        if (icon !== undefined) {
          payload.icon_emoji = icon;
        }

        let sender = getParam('Name');
        if (sender !== undefined) {
          payload.username = sender;
        }

        // Ajout du channel en fonction du type de serveur
        payload.channel = "#z80_live";

        let url = getParam('rocketIP');
        let token = getParam('rocketToken');

        let urlWebHook_rocket = url + '/hooks/' + token;

        httpreq.post(urlWebHook_rocket, {
          json: payload
        }, function (err, res) {
          if (!err) {
            //Log.info("sendRocket: " + JSON.stringify(res));
          } else {
            Log.error(err);
          }
        });

      } catch (e) {
        Log.error('sendRocket: '+ e.stack);
      }
    }
  });
}