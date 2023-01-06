
import { Mongo } from 'meteor/mongo';
//import { AccountsTemplates } from 'meteor/useraccounts:core';

// Settings du server
export const Settings = new Mongo.Collection('settings');
/*
// Doesn't seem to work ;(
    try {

       Log.error('----- init account templates');

        AccountsTemplates.configure({
          forbidClientAccountCreation:  false,
          enablePasswordChange: true,
          showForgotPasswordLink: false,
        });
      } catch (e) {
        Log.error(e);
      }
      
*/