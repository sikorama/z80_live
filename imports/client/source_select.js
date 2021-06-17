import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';

// Panel de filtrage
Template.SourceSelect.helpers({
    // Renvoie la liste de Servers activés, triés selon le nom
    // A remplacer par des groupes... la liste des groupes est associée a chaque utilisateur
    groups: function () {
        let gr = Meteor.user().groups;
        if (gr === undefined)
            return;
        let sel = Session.get('sourceSearchGroups');
        if (sel === undefined)
            sel = [];
        let res = gr.map(function (item) {
            let v = '';
            if (sel.indexOf(item) >= 0)
                v = 'checked';
            return ({
                'name': item,
                'checked': v
            });
        });
        return res;
    },
    // Renvoie 'checked' si aucun groupe n'est selectionnée
    no_group_checked: function () {
        let gr = Session.get('sourceSearchGroups');
        if (gr === undefined)
            return 'checked';
        if (gr.length === 0)
            return 'checked';
        else
            return '';
    },
    seltags: function () {
        return Session.get("sourceSearchFilters");
    },
    checked_filter: function (id) {
        let curf = Session.get("sourceSearchFilters");
        if (curf === undefined)
            return "";
        let it = curf.indexOf(id);
        return (it >= 0 ? 'checked' : '');
    },
    filters: function () {
        const f = [{
            'id': 'dsk',
            'label': 'Disk'
        },
        {
            'id': 'sna',
            'label': 'Snapshot'
        },
        {
            'id': 'lib',
            'label': 'Library',
        },
        {
            'id': 'raw',
            'label': 'User defined',
        }
        ];
        return (f);
    }
});
Template.SourceSelect.events({
    "click .onegroup": function (event) {
        let t = event.target.id;
        let gr = Session.get('sourceSearchGroups');
        if (gr === undefined)
            gr = [t];
        else {
            idx = gr.indexOf(t);
            if (idx >= 0)
                gr.splice(idx, 1);
            else
                gr.push(t);
        }
        Session.set('sourceSearchGroups', gr);
        event.preventDefault();
    },
    "click .allgroups": function (event) {
        Session.set('sourceSearchGroups', []);
        event.preventDefault();
    },
    "click .search-by-tag": function (event) {
        if (event.target.type === 'checkbox') {
            let t = event.target.id; //.toLowerCase()
            let curf = Session.get("sourceSearchFilters");
            if (curf === undefined)
                curf = [];
            let it = curf.indexOf(t);
            if (it >= 0)
                curf.splice(it, 1);
            else {
                curf.push(t);
                // Verification des exclusions mutuelles
                const exl = {
                    'disconnected': 'connected',
                    'connected': 'disconnected'
                };
                if (exl[t] != undefined) {
                    let ie = curf.indexOf(exl[t]);
                    if (ie >= 0)
                        curf.splice(ie, 1);
                }
            }
            //      console.error(event.target,t,curf);
            Session.set('sourceSearchFilters', curf);
            event.preventDefault();
        }
    }
});
