from odoo import models, fields, api
import logging

_logger = logging.getLogger(__name__)


class DashboardMenu(models.Model):
    _name = "dashboard.menu"
    _description = "Dashboard Menu"
    _order = "sequence, id"

    name = fields.Char(
        required=True,
        help="Dashboard menu name"
    )

    menu_id = fields.Many2one(
        'ir.ui.menu',
        string="Parent Menu",
        ondelete='cascade'
    )

    group_ids = fields.Many2many(
        'res.groups',
        string='Visible for Groups',
        help="Only users in these groups can see the menu"
    )

    client_action_id = fields.Many2one(
        'ir.actions.client',
        readonly=True,
        copy=False,
        ondelete='cascade'
    )

    menu_ref = fields.Many2one(
        'ir.ui.menu',
        readonly=True,
        copy=False,
        ondelete='cascade'
    )

    sequence = fields.Integer(default=10)

    _sql_constraints = [
        ('name_unique', 'unique(name)', 'Dashboard menu name must be unique.')
    ]

    @api.model_create_multi
    def create(self, vals_list):
        records = []
        for vals in vals_list:
            action = self.env['ir.actions.client'].create({
                'name': vals['name'],
                'tag': 'OdooDashboard',
            })

            menu = self.env['ir.ui.menu'].create({
                'name': vals['name'],
                'parent_id': vals.get('menu_id'),
                'action': f'ir.actions.client,{action.id}',
                'sequence': vals.get('sequence', 10),
                'groups_id': [(6, 0, vals.get('group_ids', []))],
            })

            vals.update({
                'client_action_id': action.id,
                'menu_ref': menu.id,
            })

            records.append(vals)

        return super().create(records)

    def write(self, vals):
        res = super().write(vals)
        for rec in self:
            if rec.menu_ref:
                rec.menu_ref.write({
                    'name': rec.name,
                    'parent_id': rec.menu_id.id if rec.menu_id else False,
                    'sequence': rec.sequence,
                    'groups_id': [(6, 0, rec.group_ids.ids)],
                })
            if rec.client_action_id:
                rec.client_action_id.write({'name': rec.name})
        return res

    def unlink(self):
        menus = self.mapped("menu_ref")
        actions = self.mapped("client_action_id")

        # putuskan relasi dulu (PENTING)
        self.write({
            'menu_ref': False,
            'client_action_id': False,
        })

        res = super().unlink()

        # hapus dependency SETELAH record utama gone
        if menus:
            menus.sudo().unlink()
        if actions:
            actions.sudo().unlink()

        return res

