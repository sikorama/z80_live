// Globals
import { Session } from 'meteor/session';
import { checkUserRole } from '../api/roles';
import { SourceAsm } from '../api/sourceAsm.js';
import { Schemas } from './schemas.js';
//import CodeMirror from 'codemirror';

Template.registerHelper(
  'userHasMultipleGroups', function () {
    const user = Meteor.user();
    let gr;
    if (user)
      gr = user.groups;

    if (gr === undefined) return false;
    return (gr.length > 1);
  }
);

// Renvoie une chaine contenant la représentatin décimale d'un nombre, en ajoutant des espaces
// pour séparer les milliers 10 000
// Bien utiliser la triple accolade pour l'utiliser {{{FormatNumber xx}}}
Template.registerHelper('FormatNumber', function (n) {
  let res = n.toString().replace(/./g, function (c, i, a) {
    return i && c !== "." && ((a.length - i) % 3 === 0) ? '&nbsp;' + c : c;
  });
  return res;
});

// Pour savoir si on est sur un mobile
// Ou si la variable d'environnement isMobilee est a true (via route /mobile)
Template.registerHelper('isMobile', function () {
  if (Session.equals('isMobile', true)) return true;
  return Meteor.isCordova;
});

// Pour recuperer l'ID du source selectionné (via une variable de session)
Template.registerHelper('selectedSourceD', function () {
  return Session.get("curSelected");
});

Template.registerHelper('getSessionVar', function (variable) {
  return Session.get(variable);
});

Template.registerHelper('isSessionVarDefined', function (variable) {
  return (!Session.equals(variable, undefined));
});


Template.registerHelper('sessionVarEquals', function (variable, value) {
  return Session.equals(variable, value);
});

Template.registerHelper('sessionVarTrue', function (variable) {
  return Session.equals(variable, true);
});


// Pour recuperer le source selectionné (via une variable de session)
Template.registerHelper('selectedSource', function () {
  let curSel = Session.get("curSelected");
  return SourceAsm.find({
    id: curSel
  });
});

// Si la chaine de caracter 'role' contient plusieurs mots, il suffit que
// l'un des roles soit assigné a l'utilisateur pour renvoyer vrai
// Une exception: si on est superadmin, ca renvoie oui
Template.registerHelper('isUserRole', function (roles) {
  return checkUserRole(roles);
});

// Jour ou heure selon que c'est le meme jour qu'actuellement
// Ou plutot si il y a moins de 24h
Template.registerHelper('FormatHourOrDate', function (date) {
  if (date === undefined)
    return '';
  let ndate = new Date(date);
  let now = new Date();

  //let ddate = ndate.toLocaleDateString();
  //if (now.toLocaleDateString() === ddate) {
  if (now - ndate < 24 * 3600 * 1000) {
    return (ndate.toLocaleTimeString());
  } else {
    return ndate.toLocaleDateString();
  }
});

// Formattage de la date
Template.registerHelper('FormatDate', function (date) {
  if (date === undefined) return undefined;
  let ndate = new Date(date);
  return (ndate.toLocaleDateString() + ' ' + ndate.toLocaleTimeString());
});

Template.registerHelper('FormatDay', function (date) {
  if (date === undefined) return undefined;
  let ndate = new Date(date);
  return (ndate.toLocaleDateString());
});


// --------------------- Gestion des formulaires -------------------------

Template.registerHelper('schemas', () => Schemas);


// Stringify simple pou rafficher des objets directement dans le html
Template.registerHelper(
  'stringify', function (obj) {
    return JSON.stringify(obj, null, 1);
  });

/*
   Routine pour ajouter/retirer un evenement a un objet
   Avec un peu de compatibilité pour différents navigateurs
   Attention au probleme de l'ajout multiple => onCreated/onDestroyed
   https://stackoverflow.com/questions/19920428/meteor-js-how-to-set-a-div-height-dynamically-via-javascript
 */
export function addEvent(object, type, callback, disable) {
  if (object == null || typeof (object) == 'undefined') return;
  let meth = "";

  try {
    if (object.addEventListener) {
      if (disable === true)
        object.removeEventListener(type, callback);
      else
        object.addEventListener(type, callback, false);
    } else if (object.attachEvent) {
      meth = 'attachEvent';
      if (disable === true)
        console.error("Remove attachEvent not implemented");
      else
        object.attachEvent("on" + type, callback);
    } else {
      meth = 'on' + type;
      if (disable === true) {
        object["on" + type] = null;
      } else
        object["on" + type] = callback;
    }
  } catch (e) {
    console.error(e.stack);
  }
  if (meth != "")
    console.warn("addEvent - non standard method", meth, object, type);
}

function setElementHeight(elclass, elbotclass, botheight) {

  try {

    let delta = 0;
    if (elbotclass) {
      let sc = document.getElementsByClassName(elbotclass)[0];
      if (sc) {
        delta = botheight;
      }
    }

    if (botheight) delta = botheight;
    //console.debug('setElementHeight ' + elbotclass + ' delta=' + delta);

    let scrollable = document.getElementsByClassName(elclass);
    //console.debug('scrollable ' + elclass + ' ' + scrollable.length + ' element found');

    if (scrollable.length > 0) {
      for (let i = 0; i < scrollable.length; i++) {
        let el = scrollable[i];
        let from_top = el.getBoundingClientRect().top;
        let h = window.innerHeight - from_top - delta + 'px';
        el.style.height = h;
        //console.debug('element ' + el + ' set height ' + h);
      }
    }
  }
  catch (e) {
    console.error(e);
  }
}


// Applique le calcul de la hauteur pour un ensemble d'elements repérés par leur classe
// Permet de gerer proprement les scroll bars.
export function setHeight() {
  try {

    setElementHeight('scrollable-panel');
    setElementHeight('scrollable-build-panel', null, 50);
    setElementHeight('scrollable-form', 'scrollable-form-status', 32);
    setElementHeight('scrollable-search', 'scrollable-search-status', 24);

    // Code Mirror Editor
    let textArea = document.getElementById('source');
    if (textArea) {
      //console.debug('textArea:'+textArea);
      let cm = CodeMirrors.source;
      if (cm) {
        let from_top = textArea.getBoundingClientRect().top;
        let buttonmargin=214;
        if (Meteor.userId()) 
            buttonmargin=264;

        let newh = '' + (window.innerHeight - from_top - buttonmargin) + 'px';
        cm.setSize(null, newh);
        console.debug('cm found, From top=' + from_top + ' Inner Height=' + window.innerHeight + '=>' + newh);
        return true;
      }

    }
    else {
      console.debug('No text area found');
    }
  }
  catch (e) {
    //console.error('setHeight exception');
    console.error(e.stack);
    return true;
  }
  // Couldn't get textArea, return false
  return false;

}

export const updateHeight = _.debounce(setHeight, 500);

Template.registerHelper(
  'userGroupList',
  function () {
    if (Meteor.user().groups === undefined)
      return undefined;
    return (Meteor.user().groups.map(function (item) {
      return {
        label: item,
        value: item
      };
    }));
  }
);

// get Name of session var, containing the sort object
function getRouteSortVar() {
  let p = 'Sort' + FlowRouter.current().path;
  return p;
}

// Get internal sort object (may contain compound field names)
export function getRouteTableSort(def) {
  let p = getRouteSortVar();
  let v = Session.get(p);
  if (v === undefined) return def;
  return v;
}

function setRouteTableSort(sv) {
  let p = getRouteSortVar();
  Session.set(p, sv);
}

/**
 * Update Sorting for the table associated with the route
 * 
 * @param {String} id : Field name for sorting
 */
export function updateRouteTableSort(id) {
  // Fonction a mettre en global
  if (id) {
    let sv = getRouteTableSort();
    if ((sv != undefined) && sv.hasOwnProperty(id)) {
      // Invert sort order
      sv[id] = -sv[id];
    }
    else {
      // Enable sorting
      sv = {};
      // Default order
      sv[id] = -1;
    }
    setRouteTableSort(sv);
  }
}

/**
 * Get Sort object, to use for sort function
 * @param {*} def : Default Sort object
 */
export function getRouteTableSortObj(def) {
  let o = getRouteTableSort(def);
  let so = {};
  let k = Object.keys(o)[0];
  k.split(",").forEach((f) => { so[f] = o[k]; });
  return so;
}

// Recursive search of id property in htlm elements, in DOM
export function getParentId(el) {
  while ((el.id === undefined || el.id === "") && el.parentElement != undefined) {
    el = el.parentElement;
  }
  return el.id;
}
