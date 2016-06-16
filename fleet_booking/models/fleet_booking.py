# -*- coding: utf-8 -*-

from openerp import api, fields, models


# INHERITED MODELS

class Branch(models.Model):

    _name = "fleet_booking.branch"
    _inherit = 'hr.department'

    city = fields.Char(string='City')
    phone = fields.Char(string='Phone')
    branch_target = fields.Char(string='Branch Target')
    users_ids = fields.One2many('res.users', 'branch_id')


class Person(models.Model):

    _inherit = 'res.partner'

    id_type = fields.Selection(
        [(u'National Id', u'National Id'), (u'Iqama', u'Iqama'),
         (u'Passport', u'Passport')],
        string='ID Type',
        )
    issuer = fields.Char(string='Issuer string')
    issuer_date = fields.Date(string='Date of Issue')
    license_type = fields.Selection([(u'Private', u'Private'),
                                     (u'General', u'General'),
                                     (u'International', u'International')],
                                    string='License Type')
    license_number = fields.Char(string='License Number')
    license_expiry_date = fields.Date(string='License Expiry Date')
    third_name = fields.Char(string='Third Name')
    family_name = fields.Char(string='Family Name')

    def check_age(self, cr, uid, ids, context=None, parent=None):
        for r in self.browse(cr, uid, ids, context=context):
            if r.customer and r.birthdate_date and r.age < 21:
                return False
        return True

    _constraints = [
        (check_age, 'Age restriction. Person must be elder than 20.', ['birthdate_date']),
    ]


class Fleet(models.Model):

    _inherit = 'fleet.vehicle'

    branch_id = fields.Many2one('fleet_booking.branch', string='Current branch')
    model_year = fields.Integer('Model Year')
    daily_rate = fields.Float('Daily Rate')
    extra_rate = fields.Float('Rate per extra km')
    allowed_per_day = fields.Float('Allowed km per day')
    paid = fields.Float('Paid amount')
    remain = fields.Float('Remaining amount')
    reg_expiry = fields.Date('Registration expiry')
    ins_expiry = fields.Date('Insurance expiry')
    next_maintain = fields.Date('Next maintenance')
    payments_ids = fields.One2many('account.invoice', 'fleet_vehicle_id', string='Payments')
    total_documents = fields.Integer(compute='_count_total_documents', string="Total documents", default=0)
    insurance_ids = fields.One2many('fleet_booking.insurances', 'fleet_vehicle_id', string='Insurance Installments')
    deprecation_ids = fields.One2many(related='asset_id.depreciation_line_ids')
    asset_id = fields.Many2one('account.asset.asset', compute='compute_asset', inverse='asset_inverse', string='Asset')
    asset_ids = fields.One2many('account.asset.asset', 'vehicle_id')
    # TODO Rename deprecation to depreciation

    @api.one
    @api.depends('asset_ids')
    def compute_asset(self):
        if len(self.asset_ids) > 0:
            self.asset_id = self.asset_ids[0]

    @api.one
    def asset_inverse(self):
        new_asset = self.env['account.asset.asset'].browse(self.asset_id.id)
        if len(self.asset_ids) > 0:
            asset = self.env['account.asset.asset'].browse(self.asset_ids[0].id)
            asset.vehicle_id = False
        new_asset.vehicle_id = self

    @api.multi
    def _count_total_documents(self):
        for rec in self:
            docs_ids = self.env['fleet_rental.document'].search([('vehicle_id.id', '=', rec.id)])
            rec.total_documents = len(docs_ids)


class Service(models.Model):
    _inherit = 'fleet.vehicle.log.services'

    state = fields.Selection([('draft', 'Draft'),
                              ('request', 'Request'),
                              ('done', 'Done'),
                              ('paid', 'Paid')],
                             string='State', default='draft')
    account_invoice_ids = fields.One2many('account.invoice', 'fleet_vehicle_log_services_ids', string='Invoices', copy=False)
    cost_subtype_in_branch = fields.Boolean(related='cost_subtype_id.in_branch')
    attachment_ids = fields.One2many('ir.attachment', 'res_id',
                                domain=[('res_model', '=', 'fleet.vehicle.log.services')],
                                string='Attachments')
    attachment_number = fields.Integer(compute='_get_attachment_number', string="Number of Attachments")

    @api.multi
    def submit(self):
        in_shop_vehicle_state = self.env['fleet.vehicle.state'].browse(1)
        vehicle = self.env['fleet.vehicle'].browse(self.vehicle_id.id)
        vehicle.state_id = in_shop_vehicle_state
        self.write({'state': 'request'})

    @api.multi
    def un_submit(self):
        active_vehicle_state = self.env['fleet.vehicle.state'].browse(2)
        vehicle = self.env['fleet.vehicle'].browse(self.vehicle_id.id)
        vehicle.state_id = active_vehicle_state
        self.write({'state': 'draft'})

    @api.multi
    def confirm(self):
        active_vehicle_state = self.env['fleet.vehicle.state'].browse(2)
        vehicle = self.env['fleet.vehicle'].browse(self.vehicle_id.id)
        vehicle.state_id = active_vehicle_state
        self.write({'state': 'done'})

    @api.multi
    def approve(self):
        self.write({'state': 'paid'})

    @api.multi
    def action_get_attachment_tree_view(self):
        action = self.env.ref('base.action_attachment').read()[0]
        action['context'] = {
            'default_res_model': self._name,
            'default_res_id': self.ids[0]
        }
        action['domain'] = ['&', ('res_model', '=', 'fleet.vehicle.log.services'), ('res_id', 'in', self.ids)]
        return action

    @api.multi
    def _get_attachment_number(self):
        read_group_res = self.env['ir.attachment'].read_group(
            [('res_model', '=', 'fleet.vehicle.log.services'), ('res_id', 'in', self.ids)],
            ['res_id'], ['res_id'])
        attach_data = dict((res['res_id'], res['res_id_count']) for res in read_group_res)
        for record in self:
            record.attachment_number = attach_data.get(record.id, 0)


class ServiceType(models.Model):
    _inherit = 'fleet.service.type'

    in_branch = fields.Boolean(default=False, readonly=True, invisible=True)


class AccountInvoice(models.Model):
    _inherit = 'account.invoice'

    fleet_vehicle_log_services_ids = fields.Many2one('fleet.vehicle.log.services')
    fleet_vehicle_id = fields.Many2one('fleet.vehicle')


class Asset(models.Model):
    _inherit = 'account.asset.asset'

    vehicle_id = fields.Many2one('fleet.vehicle', string='Vehicle')


class User(models.Model):
    _inherit = 'res.users'

    branch_id = fields.Many2one('fleet_booking.branch')

# OWN MODELS


class InsuranceInstallments(models.Model):
    _name = 'fleet_booking.insurances'
    _order = 'fleet_vehicle_id, sequence, id'

    fleet_vehicle_id = fields.Many2one('fleet.vehicle')
    sequence = fields.Integer(default=1,
                              help="Gives the sequence of this line when displaying the vehicle.")
    insurance_date = fields.Datetime(string='Date', default=fields.Datetime.now())
    amount = fields.Float(string='Amount')


class VehicleTransfer(models.Model):
    _name = 'fleet_booking.transfer'

    state = fields.Selection([('draft', 'Draft'),
                              ('transfer', 'Transfer'),
                              ('done', 'Done')],
                             string='State', default='draft')
    vehicle_id = fields.Many2one('fleet.vehicle', string='Vehicle')
    old_branch = fields.Many2one('fleet_booking.branch')
    source_branch = fields.Many2one('fleet_booking.branch', string='From', required=True)
    dest_branch = fields.Many2one('fleet_booking.branch', string='To', required=True)
    current_odometer = fields.Float(related='vehicle_id.odometer', string='Current odometer')
    delivery_state = fields.Selection([('not_delivered', 'Not delivered'), ('delivered', 'Delivered')], string='Delivery state', default='not_delivered')
    receiving_state = fields.Selection([('not_received', 'Not received'), ('received', 'Received')], string='Receiving state', default='not_received')
    user_branch_id = fields.Many2one('res.users', 'Creator', default=lambda self: self.env.user.branch_id.id)
    cant_change_delivery_state = fields.Boolean(compute='get_cant_change_delivery_state', default=True)
    cant_change_receiving_state = fields.Boolean(compute='get_cant_change_receiving_state', default=True)

    @api.multi
    def submit(self):
        in_transfer_vehicle_state = self.env['fleet.vehicle.state'].browse(5)
        vehicle = self.env['fleet.vehicle'].browse(self.vehicle_id.id)
        vehicle.state_id = in_transfer_vehicle_state
        self.old_branch = vehicle.branch_id
        vehicle.branch_id = False
        self.write({'state': 'transfer'})

    @api.multi
    def un_submit(self):
        active_vehicle_state = self.env['fleet.vehicle.state'].browse(2)
        vehicle = self.env['fleet.vehicle'].browse(self.vehicle_id.id)
        vehicle.state_id = active_vehicle_state
        vehicle.branch_id = self.old_branch
        self.write({'state': 'draft'})

    @api.multi
    def confirm(self):
        active_vehicle_state = self.env['fleet.vehicle.state'].browse(2)
        vehicle = self.env['fleet.vehicle'].browse(self.vehicle_id.id)
        vehicle.state_id = active_vehicle_state
        vehicle.branch_id = self.dest_branch
        self.write({'state': 'done'})

    @api.multi
    def un_confirm(self):
        in_transfer_vehicle_state = self.env['fleet.vehicle.state'].browse(5)
        vehicle = self.env['fleet.vehicle'].browse(self.vehicle_id.id)
        vehicle.state_id = in_transfer_vehicle_state
        vehicle.branch_id = False
        self.write({'state': 'done'})

    @api.onchange('current_odometer')
    @api.multi
    def on_change_current_odometer(self):
        for rec in self:
            vehicle = self.env['fleet.vehicle'].browse(rec.vehicle_id.id)
            if vehicle.id:
                vehicle.odometer = rec.current_odometer

    @api.onchange('vehicle_id')
    @api.multi
    def on_change_vehicle_id(self):
        for rec in self:
            rec.source_branch = rec.vehicle_id.branch_id

    @api.multi
    def get_cant_change_delivery_state(self):
        for record in self:
            if (self.env.user.branch_id.id == self.source_branch.id) and (self.env.ref('fleet_booking.group_branch_officer') in self.env.user.groups_id):
                record.cant_change_delivery_state = False
                print '# : record.cant_change_delivery_state',  record.cant_change_delivery_state

    @api.multi
    def get_cant_change_receiving_state(self):
        for record in self:
            if (self.env.user.branch_id.id == self.dest_branch.id) and (self.env.ref('fleet_booking.group_branch_officer') in self.env.user.groups_id):
                record.cant_change_receiving_state = False


def dump(obj):
  for attr in dir(obj):
    print "obj.%s = %s" % (attr, getattr(obj, attr))


def dumpclean(obj):
    if type(obj) == dict:
        for k, v in obj.items():
            if hasattr(v, '__iter__'):
                print k
                dumpclean(v)
            else:
                print '%s : %s' % (k, v)
    elif type(obj) == list:
        for v in obj:
            if hasattr(v, '__iter__'):
                dumpclean(v)
            else:
                print v
    else:
        print obj