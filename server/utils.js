
  // Verification que l'on est autorisé a recuperer
// des elements sur un myhub donnée
// renvoie undefined ou la description du myhub

import { Meteor } from 'meteor/meteor';
import { getUserGroups, hasRole } from "./user_management";
import {Log} from 'meteor/logging';
//import { notifyError, throwError, Log.debug, Log.error, Log.info, Log.warn } from '../error';
//import { countDocuments } from "../../imports/api/search";
//import { getIndex } from '../../imports/api/collections';

export function args(...args) {
  return args.map(i=>{if (_.isObject(i)) return JSON.stringify(i); else return i;}).join(' ');
}



/*export function safePublication(sel,opt, context) {
  sel = safeSel(sel);
  opt = safeOpt(opt, context);
  return {sel: sel, opt:opt};
}
*/

/**
 * Returns a safe Selector 
 * @param {*} sel 
 * @returns 
 */
export function safeSel(sel) {
  // Si c'est un objet, on le retourne
  if (sel !== null && typeof sel === 'object') return sel;
  // Si c'est undefined, on renvoit un objet vide
  if (!sel) return {};
  // Sinon c'est que c'était un _id
  return { _id: sel };
}

/**
 * Returns a safe Option object 
 * @param {*} opt 
 * @param {*} context : contexte de la publication: parametres optionels (skip, limit), label et user (this)
 * @returns : options de recherche safisée
 */
export function safeOpt(opt, context) {
  opt = opt || {};

  context = context || {};
  if (!context.user || !context.label) {
    Log.debug('safeOpt', context.label, ':', opt, ':veuillez passer un label et un user (this) dans le parametre context');
  }

  let warnmsg;

  // Pas de limite explicite?
  if (!opt.hasOwnProperty('limit')) {
    let dlimit = 0;
    if (context.hasOwnProperty('limit')) {
      dlimit = context.limit;
    }
    warnmsg = 'Pas de limite explicite définie dans ' + JSON.stringify(opt) + ' on utilise la valeur par defaut ' + dlimit;
    opt.limit = dlimit;
  }

  if (warnmsg) {
    if (context.user) {
      warnmsg += ' user=' + context.user.userId;
    }
    if (context.user?.connection?.id) {
      warnmsg += ' session=' + context.user.connection.id;
    }
    if (context.selector) {
      warnmsg += ' selector=' + JSON.stringify(context.selector);
    }

    Log.warn('Safe Opt "' + context.label + '":', warnmsg);
  }


  if (!opt.hasOwnProperty('skip')) {
    if (!context.hasOwnProperty('skip'))
      context.skip = 0;
    else
      opt.skip = context.skip;
  }

  return opt;
}


/**
 * Fonction pour verifier les roles pour la souscription à une publication, en envoyant des messages d'erreur le cas échéant
 * 
 * @param {*} publication : nom de la publication, permet de retracer les bugs de souscription
 * @param {*} userId : id de l'utilisateur
 * @param {*} role : roles à vérifier - si pas de role, on ne verifie que l'id user
 * @returns 
 */
export function checkSubscriptionRole(publication, userId, role) {
  return checkResourceAccess('Souscription ' + publication, userId, role);
}

// Fonction pour verifier les roles pour l'appel à une méthode
// Si l'acces est impossible, emet une exception
// Les methodes viennent avec un contexte qui permet de récuperer les infos sur la connexion et sur l'utilisateur logué
/**
 * 
 * @param {string} methodname : nom pour identifier la methode dans le log
 * @param {*} context : Objet contenant le contexte ('this' en général)
 * @param {*} role : optionel, roles (tableau ou chaine séparée par des espaces) autorisés pour l'acces
 * @returns 
 */
export function assertMethodAccess(methodname, context, role) {

  let uid;
  if (typeof context === 'string') {
    uid = context;
    Log.warn('utilisation de assert method access avec context=', context, 'au lieu du contexte complet pour', methodname);
  }
  else {
    uid = context.userId;
  }
  const r = checkResourceAccess('Method ' + methodname, uid, role);
  if (!r) throwError('methodNotAllowed', 'Accès méthode ' + methodname + ' non autorisée', 'UserId=' + uid + ' connection id=' + context.connection?.id + ' ip=' + context.connection?.clientAddress);
  return r;
}


/**
 *  Verifie le droit d'acces a une ressource pour un utilisateur donné
 *  Si un ou des roles sont spécifiés, vérifie que l'utilisateur a le role. Sinon vérifie qu'il est logué
 *  Si non autorisé, notifie l'erreur 
 *  
 * @param {*} resource : nom de la ressource, sert pour le message logué/notifié
 * @param {*} userId : id de l'utiliasteur (e.g. this.userId())
 * @param {*} role : roles pour acceder à la ressource
 * @returns true si l'utilisateur est autorisé à acceder à la ressource
 */
export function checkResourceAccess(resource, userId, role) {

  if (!userId) {
    // On ne notifie pas, parce que ca peut arriver quand un utilisateur sort d'hibernation par ex, ca floode inutilement. Le log est suffisant

    Log.error('Accès ' + resource + ' non autorisée pour un utilisateur non logué');
    return false;
  }

  if (role && !hasRole(userId, role)) {
    let user = Meteor.users.findOne(userId);
    let u;
    if (!u)
      u = userId;
    else
      u = user.username;

      throwError('Acces ' + resource + ' non autorisée pour ' + u, { level: 'warn', reason: 'droit requis:' + role });
    //Log.warn('Souscription ' + publication + ' non autorisée pour ', u, '(droit requis:', role + ')');
    return false;
  }
  return true;
}



/**
 * Verifie qu'un modifier est correct:
 *  - pas de champ commun entre $set et $unset (on retire celui du $unset le cas echeant)
 *  - pas de champ $set ou $unset vide (on le retire)
 *  - warning si autre champ que $set ou $unset
 * (on ne gere pas les $push, $inc...)
 * 
 * @param {*} modifier : objet contenant $set et/ou $unset
 */
export function safeModifier(modifier) {
  try {
    // Verifier champs communs entre $set et $unset
    if (modifier.$unset && modifier.$set) {
      Object.keys(modifier.$unset).forEach((k) => {
        if (modifier.$set.hasOwnProperty(k)) {
          Log.warn('Champ "', k, '" commun entre $set et $unset, on retire celui du $unset. Modifier=', modifier);
          delete modifier.$unset[k];
        }
      });
    }

    // Verifier qu'il n'y a pas d'autre champs? 
    let invalidkeys = Object.keys(modifier).filter((k) => ['$push', '$inc', '$set', '$unset'].indexOf(k) < 0);
    if (invalidkeys.length > 0) {
      Log.error('Champ(s) non autorisé(s) pour un modifier', invalidkeys);
      invalidkeys.forEach((k) => { delete modifier[k]; });
    }

  }
  catch (e) {
    Log.error(e);
  }
  // Filtre final: si $set ou $unset sont vides, on les retire
  if (_.isEmpty(modifier.$unset)) delete modifier.$unset;
  if (_.isEmpty(modifier.$set)) delete modifier.$set;
}

// Test unitaire de la fonction safeModifier:
//let m= { wrongmod: 1,  $set: {machin:2, truc:1}, $unset:{truc:1}};
//safeModifier(m);
// => m doit etre reduit au champ ŝset initial


Meteor.methods({
  /**
   * 
 * Methode servant a compter le nombre d'élements d'une requete, a travers un index
 * @param {*} indexName : Nom de l'index
 * @param {*} searchString : Chaine de recherche utilisée (peut etre vide)
 * @param {*} searchOptions : Options à passer a l'index pour construire le selecteur
 * @returns 
 */
  // TODO: faire un wrapper spécifique pour pouvoir associer le nom de l'index avec celui de la méthode
  // Ainsi que gerer les droits spécifiques a l'index
/*

  'countDocuments': standard_method('countDocuments', null, function (indexName, searchString, searchOptions) {
    this.unblock();
    let io = getIndex(indexName);
    Log.debug('Count Documents for index', indexName);
    return countDocuments(io, searchString, searchOptions);
  })
  */
});


/** Decorator for methods
* 
* @param {*} name : method name (for logs)
* @param {*} roles : optional
* @param {*} wrapped : function to call
* @returns résultat de la fonction ou exception Meteor
*/
export function standard_method(name, roles, wrapped) {
   return function () {
       const d00 = Date.now();
       Log.debug('Meteor Call : '+ name+ ' for '+ this.userId);
       assertMethodAccess(name, this, roles);

       const result = wrapped.apply(this, arguments);
       const duration = Date.now() - d00;
       let qualif;
       if (duration > 50) qualif = 'very';
       if (duration > 100) qualif += ' very';
       if (duration > 500) qualif += ' very';
       if (duration > 1000) qualif += ' VERY';
       if (qualif)
           Log.warn(['Method Duration', name, qualif, 'long:', duration, 'ms'].join(' '));
       else
          Log.debug([name, 'finished in', Date.now() - d00, 'ms'].join(' '));
       return result;
   };
}


/**
 * Throw & log a Meteor exception (for methods)
 * @param {*} error 
 * @param {*} reason 
 * @param {*} detail 
 */
export function throwError(error, reason, detail) {
  Log.error(error +  ': '+ reason +': '+ detail);
  throw new Meteor.Error(JSON.stringify(error), JSON.stringify(reason), JSON.stringify(detail));
}
