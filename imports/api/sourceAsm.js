import { Mongo } from 'meteor/mongo';

// Source code and build settings, and average ratings
export const SourceAsm = new Mongo.Collection('sourceAsm');
// Build collection volatile - per session
export const SourceBuilds = new Mongo.Collection('sourceBuilds');
// Collection containing groups
export const SourceGroups = new Mongo.Collection('sourceGroups');
//Rating collection (user id/source id/rating)
export const UserRatings = new Mongo.Collection('userratings');



