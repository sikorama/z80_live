/*
    Publications

    Collections
    ------------------------------------------------------------------------
    SourceAsm       | sourceAsm,sourceInfos
    SourceBuilds    | sourceBuilds
    SourceGroups    | sourceGroups
    Settings        | serverSettings
    Meteor.Users    | userList

*/

import { Meteor } from 'meteor/meteor';
import { Settings } from '../imports/api/settings-server.js';
import { SourceAsm, SourceBuilds, SourceGroups, UserRatings } from '../imports/api/sourceAsm.js';
import { sendNotifRocket } from './notifications.js';
import { getUserGroups, isAdmin } from './user_management.js';
import { Log } from 'meteor/logging';


// All Publications Declarations
export function init_publications() {
  Meteor.methods({
    // Create a new source, with default values
    // Returns the new id, after insertion
    insertSource: function (doc) {
      //Log.error('insertSource', doc);
      if (this.userId) {
        // Rajoute les champs eventuellements manquants
        doc.date = Date.now();
        doc.user = this.userId;
        doc.owner = this.userId;
        // L'auteur par défaut est le propriétaire

        const u = Meteor.users.findOne(this.userId);
        if (u) {
          // uncomment for setting user's private groupe by default
          //if (!doc.group) doc.group = u.username; 
          if (!doc.author) doc.author = u.username;
        }

        // By default, public group
        if (!doc.group) doc.group = 'public';
        // Default name
        if (!doc.name) doc.name = 'program' + (SourceAsm.find().count() + 1);

        // ??
        if (doc.buildOptions)
          if (doc.buildOptions.buildmode == "lib")
            doc.buildOptions.filename = doc.name;

        //Log.error('insertion', doc.name);
        return SourceAsm.insert(doc);
      }
      return false;
    },

    // Deprecated as builds are automatically removed when a user session is over
    clearBuilds: function () {
      Log.error('Removing all builds');
      SourceBuilds.remove({});
    }
  });

  // --------- Publications Sources ---------------

  // Get access to a specific source document
  Meteor.publish('sourceAsm', function (id) {
    // If no user, access to public source only
    // Otherwise, use user's groups only
    let grp = ['public'];
    if (this.userId)
      grp = getUserGroups(this.userId);

    return SourceAsm.find({
      _id: id,
      group: {
        $in: grp
      }
    });
  });

  // Publication for retrieving source data, except code (for source table)
  Meteor.publish('sourceInfos', function (srcid) {
    let grp = ['public'];
    if (this.userId)
      grp = getUserGroups(this.userId);

    let sel = {
      group: {
        $in: grp
      }
    };

    if (srcid)
      sel._id = srcid;

    return SourceAsm.find(sel, { fields: { code: 0 } });
  });


  SourceAsm.allow({
    insert(userid, doc) {
      // Logger users can create new sources
      if (userid) return true;
    },
    update(userid, doc) {
      if (userid) {
        // Admins and owners are allower to change a source
        if (doc.owner === userid) return true;
        if (isAdmin(userid)) return true;
        // If no owner, we allow too
        if (!doc.owner) return true;
        return false;
      }
    },
    remove(userid, doc) {
      if (userid)
        if (doc.owner === userid) return true;
      if (isAdmin(userid)) return true;
      return false;
    }
  });

  SourceAsm.after.insert(function (userid, doc) {
    if (userid)
      sendNotifRocket('Création', 'Source', Meteor.users.findOne(userid).username, doc.name, 'edit/' + doc._id, ':pencil:');
  });
  SourceAsm.after.update(function (userid, doc) {
    if (userid)
      sendNotifRocket('Modification', 'Source', Meteor.users.findOne(userid).username, doc.name, 'edit/' + doc._id, ':pencil2:');
  });
  SourceAsm.before.remove(function (userid, doc) {
    if (userid)
      sendNotifRocket('Suppression', 'Source', Meteor.users.findOne(userid).username, doc.name, 'edit/' + doc._id, ':recycle:');
  });

  SourceAsm.before.insert(function (userid, doc) {
    doc.timestamp = Date.now();
  });

  SourceAsm.before.update(function (userid, doc, fieldNames, modifier, options) {    
    // If there is no owner, add a new one
    // This should not happend
    if (!doc.owner) {
      modifier.$set = modifier.$set || {};
      modifier.$set.owner = userid;
      if (modifier.$unset)
        modifier.$unset.owner = undefined;
    }
  });

  // DB des builds
  Meteor.publish('sourceBuilds', function () {
    //TODO: droits de groupee 
    //Droit de session si on est pas admin
    return SourceBuilds.find({});
  });

  // TODO: verifier les roles
  SourceBuilds.allow({
    insert(userid, doc) {
      if (userid) return false;
    },
    update(userid, doc) {
      if (userid) return false;
    },
    remove(userid, doc) {
      if (userid) return false;
    },
  });

  // ------------ Reglages serveur -----------------
  Meteor.publish('serverSettings', function () {
    if (isAdmin(this.userId)) {
      return Settings.find({});
    }
  });

  Settings.allow({
    insert(userid, doc) {
      return false;
    },
    update(userid, doc) {
      if (isAdmin(userid)) return true;
    },
    remove(userid, doc) {
      return false;
    },
  });

  // Publication des users pour l'admin
  Meteor.publish('userList', function () {
    if (isAdmin(this.userId)) {
      // Ne retourne que les champs nécessaires
      const options = {
        fields: {
          username: 1,
          emails: 1,
          //roles: 1,
          groups: 1,
        }
      };
      return Meteor.users.find({}, options);
    } else {
      this.ready();
    }
  });

  // Universal publication - All Users names
  Meteor.publish(null, function () {
    return Meteor.users.find({}, {
      fields: {
        username: 1,
      }
    });
  });


  // Universal publication - User Data
  Meteor.publish(null, function () {
    if (this.userId) {
      return Meteor.users.find({
        _id: this.userId
      }, {
        fields: {
          password: 0,
        }
      });
    } else {
      this.ready();
    }
  });





  SourceGroups.allow({
    insert(userid, doc) {
      Log.error("insert group", userid, isAdmin(userid));
      if (isAdmin(userid))
        return true;
    },
    update(userid, doc) {
      if (isAdmin(userid))
        return true;
    },
    remove(userid, doc) {
      if (isAdmin(userid))
        return true;
    }
  });

  // Il faut publier en filtrant avec les restrictions sur les groupes
  Meteor.publish('groupList', function () {
    if (isAdmin(this.userId)) {
      return SourceGroups.find();
    }
    else
      this.ready();
  });


  // Il faut publier en filtrant avec les restrictions sur les groupes
  Meteor.publish('userratings', function (srcid) {
    if (this.userId && srcid)
      return UserRatings.find({ srcid: srcid, user: this.userId });
    else
      this.ready();
  });

  Meteor.methods({
    'resetVotes': function () {
      if (isAdmin(this.userId)) {
        // Reset Ratings
        Log.error('Reset Ratings!');
        UserRatings.remove({});
        Log.error('num ratings:', UserRatings.find().count());
        SourceAsm.update({}, { $unset: { numvotes: 1, score: 1 } }, { multi: true });
      }
    }
  });

  // Votes
  Meteor.methods({
    "uservote": function (srcid, score) {
      // Check if there's already a note for this source, by this user
      const v = UserRatings.findOne({ user: this.userId, srcid: srcid });
      let ds = score;
      let dv = 1;
      if (v) {
        ds -= v.score;
        dv = 0;
      }
      // Udate User's vote
      UserRatings.upsert({ user: this.userId, srcid: srcid }, { $set: { score: score } });
      // Update source's score
      let s = SourceAsm.findOne(srcid);
      let new_rank = score;
      if (s.numvotes)
       new_rank = (s.score + ds) / (s.numvotes + dv);
      SourceAsm.update(srcid, { $inc: { score: ds, numvotes: dv }, $set: { rank: new_rank } });
    }
  });
}

Meteor.methods({
  'getSourceIdFromSlugName': function(slugname) {
    let s = SourceAsm.findOne({slugname:slugname});
    if (!s)
      s = SourceAsm.findOne({name:slugname});
    return s;
  }
  });
