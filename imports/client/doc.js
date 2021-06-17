import './doc.html';
import { Session } from 'meteor/session';


Template.Documentation.onRendered(function() {
    Meteor.call('getParam','discord_invite', function(err,res) {
        Session.set('discord_invite',res)
    });
});

Template.Documentation.helpers({
    discord() {
        return Session.get('discord_invite'); 
    }
});



