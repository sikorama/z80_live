// Doc Account: https://github.com/meteor-useraccounts/core/blob/master/Guide.md#boilerplates

import { Template } from 'meteor/templating';

import './myprofile.html';

Template.MyProfile.helpers({
  me: function() {return Meteor.user();}
});

Template.MyProfile.events({
});
