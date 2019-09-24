# Copyright 2019 Kolushov Alexandr <https://it-projects.info/team/KolushovAlexandr>
# License LGPL-3.0 or later (http://www.gnu.org/licenses/lgpl.html).

from odoo import http
from datetime import datetime, timedelta
from zeep import Client
import uuid
from odoo.http import request
from zeep.transports import Transport

# Key	pos_quitaf_payment.language_code	Value	en-US
# Key	pos_quitaf_payment.terminal	        Value	11010000
# Key	pos_quitaf_payment.branch	        Value	11010000
# Key	pos_quitaf_payment.wsdl	            Value	http://78.93.37.230:9799/RedemptionLiteIntegrationService?wsdl


class Quitaf(http.Controller):

    @http.route('/quitaf/redeem_points', type="json", auth="user")
    def quitaf_redeem_points(self, vals):
        # TODO: update vals from POS
        # import wdb
        # wdb.set_trace()
        pin = 'pin' in vals and vals['pin'] or ''
        if not pin:
            return {
                'error': 'PIN was not set',
            }
        request_id = 'request_id' in vals and int(vals['request_id']) or ''
        if not request_id:
            return {
                'error': 'RequestId Error. Please repeat generateOTP request',
            }

        amount = 'amount' in vals and vals['amount'] or 0
        request_id = request.env['quitaf.pay'].browse(request_id)

        request_id.write({
            'pin': pin,
            'amount': amount,
            'redemption_uuid': uuid.uuid1().hex,
            'redemption_date_time': (datetime.utcnow() + timedelta(hours=3)).strftime("%Y-%m-%dT%H:%M:%S"),
        })

        # wsdl = 'http://78.93.37.230:9799/RedemptionLiteIntegrationService?wsdl'
        transport = Transport(timeout=60, operation_timeout=60)
        client = Client(self.get_quitaf_request_wsdl(), transport=transport)

        response = client.service.RedeemQitafPoints(
            request_id.generate_redeem_points_request_data()
        )

        if not response or response and response['ResponseCode'] == 1:
            return self.reverse_quitaf_point_redemption(request_id)

        return self.send_back_response(request_id, response)

    @http.route('/quitaf/redeem_points', type="json", auth="user")
    def reverse_quitaf_point_redemption(self, request_id):
        # import wdb
        # wdb.set_trace()

        client = Client(self.get_quitaf_request_wsdl())

        response = client.service.ReverseQitafPointRedemption(
            request_id.generate_reverse_points_redemption_request_data()
        )

        return self.send_back_response(request_id, response)

    @http.route('/quitaf/generate_otp', type="json", auth="user")
    def quitaf_generate_otp(self, vals):
        MSISDN = 'MSISDN' in vals and vals['MSISDN']
        if not MSISDN:
            return {
                'error': 'RequestId Error. Please repeat generateOTP request',
            }

        date_time = (datetime.utcnow() + timedelta(hours=3)).strftime("%Y-%m-%dT%H:%M:%S")
        quitaf = self.get_quitaf_request_mandatory_data()
        quitaf_request = request.env['quitaf.pay'].create({
            'MSISDN': MSISDN,
            'request_date': date_time,
            'branch_ID': quitaf['branch'],
            'otp_request_id': uuid.uuid1(),
            'terminal_ID': quitaf['terminal'],
            'language_code': quitaf['language_code'],
        })

        client = Client(quitaf['wsdl'])

        response = client.service.GenerateOTP(
            quitaf_request.generate_otp_request_data()
        )
        return self.send_back_response(quitaf_request, response)

    def send_back_response(self, quitaf_request, response):
        if response and response['ResponseCode'] == 0:
            quitaf_request.write({
                'otp_status': 'success',
            })
            return {
                'response': response,
                'request_id': quitaf_request.id,
            }
        else:
            quitaf_request.write({
                'otp_status': 'fail',
            })
            if response:
                return {
                    'response': response,
                    'error': response['ResponseText'],
                }
            else:
                return {
                    'error': response['ResponseText'],
                }

    def get_quitaf_request_wsdl(self):
        return request.env['ir.config_parameter'].sudo().get_param('pos_quitaf_payment.wsdl'),

    def get_quitaf_request_mandatory_data(self):
        config_parameter = request.env['ir.config_parameter'].sudo()
        return {
            'wsdl': config_parameter.get_param('pos_quitaf_payment.wsdl'),
            'branch_ID': config_parameter.get_param('pos_quitaf_payment.branch'),
            'terminal_ID': config_parameter.get_param('pos_quitaf_payment.terminal'),
            'language_code': config_parameter.get_param('pos_quitaf_payment.language_code'),
        }
