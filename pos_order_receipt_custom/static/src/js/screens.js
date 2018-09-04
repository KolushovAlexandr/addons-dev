/* Copyright 2018 Dinar Gabbasov <https://it-projects.info/team/GabbasovDinar>
 * License LGPL-3.0 or later (https://www.gnu.org/licenses/lgpl.html). */

odoo.define('pos_order_receipt_custom.screens', function(require){

    var screens = require('pos_receipt_custom.screens');
    var gui = require('point_of_sale.gui');
    var PosBaseWidget = require('point_of_sale.BaseWidget');
    require('pos_restaurant.printbill');
    var core = require('web.core');

    var _t = core._t;
    var QWeb = core.qweb;


    PosBaseWidget.include({
        init:function(parent,options){
            var self = this;
            this._super(parent,options);
            if (this.gui && this.gui.screen_instances.products && this.gui.screen_instances.products.action_buttons.print_bill) {
                var printbill = this.gui.screen_instances.products.action_buttons.print_bill;
                printbill.button_click = function() {
                    self.printbill_button_click();
                };
                printbill.print_xml = function () {
                    self.printbill_print_xml();
                };
            }
        },
        printbill_button_click: function(){
            if (!this.pos.config.iface_print_via_proxy) {
                var order = this.pos.get('selectedOrder');
                order.set_receipt_type(_t('Pre-receipt'));
                this.gui.show_screen('bill');
            } else {
                this.printbill_print_xml();
            }
        },
        printbill_print_xml: function() {
            if (this.pos.config.custom_xml_receipt) {
                var order = this.pos.get_order();
                order.set_receipt_type(_t('Pre-receipt'));
                this.getParent().screens.receipt.print_xml();
            } else {
                var order = this.pos.get('selectedOrder');
                if(order.get_orderlines().length > 0){
                    var receipt = order.export_for_printing();
                    receipt.bill = true;
                    this.pos.proxy.print_receipt(QWeb.render('BillReceipt',{
                        receipt: receipt, widget: printbill, pos: this.pos, order: order,
                    }));
                }
            }
        },
    });

});
