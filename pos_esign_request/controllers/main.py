# -*- coding: utf-8 -*-
# Copyright 2018 Kolushov Alexandr <https://it-projects.info/team/KolushovAlexandr>
# License LGPL-3.0 or later (http://www.gnu.org/licenses/lgpl.html).

from odoo import fields, http, _
from odoo.http import request
import json


class PosESignExtension(http.Controller):

    @http.route('/pos_longpolling/sign_request', type="json", auth="user")
    def sign_request(self, partner_id, config_id):
        channel_name = "pos.sign_request.to_est"
        config_id = request.env['pos.config'].browse(config_id)
        if request.env['ir.config_parameter'].get_param('pos_longpolling.allow_public'):
            config_id = config_id.sudo()

        partner_id = request.env["res.partner"].browse(int(partner_id))

        # {
        # 'notification': {
        #     'type': 'error',
        #     'header': 'Event Signature Template Error',
        #     'text': 'Set Event Signature Template before sending requests',
        # }}

        data = {
            'partner_name': partner_id.name,
            'partner_id': partner_id.id,
        }

        config_id.send_to_esign_tab(channel_name, config_id.id, json.dumps(data))

    @http.route('/pos_longpolling/submit_sign', type="json", auth="user")
    def submit_kiosk_sign(self, partner_id, sign, config_id):
        ir_attachment = request.env['ir.attachment']
        partner_id = request.env["res.partner"].browse(int(partner_id))
        config_id = request.env["pos.config"].browse(config_id)

        attachment = ir_attachment.create({
            'type': 'binary',
            'name': partner_id.name + 'E-Sign',
            'datas': sign,
            'datas_fname': partner_id.name + 'E-Sign',
            'res_id': partner_id.id,
            'res_model': "res.partner",
        })

        partner_id.write({
            'sign_attachment_id': attachment.id,
        })

        res = {
            'partner_id': partner_id.id,
            'attachment_id': [partner_id.sign_attachment_id.id, partner_id.sign_attachment_id.name],
        }

        channel_name = "pos.sign_request"
        config_id._send_to_channel_by_id(config_id._cr.dbname, config_id.id, channel_name, json.dumps(res))

        return [attachment.id, attachment.name]
