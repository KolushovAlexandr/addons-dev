from odoo import models, fields, api


class PosOrder(models.Model):
    _inherit = 'pos.order'

    coupon_ids = fields.One2many('sale.coupon', 'pos_order_id', string="Coupons")


class PosOrderLine(models.Model):
    _inherit = 'pos.order.line'

    @api.model
    def create(self, vals):
        res = super(PosOrderLine, self).create(vals)
        if vals.get('coupon_id'):
            coupon = self.env['sale.coupon'].browse(vals.get('coupon_id'))
            if vals.get('coupon_state') == 'sold':
                if vals.get('coupon_value'):
                    self.process_new_program(coupon, vals.get('coupon_value'))
                # coupon sold
                coupon.write({
                    'state': 'reserved',
                    'partner_id': res.order_id.partner_id.id if res.order_id.partner_id else False,
                    'sold_via_order_id': res.order_id.id
                })
            elif vals.get('coupon_state') == 'consumed':
                # coupon consumed
                coupon.write({
                    'state': 'used',
                    'pos_order_id': res.order_id.id
                })
        return res

    @api.model
    def process_new_program(self, coupon, value):
        base_prog = coupon.program_id
        current_prog = base_prog.search([('parented_storage_program', '=',  base_prog.id),
                                                 ('discount_fixed_amount', '=', float(value))], limit=1)
        if not current_prog:
            current_prog = base_prog.copy({
                'name': base_prog.name + ': ' + value,
                'is_code_storage_program': False,
                'parented_storage_program': base_prog.id,
                'discount_fixed_amount': float(value)
            })
        print('\n we`re in process_new_program \n ', current_prog)
        current_prog.action_updated_coupon_program()
        coupon.write({
            'program_id': current_prog.id,
        })
