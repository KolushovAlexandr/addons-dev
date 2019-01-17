/*  Copyright 2018 Kolushov Alexandr <https://it-projects.info/team/KolushovAlexandr>
    License LGPL-3.0 or later (http://www.gnu.org/licenses/lgpl.html). */
odoo.define('pos_event_registration.pos_event', function (require) {
"use strict";

//var bus = require('bus.bus');
//var local_storage = require('web.local_storage');

var Session = require('web.session');
var screens = require('point_of_sale.screens');
var models = require('point_of_sale.models');
var devices = require('point_of_sale.devices');
var gui = require('point_of_sale.gui');
var core = require('web.core');
var PosDB = require('point_of_sale.DB');
var Model = require('web.DataModel');

var QWeb = core.qweb;
var _t = core._t;


models.load_fields('event.event',['mandatory_esign', 'terms_to_sign']);
models.load_fields('event.registration',['signed_terms', 'completed_document']);


var PosModelSuper = models.PosModel;
models.PosModel = models.PosModel.extend({

});

screens.PaymentScreenWidget.include({

});


var AttendeeListScreenWidget = screens.ScreenWidget.extend({

});

});
