import { Mongo } from 'meteor/mongo';
import { AccountsTemplates } from 'meteor/useraccounts:core';


// Settings du server
export const Settings = new Mongo.Collection('settings');

//
// Doesn't seem to work ;(
    try {
        AccountsTemplates.configure({
          forbidClientAccountCreation: false, //  true,
          enablePasswordChange: true,
          showForgotPasswordLink: false,
        });
      } catch (e) {
        console.error(e);
      }
      