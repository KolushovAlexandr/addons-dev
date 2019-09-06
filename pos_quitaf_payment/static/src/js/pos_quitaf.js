/* Copyright 2019 Kolushov Alexandr <https://it-projects.info/team/KolushovAlexandr>
   License LGPL-3.0 or later (http://www.gnu.org/licenses/lgpl.html). */
odoo.define('pos_quitaf_payment', function(require){
    var exports = {};

    var core = require('web.core');
    var models = require('point_of_sale.models');
    var gui = require('point_of_sale.gui');
    var PopupWidget = require('point_of_sale.popups');
    var screens = require('point_of_sale.screens');

    models.load_fields('account.journal', ['quitaf_payment_method']);

    var PosModelSuper = models.PosModel;
    models.PosModel = models.PosModel.extend({

    });

    screens.PaymentScreenWidget.include({
        click_paymentmethods: function(id) {
            var self = this;
            var cashregister = null;
            for ( var i = 0; i < this.pos.cashregisters.length; i++ ) {
                if ( this.pos.cashregisters[i].journal_id[0] === id ){
                    cashregister = this.pos.cashregisters[i];
                    break;
                }
            }
            this._super(id);
            if (cashregister.journal.quitaf_payment_method) {
                this.gui.show_popup('textinput', {
                    'title': _t('Password ?'),
                    confirm: function(data) {
                        self.quitaf_request(data);
                    }
                );
                //this.quitaf_request()
            }
        },

        quitaf_request: function() {
            console.log(data)
        },
    });

});
