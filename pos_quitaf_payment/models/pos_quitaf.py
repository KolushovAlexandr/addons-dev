# Copyright 2019 Kolushov Alexandr <https://it-projects.info/team/KolushovAlexandr>
# License LGPL-3.0 or later (http://www.gnu.org/licenses/lgpl.html).

from odoo import models, fields


class PosOrder(models.Model):
    _inherit = 'account.journal'

    quitaf_payment_method = fields.Boolean(string='Quitaf')
