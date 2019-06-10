// Copyright 2019 Kolushov Alexandr <https://it-projects.info/team/KolushovAlexandr>
// License LGPL-3.0 or later (https://www.gnu.org/licenses/lgpl.html).
odoo.define('pos_invoice_number.models', function (require) {
    "use strict";

    var models = require('point_of_sale.models');

    var _super_order = models.Order.prototype;
    models.Order = models.Order.extend({
        generate_unique_invoice_id: function() {
            // Generates a public identification number for the order invoice.
            // The generated number must be unique and sequential.
            return this.pos.config.invoice_prefix + '-' + this.generate_unique_id();
        },

        set_to_invoice: function(to_invoice) {
            _super_order.set_to_invoice.apply(this, arguments);
            this.invoice_name = this.generate_unique_invoice_id();
        },

        export_as_JSON: function() {
            var data = _super_order.export_as_JSON.apply(this, arguments);
            if (this.is_to_invoice()) {
                data.invoice_name = this.invoice_name;
            }
            return data;
        },
    });

    return models;
});
