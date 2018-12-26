# -*- coding: utf-8 -*-
# Copyright 2018 Kolushov Alexandr <https://it-projects.info/team/KolushovAlexandr>
# License LGPL-3.0 or later (http://www.gnu.org/licenses/lgpl.html).

from odoo import models, fields, api, _
import logging

_logger = logging.getLogger(__name__)


class PosConfig(models.Model):
    _inherit = 'pos.config'

    pos_event = fields.Many2one('event.event', string='Event', default=False)
    show_only_tickets = fields.Boolean(default=False)


class ResPartner(models.Model):
    """Partners"""
    _inherit = 'res.partner'
