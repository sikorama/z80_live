import SimpleSchema from 'simpl-schema';

import { Tracker } from 'meteor/tracker';

// Pour ajouter des options 'autoform' au schema
SimpleSchema.extendOptions(['autoform']);

SimpleSchema.setDefaultMessages({
  initialLanguage: 'en',
  messages: {
    en: {
      uploadError: '{{value}}', //File-upload
    },
  }
});

export let Schemas = {};

// Formulaire pourle mot de passe changé par l'utilisateur
Schemas.ForcePassword = new SimpleSchema({
  password: {
    type: String,
    label: 'New password',
    optional: false
  }
});

/* Settings */
Schemas.BuildSettings = new SimpleSchema({
  buildmode: {
    type: String,
    label: 'Target',
    optional: false,
    defaultValue: 'sna_cpc6128',
    allowedValues: ['sna', 'sna_cpc6128', 'sna_cpc464', "dsk", "sna_zx48", "sna_zx128", 'tap'] //,'lib'],
  },
  assembler: {
    type: String,
    label: 'Assembler',
    optional: false,
    defaultValue: 'sjasmplus', // default value depends on the arch
    allowedValues: ["sjasmplus", "rasm", "uz80"]
  },
  entryPoint: {
    type: String,
    label: 'Entry Point',
    defaultValue: '#9000',
    //regEx: new RegExp("#[A-Fa-f0-9]+"),
    optional: true
  },
  startPoint: {
    type: String,
    label: 'File Start',
    defaultValue: '#0',
    //regEx: new RegExp("#[A-Fa-f0-9]+"),
    optional: true
  },
  endPoint: {
    type: String,
    label: 'File End',
    defaultValue: '#FFFF',
    //regEx: new RegExp("#[A-Fa-f0-9]+"),
    optional: true
  },
  command: {
    type: String,
    label: 'Command',
    defaultValue: 'run"-run',
    optional: true
  },
  // Nom du fichier sauvegardé (si lib)
  filename: {
    type: String,
    label: 'Filename',
    //defaultValue: '',
    optional: false,
    regEx: new RegExp("[A-Za-z][A-Za-z0-9_]+")
  }
});

/* Utilisateur */
Schemas.Users = new SimpleSchema({
  username: {
    type: String,
    label: 'Name',
    optional: false
  },
  email: {
    type: String,
    label: 'Email',
    optional: false,
    regEx: SimpleSchema.RegEx.Email
  },
  password: {
    type: String,
    label: 'Password',
    optional: false
  },
  roles: {
    type: Array,
    label: 'Roles',
    optional: true,
    autoform: {
      options: "allowed",
      noselect: true
    }
  },
  'roles.$': {
    type: String,
    allowedValues: ["admin", "editor"],
  },
  groups: {
    label: 'Groups',
    type: Array,
    optional: true,
    defaultValue: 'public',
    autoform: {
      options: "allowed",
      noselect: true
    }
  },
  'groups.$': {
    type: String
  },

}, { tracker: Tracker });



// -------------- Schemas pour les formulaires en popup

// Schéma pour editer des groupes
// La liste disponible pour le nom est générée a partir des groupes de l'utilisateur
Schemas.Groups = new SimpleSchema({
  name: {
    type: String,
    label: 'Name',
  },
  desc: {
    type: String,
    label: 'Description',
  }
});


Schemas.SourceCode = new SimpleSchema({
  name: {
    type: String,
    label: 'Name',
    optional: false,
    regEx: new RegExp("[A-Za-z][A-Za-z0-9_]+")
  },
  author: {
    type: String,
    label: 'Author',
    optional: true
  },
  owner: {
    type: String,
    label: 'Owner',
    optional: true
  },
  code: {
    type: String,
    label: 'Code',
    optional: true
  },
  group: {
    type: String,
    label: 'Group',
    optional: false
  },
  desc: {
    type: String,
    label: 'Description',
    optional: true
  },
  cat: {
    type: String,
    label: 'Category',
    optional: true
  },
  buildOptions: {
    type: Schemas.BuildSettings,
    label: 'Build Options',
    optional: true
  },
  emulator: {
    type: String,
    label: 'Emulator',
    optional: false,
    defaultValue: 'Tiny8bit',
    allowedValues: ["Tiny8bit"] //,'lib'], 
  }
}, { tracker: Tracker });
