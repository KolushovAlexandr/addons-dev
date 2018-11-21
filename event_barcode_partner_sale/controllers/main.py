# -*- coding: utf-8 -*-
from odoo import fields, http, _
from odoo.http import request
from odoo.addons.event_barcode.controllers.main import EventBarcode
from odoo.addons.event_barcode_partner.controllers.main import EventBarcodeExtended


class EventBarcodeExtendedSale(EventBarcodeExtended):

    @http.route()
    def get_event_data(self, event_id):
        res = super(EventBarcodeExtendedSale, self).get_event_data(event_id)
        event_id = request.env['event.event'].browse(event_id)

        res['attendee_fields'] = []
        for f in event_id.attendee_field_ids:
            data = []
            if f.field_type == 'many2one':
                data = request.env[f.field_model].search([]).read(['id', 'name'])
            res['attendee_fields'].append({
                'name': f.field_name,
                'type': f.field_type,
                'description': f.field_description,
                'data': data,
            })
        return res

    @http.route('/event_barcode/create_attendee', type='json', auth="user")
    def create_attendee_from_barcode_interface(self, vals, event_id, partner_id, event_ticket_id, **kw):

        partner = request.env['res.partner']
        if partner_id:
            partner = partner.browse(partner_id)

        if not partner:
            partner = partner.create(vals)

        attendee = request.env['event.registration'].create({
            'event_id': event_id,
            'partner_id': partner.id,
            'attendee_partner_id': partner.id,
            'origin': 'Barcode Interfface',
            'event_ticket_id': event_ticket_id,
        })

        # import wdb
        # wdb.set_trace()
        return self.compound_vals(attendee, event_id)

    @http.route('/event_barcode/check_new_attendee_email', type='json', auth="user")
    def check_new_attendee_email(self, email, event_id, **kw):

        partner_id = request.env['res.partner'].search([('email', '=', email)])
        res = {}
        result = {}
        notification = {
            'type': 'success',
            'header': 'Email is available',
            'text': '',
        }

        if partner_id:
            field_ids = request.env['event.event'].browse(event_id).attendee_field_ids

            res['partner'] = partner_id.read(field_ids.mapped('field_name'))[0]
            res['partner']['id'] = partner_id.id
            notification['text'] = 'The Email is used by existing Partner'
            notification['type'] = 'warning'
            attendee = request.env['event.registration'].search([('attendee_partner_id', '=', partner_id.id),
                                                                 ('event_id', '=', event_id)])
            if attendee:
                res['existed_attendee'] = {
                    'aid': attendee.id,
                    'name': attendee.name,
                }
                notification['text'] = 'Ticket is already registered on this Email'
                result = self.compound_vals(attendee, event_id)

        result['new_attendee'] = res
        result['notification'] = notification
        return result
