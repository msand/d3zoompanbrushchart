// Package metadata for Meteor.js full stack web framework
// This file is defined in Meteor documentation at http://docs.meteor.com/#/full/packagejs
// and used by Meteor https://www.meteor.com/ and its package repository Atmosphere https://atmospherejs.com

Package.describe({
  name: 'msand:d3zoompanbrushchart',
  version: '1.0.0',
  summary: 'A minimal reusable chart with zoom, pan and brush for time series using d3.js',
  git: 'https://github.com/msand/d3zoompanbrushchart.git',
  documentation: 'README.md'
});

Package.onUse(function(api) {
  api.versionsFrom(["METEOR@1.0"]);
  api.use('d3js:d3@3.5.6', 'client');
  api.addFiles('d3zoompanbrushchart.js', "client");
  api.addFiles('styles.js', "client");
  api.export("d3zoompanbrushchart");
});