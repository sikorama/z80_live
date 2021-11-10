/* Notifications :
  - rocket chat
 sur
  - les ajouts de code source
 */

import { getParam } from './settings.js';

// Pour l'envoi de notif rocket.chat
let httpreq = require('httpreq');

// Notification modification/insertion ficher
function sendNotifRocket(typestr, db, user, info, relurl, icon) {
  if (getParam('rocketNotifUpdates') === true)
    Meteor.call('sendRocket', typestr + ' ' + db + ' "' + info + '" par ' + user, '', icon, getParam('URL') + '/' + relurl);
  else {
    console.info(typestr + db + ' "' + info + '" par ' + user);
  }
}

exports.sendNotifRocket = sendNotifRocket;

// Hooks pour notifications (matb33:collection-hooks)
// Permet d'avoir acces au _id a l'insertion et donc d'envoyer un lien avec la reference
exports.init_notifications = function () {
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
        payload.channel = "#rasm_live";

        let url = getParam('rocketIP');
        let token = getParam('rocketToken');

        let urlWebHook_rocket = url + '/hooks/' + token;

        httpreq.post(urlWebHook_rocket, {
          json: payload
        }, function (err, res) {
          if (!err) {
            //console.info("sendRocket: " + JSON.stringify(res));
          } else {
            console.error("sendRocket:", res, err);
          }
        });

      } catch (e) {
        console.error('sendRocket: ', text, e.stack);
      }
    }
  });
};
