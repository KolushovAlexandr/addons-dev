# Copyright 2019 Kolushov Alexandr <https://it-projects.info/team/KolushovAlexandr>
# License LGPL-3.0 or later (http://www.gnu.org/licenses/lgpl.html).

from odoo.http import request
import json
import requests
from odoo import http
from datetime import datetime, timedelta

from requests import Session
# from suds.xsd.doctor import Import, ImportDoctor
from zeep import Client
from zeep.transports import Transport


class PosESignExtension(http.Controller):

    @http.route('/quitaf/generate_otp', type="json", auth="user")
    def quitaf_generate_otp(self, vals):
        # return
        url = 'http://173.212.232.230:9799/' # server URL
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


        # import requests
        # headers = {'content-type': 'application/soap+xml'}

        # Quitaf URL
        # url = 'http://78.93.37.230:9799/RedemptionLiteIntegrationService?wsdl/'
        # url = 'http://78.93.37.230:9799/http://78.93.37.230:9799/RedemptionLiteIntegrationService?singleWsdl'
        url = 'http://173.212.232.230:9799/RedemptionLiteIntegrationService?wsdl/'  # server URL
        headers = {'content-type': 'text/xml'}
        body = """
        <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
        xmlns:tem="http://78.93.37.230:9799/IRedemptionLiteIntegrationService/GenerateOTP"
        xmlns:red="http://schemas.datacontract.org/2004/07/Redemption.Lite.Integration.Service.Interface">
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
        </soapenv:Envelope>
        """ % ('1', '0562009030', (datetime.utcnow() + timedelta(hours=3)).strftime("%Y-%m-%dT%H:%M:%S"), '001-0001-00011-0001212', '1', 'en-US')

        # body = """
        #     <tem:GenerateOTPRequest>
        #         <tem:request>
        #             <red:BranchId>%s</red:BranchId>
        #             <red:MSISDN>%s</red:MSISDN>
        #             <red:RequestDate>%s</red:RequestDate>
        #             <red:RequestId>%s</red:RequestId>
        #             <red:TerminalId>%s</red:TerminalId>
        #             <red:LanguageCode>%s</red:LanguageCode>
        #         </tem:request>
        #     </tem:GenerateOTPRequest>
        # """ % ('1', '0562009030', (datetime.utcnow() + timedelta(hours=3)).strftime("%Y-%m-%dT%H:%M:%S"), '001-0001-00011-0001212', '1', 'en-US')

        # import wdb
        # wdb.set_trace()
        print('\n REQUEST:', body)

        response = requests.get(url, data=body, headers=headers, verify=False)
        print('\n ============================')
        print(response)
        print(response.content)

        session = Session()
        session.verify = False
        # session.content-type = 'application/soap+xml'
        transport = Transport(session=session)
        client = Client(url, transport=transport)

        print('\n ============================')
        print(client)
        for i,v in client.items():
            print(i, v)

        # import wdb
        # wdb.set_trace()
    # req = requests.post(self.url, data=request_xml, headers={'Content-Type': 'application/xml'})
