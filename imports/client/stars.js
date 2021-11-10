import { Template } from 'meteor/templating';
import { UserRatings } from '../api/sourceAsm.js';
import './stars.html';

function getScore() {
    const d = Template.currentData();
    let v = 0;
    // There is an id: retrieve user's rating
    if (d.id) {
      let u = Meteor.user();
      if (u) {
        let ur = UserRatings.findOne({ srcid: d.id, user: u._id });
        if (ur) {
          v = ur.score;  
        }
      }
    }
    else {
      // There's no id, user parameters sent to the template
      if (d.numvotes) {
          v = Math.round(100 * d.score / d.numvotes) / 100;
        } 
      }
    return v;
}

Template.Stars.onRendered(function(){
  const d = Template.currentData();
  if (d.id)
    this.subscribe('userratings', d.id);
});


Template.Stars.helpers({
  rating : getScore, 
  stars() {
    const d = Template.currentData();
    let v = getScore();
    let res = "";

    let cl = "star";
    if (!d.id) {
      cl += " unclickable";
    }

    for (let i = 1; i <= 5; i++) {
      res += '<button class="' + cl + '" name="' + i + '">';
      res += (i <= v) ? '&starf;' : '&star;';
      res += '</button>';
    }
    return res;
  }
});
Template.Stars.events({
  "click .star": function (ev) {
    const d = Template.currentData();
    if (d.id) {
      const n = ~~ev.currentTarget.name;
      Meteor.call('uservote', d.id, n);
    }
  }
});
