import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import './searchArea.html';

Template.searchArea.helpers({
    'searchAreatext': function () {
        return Session.get('sourceSearchString');
    }
});

Template.searchArea.events({
    "submit": function (event) {
        return false;
    },
    "input": _.debounce(function (event) {
        Session.set('sourceSearchString', event.target.value);
    }, 300),
});

