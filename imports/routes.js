// Routes définies au niveau du client avec FlowRouter.
import {
  Session
} from 'meteor/session';

FlowRouter.notFound = {
  action: function () {
    FlowRouter.go("/browse");
  }
};


FlowRouter.route('/', {
  action: function () {
    FlowRouter.go("/browse");
  }
});

FlowRouter.route('/clear', {
  action: function () {
    BlazeLayout.render('Page', {
      main: 'ClearSource'
    });
  }
});


FlowRouter.route('/browse', {
  action: function (params, queryParams) {
    BlazeLayout.render('Page', {
      main: 'TablesPage'
    });
    if (queryParams.search)
      Session.set('sourceSearchString', queryParams.search);
  }
});

// Version mobilé forcée
FlowRouter.route('/mobile', {
  action: function (params, queryParams) {
    Session.set('isMobile', true);
    FlowRouter.go("/");
  }
});


// Profil utilisateur
FlowRouter.route('/profile', {
  action: function (params, queryParams) {
    BlazeLayout.render('Page', {
      main: 'MyProfile'
    });
  }
});

FlowRouter.route('/doc', {
  action: function (params, queryParams) {
    BlazeLayout.render('Page', {
      main: 'Documentation'
    });
  }
});



// --------------- Routes dédiées à un source -------------------
FlowRouter.route('/edit/:sourceId', {
  action: function (params, queryParams) {
    BlazeLayout.render('Page', {
      main: 'SourceEdit'
    });
  }
});


FlowRouter.route('/edit', {
  action: function (params, queryParams) {
    BlazeLayout.render('Page', {
      main: 'SourceEdit'
    });
  }
});

// Entry oint using slug name, redirect to edit page
FlowRouter.route('/view/:slugname', {
  action: function (params, queryParams) {
    if (params.slugname) {
      Meteor.call('getSourceIdFromSlugName', params.slugname, (err, res) => {
        if (res) {
          FlowRouter.go('/edit/' + res + '?view=true');
        }
        else {
          FlowRouter.go('/');
        }
      });
    }
    else
      FlowRouter.go('/');

  }
});


// ---------------------- Admin ------------------------
FlowRouter.route('/admin/', {
  action: function (params, queryParams) {
    FlowRouter.go("/Admin/session");
  }
});



FlowRouter.route('/admin/session', {
  action: function (params, queryParams) {
    BlazeLayout.render('Page', {
      main: 'AdminPage',
      sub: 'AdminSession'
    });
  }
});

FlowRouter.route('/admin/settings', {
  action: function (params, queryParams) {
    BlazeLayout.render('Page', {
      main: 'AdminPage',
      sub: 'AdminSettings'
    });
  }
});

FlowRouter.route('/admin/users', {
  action: function (params, queryParams) {
    BlazeLayout.render('Page', {
      main: 'AdminPage',
      sub: 'AdminUsers'
    });
  }
});

FlowRouter.route('/admin/sources', {
  action: function (params, queryParams) {
    BlazeLayout.render('Page', {
      main: 'AdminPage',
      sub: 'AdminSources'
    });
  }
});

FlowRouter.route('/admin/groups', {
  action: function (params, queryParams) {
    BlazeLayout.render('Page', {
      main: 'AdminPage',
      sub: 'AdminGroups'
    });
  }
});


FlowRouter.route('/admin/builds', {
  action: function (params, queryParams) {
    BlazeLayout.render('Page', {
      main: 'AdminPage',
      sub: 'AdminBuilds'
    });
  }
});
