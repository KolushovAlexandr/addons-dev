# Copyright 2019 Kolushov Alexandr <https://it-projects.info/team/KolushovAlexandr>
# License LGPL-3.0 or later (http://www.gnu.org/licenses/lgpl.html).

from odoo import models, fields
from datetime import datetime, timedelta
import uuid


class PosOrder(models.Model):
    _inherit = 'account.journal'

    quitaf_payment_method = fields.Boolean(string='Quitaf')


class QuitafPayment(models.Model):
    _name = 'quitaf.pay'

    MSISDN = fields.Char('MSISDN')
    language_code = fields.Char('language_code')
    request_date = fields.Char('RequestDate')
    branch_ID = fields.Char('branch_ID')
    terminal_ID = fields.Char('terminal_ID')
    otp_status = fields.Selection([
        ('success', 'Success'),
        ('fail', 'Failed'),
    ])

    pin = fields.Char('pin')
    amount = fields.Char('amount')
    redemption_date_time = fields.Char('Datetime of the Point Redemption request')
    redemption_uuid = fields.Char('RequestId of the Point Redemption request')

    def generate_otp_request_data(self):
        RequestId = uuid.uuid1().hex
        RequestDate = (datetime.utcnow() + timedelta(hours=3)).strftime("%Y-%m-%dT%H:%M:%S")
        return {
            'RequestDate': RequestDate,
            'LanguageCode': self.language_code,
            'MSISDN': self.MSISDN,
            'RequestId': RequestId,
            'BranchId': self.branch_ID,
            'TerminalId': self.terminal_ID,
        }

    def generate_redeem_points_request_data(self):
        return {
            'PIN': self.pin,
            'Amount': self.amount,

            'RequestDate': self.redemption_date_time,
            'MSISDN': self.MSISDN,
            'RequestId': self.redemption_uuid,
            'BranchId': self.branch_ID,
            'TerminalId': self.terminal_ID,
        }

    def generate_reverse_points_redemption_request_data(self):
        RequestId = uuid.uuid1().hex
        RequestDate = (datetime.utcnow() + timedelta(hours=3)).strftime("%Y-%m-%dT%H:%M:%S")
        return {
            'RefRequestId': self.redemption_uuid,
            'RefRequestDate': self.redemption_date_time,
            'RequestDate': RequestDate,
            'RequestId': RequestId,
            'MSISDN': self.MSISDN,
            'BranchId': self.branch_ID,
            'TerminalId': self.terminal_ID,
        }
