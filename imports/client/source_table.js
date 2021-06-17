import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { SourceAsm } from '../api/sourceAsm.js';
import { getRouteTableSort, updateHeight, updateRouteTableSort } from './globals.js';
import './source_table.html';
import './searchArea.js';
import './source_select.js';

import { dev_log, getParentId } from './globals.js';


Template.SourceTable.onRendered(function () {
  this.subscribe("sourceInfos");
  updateHeight();
});

Template.SourceTable.events({
  // Tri
  "click th": function (event) {
    let id = event.currentTarget.id;
    updateRouteTableSort(id);
  }
});

Template.SourceTable.helpers({
  // afichage du résumé du résultat: nbre de sources...
  // Attendre la fin de la recherche pour afficher la valeur?
  displayCount: function (cnt) {
    let res = '';
    if (cnt === 0) res = 'Nothing found';
    if (cnt === 1) res = '1 File found';
    if (cnt > 1) res = cnt + ' Items found';
    // Criteres? Pages/cnt?
    return res;
  },
  search_sources: function () {
    //let cur_sort_field = Session.get('sourceSortField');
    let cur_sort_dir = Session.get('sourceSortDir');
    let curSearch = Session.get("sourceSearchString");
    let grfilter = Session.get('sourceSearchGroups');
    let typfilter = Session.get('sourceSearchFilters');
    //    let skippv = Session.get('sourceSearchSkip');

    let selector = {};

    if (curSearch.length > 0) {
      let fieldSearch = { "$regex": ".*" + curSearch + ".*", "$options": "i" }
      selector = {
        '$or':
          [{ name: fieldSearch },
          { author: fieldSearch },
          { desc: fieldSearch },
          { cat: fieldSearch }
          ]
      };
    }

    if (grfilter.length > 0) {
      selector.group = { '$in': grfilter };
    }

    if (typfilter.length > 0) {
      selector["buildOptions.buildmode"] = { '$in': typfilter };
    }

    return SourceAsm.find(selector, { sort: getRouteTableSort({ timestamp: -1 }), fields: { code: 0 } });
  },

});


Template.SourceTableItem.helpers({
  username(id) {
//    console.error(id, Meteor.users.findOne(id));
    return Meteor.users.findOne(id).username; 
  },

})

Template.SourceTableItem.events({
  "click td": function (event) {
    const sid = getParentId(event.currentTarget);
  //  console.error(sid);
    if (sid)
      FlowRouter.go('/edit/' + sid);
  }
});


