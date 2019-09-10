# Copyright 2019 Kolushov Alexandr <https://it-projects.info/team/KolushovAlexandr>
# License LGPL-3.0 or later (http://www.gnu.org/licenses/lgpl.html).

from odoo.http import request
import json
import requests
from odoo import http
from datetime import datetime, timedelta

from requests import Session
from suds.xsd.doctor import Import, ImportDoctor
from zeep import Client
from zeep.transports import Transport


class PosESignExtension(http.Controller):

    @http.route('/quitaf/generate_otp', type="json", auth="user")
    def quitaf_generate_otp(self, vals):
        # return
        url = 'http://173.212.232.230/'
        data = {
            'RequestId': '001-0001-00011-0001212',
            'MSISDN': '0562009030',
            'BranchId': 1,
            'TerminalID': 1,
            'RequestDate': (datetime.utcnow() + timedelta(hours=3)).strftime("%Y-%m-%dT%H:%M:%S"),
            'LanguageCode': 'en-US',
        }


        # creating  client action

        # imp = Import('http://www.w3.org/2001/XMLSchema',
        #              location='http://www.w3.org/2001/XMLSchema.xsd')
        # imp.filter.add('http://tempuri.org/')
        # session = Session()
        # transport = Transport(session=session)
        # client = Client(url, transport=transport)

        # import requests
        # headers = {'content-type': 'application/soap+xml'}
        headers = {'content-type': 'text/xml'}
        body = """
        <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
        xmlns:tem="http://tempuri.org/IRedemptionLiteIntegrationService/GenerateOTP"
        xmlns:red="http://schemas.datacontract.org/2004/07/Redemption.Lite.Integration.Service.Interf
        ace">
            <soapenv:Header/>
            <soapenv:Body>
                <tem:GenerateOTPRequest>
                    <tem:request>
                        <red:BranchId>%s</red:BranchId>
                        <red:MSISDN>%s</red:MSISDN>
                        <red:RequestDate>%s</red:RequestDate>
                        <red:RequestId>%s</red:RequestId>
                        <red:TerminalId>%s</red:TerminalId>
                        <red:LanguageCode>%s</red:LanguageCode>
                    </tem:request>
                </tem:GenerateOTPRequest>
            </soapenv:Body>
        </soapenv:Envelope>""" % ('1', '0562009030', (datetime.utcnow() + timedelta(hours=3)).strftime("%Y-%m-%dT%H:%M:%S"), '001-0001-00011-0001212', '1', 'en-US')

        import wdb
        wdb.set_trace()

        response = requests.post(url, data=body, headers=headers, verify=False)
        print(response.content)

        import wdb
        wdb.set_trace()
    # req = requests.post(self.url, data=request_xml, headers={'Content-Type': 'application/xml'})