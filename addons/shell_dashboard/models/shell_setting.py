# -*- coding: utf-8 -*-
from odoo import models, fields, api

class ResConfigSettings(models.TransientModel):
    _inherit = 'res.config.settings'

    # ==== DASHBOARD SETTINGS ====

    # General
    view_icon = fields.Boolean(string="View Icon", default=True)
    icon_position = fields.Selection(
        string="Icon Position",
        selection=[
            ("left", "Left"),
            ("right", "Right"),
        ],
        default="right",
        help="Position of the icon relative to the KPI text."
    )

    # Mobile views
    mobile_layout_kpi_tile = fields.Selection(
        string="Mobile KPI Tile Layout",
        selection=[
            ("grid", "Grid Layout (even columns)"),
            ("scroll_horizontal", "Horizontal Scroll"),
            ("max_items", "Max Items (limited)"),
        ],
        default="max_items",
        help="Defines how KPI tiles are arranged on mobile devices."
    )

    mobile_max_items = fields.Integer(
        string="Maximum Items on Mobile",
        default=4,
        help="Maximum number of KPI tiles displayed when 'Max Items' layout is selected."
    )

    mobile_block_type_grouping = fields.Boolean(
        string="Block Type Grouping",
        default=True,
        help="Group KPI tiles by type (e.g., revenue, orders) on mobile."
    )

    @api.model
    def get_values(self):
        res = super(ResConfigSettings, self).get_values()
        params = self.env['ir.config_parameter'].sudo()

        # Ambil nilai dari parameter sistem, gunakan default sesuai field
        res.update(
            view_icon=params.get_param('dashboard.view_icon', default=True),
            icon_position=params.get_param('dashboard.icon_position', default='right'),
            mobile_layout_kpi_tile=params.get_param('dashboard.mobile_layout_kpi_tile', default='max_items'),
            mobile_max_items=int(params.get_param('dashboard.mobile_max_items', default=4)),
            mobile_block_type_grouping=params.get_param('dashboard.mobile_block_type_grouping', default=True),
        )
        return res

    def set_values(self):
        super(ResConfigSettings, self).set_values()
        params = self.env['ir.config_parameter'].sudo()

        # Simpan nilai ke parameter sistem
        params.set_param('dashboard.view_icon', str(self.view_icon))
        params.set_param('dashboard.icon_position', self.icon_position)
        params.set_param('dashboard.mobile_layout_kpi_tile', self.mobile_layout_kpi_tile)
        params.set_param('dashboard.mobile_max_items', str(self.mobile_max_items))
        params.set_param('dashboard.mobile_block_type_grouping', str(self.mobile_block_type_grouping))