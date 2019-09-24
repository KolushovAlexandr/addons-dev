/* Copyright 2019 Kolushov Alexandr <https://it-projects.info/team/KolushovAlexandr>
   License LGPL-3.0 or later (http://www.gnu.org/licenses/lgpl.html). */
odoo.define('pos_quitaf_payment', function(require){
    var exports = {};

    var core = require('web.core');
    var session = require('web.session');
    var gui = require('point_of_sale.gui');
    var models = require('point_of_sale.models');
    var screens = require('point_of_sale.screens');
    var PopupWidget = require('point_of_sale.popups');
    var _t = core._t;

    models.load_fields('account.journal', ['quitaf_payment_method']);

    var PosModelSuper = models.PosModel;
    models.PosModel = models.PosModel.extend({

    });

    screens.PaymentScreenWidget.include({

        add_paymentline: function(cashregister) {
        //    this.assert_editable();
        //    var newPaymentline = new exports.Paymentline({},{order: this, cashregister:cashregister, pos: this.pos});
        //    if(cashregister.journal.type !== 'cash' || this.pos.config.iface_precompute_cash){
        //        newPaymentline.set_amount( this.get_due() );
        //    }
        //    this.paymentlines.add(newPaymentline);
        //    this.select_paymentline(newPaymentline);
            this._super(cashregister);
            if (cashregister.journal.quitaf_payment_method) {
                this.update_payment_line_as_quitaf();
            }
        },

        update_payment_line_as_quitaf: function () {
            this.$el.find('.paymentline.selected').addClass('quitaf_class')
        },

        click_paymentmethods: function(id) {
            var self = this;
            var cashregister = null;
            for ( var i = 0; i < this.pos.cashregisters.length; i++ ) {
                if ( this.pos.cashregisters[i].journal_id[0] === id ){
                    cashregister = this.pos.cashregisters[i];
                    break;
                }
            }
//            var super_function = _.bind(this._super, this);
            this._super(id);
            this.update_payment_line_as_quitaf();
            if (cashregister.journal.quitaf_payment_method) {
                this.remove_keyboard_handler();
                return self.generate_otp({});
                //this.quitaf_request()
            }
        },

        generate_otp: function(data) {
            var self = this;
            this.remove_keyboard_handler();
            return this.gui.show_popup('textinput', {
                'title': _t('Phone Number ?'),
                confirm: function(data) {
                //    amount = _.chain(self.pos.get_order().get_paymentlines())
                //        .filter(function(pl){
                //            return pl.cashregister.journal.quitaf_payment_method;
                //        }).map().reduce(function(memo + num){
                //            return memo + num
                //        })
                    data = {
                        MSISDN: data,
                    }
                    self.add_keyboard_handler();
                    return self.quitaf_request_generate_otp(data);
                },
                cancel: function () {
                    self.add_keyboard_handler();
                },
            });
        },

        quitaf_request_generate_otp: function(data) {
            var self = this;
            return session.rpc('/quitaf/generate_otp', {vals: data}).then(function(result) {
                if (result.error) {
                    return self.gui.show_popup('alert', {
                        title: _t('Request Failed'),
                        body: result.response,
                    });
                }
                console.log(result);
                self.pos.get_order().quitaf_payment = {
                    payment_request: result.request_id,
                    MSISDN: data.MSISDN,
                }
            }, function(unused, e) {
                console.log(unused, e)
            });
        },

        check_quitaf_paymentlines: function() {
            return _.filter(this.pos.get_order().get_paymentlines(), function(pl){
                return pl.cashregister.journal.quitaf_payment_method;
            });
        },

        validate_order: function(force_validation) {
            var super_function = _.bind(this._super, this);
            var qf_pl = this.check_quitaf_paymentlines()
            if (qf_pl) {
                var amount = _.chain(qf_pl)
                .map(function(pl){
                    return pl.amount;
                })
                .reduce(function(memo, num){
                    return memo + num
                }).value();
                return this.redeem_points(amount).then(function(result) {
                    console.log(result);
                    super_function(force_validation);
                }, function(result) {
                    console.log(result);
                });
            }
            this._super(force_validation);
        },

        redeem_points: function (amount) {
            var  done = new $.Deferred();
            var self = this;
            this.remove_keyboard_handler();
            self.gui.show_popup('textinput', {
                'title': _t('PIN ?'),
                confirm: function(data) {
                    self.add_keyboard_handler();
                    done = self.quitaf_request_redeem_points({
                        'pin': data,
                        'amount': amount,
                        'request_id': self.pos.get_order().quitaf_payment.payment_request,
                    });
                },
                cancel: function () {
                    self.add_keyboard_handler();
                    done.reject()
                },
            });
            return done;
        },

        quitaf_request_redeem_points: function(data) {
            var self = this;
            return session.rpc('/quitaf/redeem_points', {vals: data}).then(function(result) {
                console.log(result);
            }, function(unused, e) {
                console.log(unused, e);
            });
        },

        add_keyboard_handler: function () {
            $('body').keypress(this.keyboard_handler);
            $('body').keydown(this.keyboard_keydown_handler);
        },

        remove_keyboard_handler: function () {
            $('body').off('keypress', this.keyboard_handler);
            $('body').off('keydown', this.keyboard_keydown_handler);
        },

    });

});
