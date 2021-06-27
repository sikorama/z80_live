// Globals
import { Session } from 'meteor/session';
import { checkUserRole } from '../api/roles';
import { SourceAsm } from '../api/sourceAsm.js';
import { Schemas } from './schemas.js';

export function dev_log(s) {
  if (Meteor.isDevelopment) console.error("dev");
  if (checkUserRole('admin'))
    console.error(s);
}

Template.registerHelper(
  'userHasMultipleGroups', function () {
    const user = Meteor.user();
    let gr;
    if (user)
      gr = user.groups;

    if (gr === undefined) return false;
    return (gr.length > 1);
  }
)

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
  //console.error(roles, Meteor.userId(), checkUserRole(roles));
  return checkUserRole(roles);
});

// Transforme un type de composant en label
Template.registerHelper('typeLabel', function (type) {
  return (getElementLabel(type));
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
    return ddate = ndate.toLocaleDateString();
    //return ddate;
  }
});

// Formattage de la date
Template.registerHelper('FormatDate', function (date) {
  if (date === undefined) return undefined;
  let ndate = new Date(date);
  return (ndate.toLocaleDateString() + ' ' + ndate.toLocaleTimeString());
})

Template.registerHelper('FormatDay', function (date) {
  if (date === undefined) return undefined;
  let ndate = new Date(date);
  return (ndate.toLocaleDateString());
})


// --------------------- Gestion des formulaires -------------------------

Template.registerHelper('schemas', Schemas);


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
        console.error("remove attachEvent non implémenté");
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
};


// Fonctopn generique pour ajuster la hauteur d'un element,
// en tenant eventuellement compte de sous elements (placés en bas)
function setElementHeight(elclass, elbotclass, botheight) {
  let delta = 0;
  if (elbotclass) {
    // On prend le premier sous element
    sc = document.getElementsByClassName(elbotclass)[0];
    //    console.error('bottom: ', elbotclass, sc);
    if (sc) {
      delta = botheight; //sc.height;
    }
  }

  let scrollable = document.getElementsByClassName(elclass);
  //  console.error('setElementHeight', scrollable, delta);
  if (scrollable.length > 0) {
    for (let i = 0; i < scrollable.length; i++) {
      let el = scrollable[i];
      let from_top = el.getBoundingClientRect().top;
      el.style.height = window.innerHeight - from_top - delta + 'px';
    };
  }
}


// Applique le calcul de la hauteur pour un ensemble d'elements repérés par leur classe
// Permet de gerer proprement les scroll bars.
function setHeight() {
  // Liste de recherche, avec le resultat en bas
  //console.info("Set height");
  setElementHeight('scrollable-panel');
  setElementHeight('scrollable-form', 'scrollable-form-status', 32);
  setElementHeight('scrollable-search', 'scrollable-search-status', 24);

  // TODO: A fusionner avec scrollable-panel
/*  let sidebar_content = document.getElementsByClassName('sidebar-content')[0];
  if (sidebar_content) {
    let from_top = sidebar_content.getBoundingClientRect().top;
    sidebar_content.style.height = window.innerHeight - from_top + 'px';
  }*/
  
};

exports.updateHeight = _.debounce(setHeight, 300);

// Récupere la liste des groupes de l'utilisateur actuel
Template.registerHelper(
  'userGroupList',
  function () {
    //      console.error('userGroupList', Meteor.userId());
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




// Pour le tri des tables, quelques fonctions génériques
// Pour manipuler des variables de session

// Fonction pour recuperer la variable de session liée a la route actuelle
// pour trier la table en cours (on suppose qu'il n'y en a qu'une)
let getRouteSortVar = function () {
  let p = 'Sort' + FlowRouter.current().path;
  return p;
};
//exports.getRouteSortVar = getRouteSortVar;

let getRouteTableSort = function (def) {
  let p = getRouteSortVar();
  let v = Session.get(p);
  if (v === undefined) return def;
  return v;
};
exports.getRouteTableSort = getRouteTableSort;

let setRouteTableSort = function (sv) {
  let p = getRouteSortVar();
  Session.set(p, sv);
};
//exports.setRouteTableSort = setRouteTableSort;

exports.updateRouteTableSort = function (id) {
  // Fonction a mettre en global
  if (id) {
    let sv = getRouteTableSort();
    if ((sv != undefined) && sv.hasOwnProperty(id)) {
      // Inversion du tri
      sv[id] = -sv[id];
    }
    else {
      // Active le tri
      sv = {};
      // Le sens par defaut pourrait dépende du type (date, chaine, number...)
      sv[id] = -1;
    }
    setRouteTableSort(sv);
  }
}



// Recherche récursive de l'id, pour eviter de mettre plusieurs
export function getParentId(el) {
  while ((el.id === undefined || el.id === "") && el.parentElement != undefined) {
    el = el.parentElement;
  }
  return el.id;
}




