# Copyright 2019 Kolushov Alexandr <https://it-projects.info/team/KolushovAlexandr>
# License LGPL-3.0 or later (http://www.gnu.org/licenses/lgpl.html).

from odoo import http
from datetime import datetime, timedelta
from zeep import Client


class Quitaf(http.Controller):

    @http.route('/quitaf/redeem_points', type="json", auth="user")
    def quitaf_generate_otp(self, vals):
        # TODO: update vals from POS
        pin = 'pin' in vals and vals['pin'] or ''
        if not pin:
            return False
        amount = 'amount' in vals and vals['amount'] or 0
        MSISDN = 'MSISDN' in vals and vals['MSISDN'] or '0554925622'
        data = {
            'PIN': vals['pin'],
            'Amount': amount,
            'RequestDate': (datetime.utcnow() + timedelta(hours=3)).strftime("%Y-%m-%dT%H:%M:%S"),
            'MSISDN': MSISDN,
            'RequestId': '45fa644e-28a6-4d3f-86f5-7224fe4c69d1',
            'BranchId': 11010000,
            'TerminalId': 11010000,
        }

        wsdl = 'http://78.93.37.230:9799/RedemptionLiteIntegrationService?wsdl'
        client = Client(wsdl)

        response = client.service.RedeemQitafPoints(data)

        import wdb
        wdb.set_trace()

        message = {}
        if not response:
            message['error'] = 'There is no response'
            return message
        else:
            message['error'] = response['ResponseCode'] > 0 and response['ResponseText']
            message['response'] = response
            return message

    @http.route('/quitaf/generate_otp', type="json", auth="user")
    def quitaf_generate_otp(self, vals):
        # TODO: update vals from POS
        MSISDN = 'MSISDN' in vals and vals['MSISDN'] or '0554925622'

        data = {
            'RequestDate': (datetime.utcnow() + timedelta(hours=3)).strftime("%Y-%m-%dT%H:%M:%S"),
            'LanguageCode': 'en-US',
            'MSISDN': MSISDN,
            'RequestId': '45fa644e-28a6-4d3f-86f5-7224fe4c69d1',
            'BranchId': 11010000,
            'TerminalId': 11010000,
        }
        wsdl = 'http://78.93.37.230:9799/RedemptionLiteIntegrationService?wsdl'
        client = Client(wsdl)

        response = client.service.GenerateOTP(data)

        import wdb
        wdb.set_trace()

        message = {}
        if not response:
            message['error'] = 'There is no response'
            return message
        else:
            message['error'] = response['ResponseCode'] > 0 and response['ResponseText']
            message['response'] = response
            return message

        # from odoo.http import request
        # import json
        # import requests
        #
        # from requests import Session
        # # from suds.xsd.doctor import Import, ImportDoctor
        # from zeep.transports import Transport

        # creating  client action
        # imp = Import('http://www.w3.org/2001/XMLSchema',
        #              location='http://www.w3.org/2001/XMLSchema.xsd')
        # imp.filter.add('http://tempuri.org/')

        # import requests
        # headers = {'content-type': 'application/soap+xml'}

        # headers = {'content-type': 'text/xml'}
        # body = """
        # <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
        # xmlns:tem="http://78.93.37.230:9799/IRedemptionLiteIntegrationService/GenerateOTP"
        # xmlns:red="http://schemas.datacontract.org/2004/07/Redemption.Lite.Integration.Service.Interface">
        #     <soapenv:Header/>
        #     <soapenv:Body>
        #         <tem:GenerateOTPRequest>
        #             <tem:request>
        #                 <red:BranchId>%s</red:BranchId>
        #                 <red:MSISDN>%s</red:MSISDN>
        #                 <red:RequestDate>%s</red:RequestDate>
        #                 <red:RequestId>%s</red:RequestId>
        #                 <red:TerminalId>%s</red:TerminalId>
        #                 <red:LanguageCode>%s</red:LanguageCode>
        #             </tem:request>
        #         </tem:GenerateOTPRequest>
        #     </soapenv:Body>
        # </soapenv:Envelope>
        # """ % ('1', '0562009030', (datetime.utcnow() + timedelta(hours=3)).strftime("%Y-%m-%dT%H:%M:%S"), '001-0001-00011-0001212', '1', 'en-US')
        #
        # response = requests.get(url, data=body, headers=headers, verify=False)
        #
        # session = Session()
        # session.verify = False
        # # session.content-type = 'application/soap+xml'
        # transport = Transport(session=session)
        # client = Client(url, transport=transport)

        # body = """
        #     <red:BranchId>%s</red:BranchId>
        #     <red:MSISDN>%s</red:MSISDN>
        #     <red:RequestDate>%s</red:RequestDate>
        #     <red:RequestId>%s</red:RequestId>
        #     <red:TerminalId>%s</red:TerminalId>
        #     <red:LanguageCode>%s</red:LanguageCode>
        # """ % ('1', '0562009030', (datetime.utcnow() + timedelta(hours=3)).strftime("%Y-%m-%dT%H:%M:%S"), '001-0001-00011-0001212', '1', 'en-US')
