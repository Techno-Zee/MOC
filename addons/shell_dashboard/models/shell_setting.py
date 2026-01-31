# -*- coding: utf-8 -*-
from odoo import models, fields, api


class ResConfigSettings(models.TransientModel):
    _inherit = 'res.config.settings'

    dashboard_default_tile_color = fields.Char(
        string='Default Tile Color',
        default='#1f6abb',
        config_parameter='shell_dashboard.default_tile_color',
        help='Default background color for new tiles'
    )
    
    dashboard_default_text_color = fields.Char(
        string='Default Text Color',
        default='#FFFFFF',
        config_parameter='shell_dashboard.default_text_color',
        help='Default text color for new tiles'
    )
    
    dashboard_default_cell_height = fields.Integer(
        string='Grid Cell Height',
        default=80,
        config_parameter='shell_dashboard.grid_cell_height',
        help='Height of each grid cell in pixels'
    )
    
    dashboard_default_columns = fields.Integer(
        string='Grid Columns',
        default=12,
        config_parameter='shell_dashboard.grid_columns',
        help='Number of columns in the grid layout'
    )
    
    dashboard_enable_animations = fields.Boolean(
        string='Enable Animations',
        default=True,
        config_parameter='shell_dashboard.enable_animations',
        help='Enable animations for dashboard elements'
    )
    
    dashboard_max_blocks_per_user = fields.Integer(
        string='Maximum Blocks per User',
        default=50,
        config_parameter='shell_dashboard.max_blocks_per_user',
        help='Maximum number of dashboard blocks a user can create'
    )
    
    dashboard_default_chart_type = fields.Selection(
        selection=[
            ("bar", "Bar Chart"),
            ("line", "Line Chart"),
            ("pie", "Pie Chart"),
            ("donut", "Donut Chart"),
            ("radar", "Radar Chart"),
        ],
        string='Default Chart Type',
        default='bar',
        config_parameter='shell_dashboard.default_chart_type',
        help='Default chart type for new chart blocks'
    )
    
    dashboard_auto_refresh_interval = fields.Integer(
        string='Auto Refresh Interval (seconds)',
        default=60,
        config_parameter='shell_dashboard.auto_refresh_interval',
        help='Interval in seconds for automatic dashboard refresh (0 to disable)'
    )
    
    dashboard_enable_data_export = fields.Boolean(
        string='Enable Data Export',
        default=True,
        config_parameter='shell_dashboard.enable_data_export',
        help='Allow users to export dashboard data to CSV/Excel'
    )
    
    dashboard_show_quick_stats = fields.Boolean(
        string='Show Quick Statistics',
        default=True,
        config_parameter='shell_dashboard.show_quick_stats',
        help='Show quick statistics panel on dashboard'
    )
    
    dashboard_date_range_default = fields.Selection(
        selection=[
            ('today', 'Today'),
            ('yesterday', 'Yesterday'),
            ('this_week', 'This Week'),
            ('last_week', 'Last Week'),
            ('this_month', 'This Month'),
            ('last_month', 'Last Month'),
            ('this_quarter', 'This Quarter'),
            ('this_year', 'This Year'),
        ],
        string='Default Date Range',
        default='this_month',
        config_parameter='shell_dashboard.date_range_default',
        help='Default date range filter for dashboard data'
    )
    
    dashboard_cache_duration = fields.Integer(
        string='Cache Duration (minutes)',
        default=5,
        config_parameter='shell_dashboard.cache_duration',
        help='Duration in minutes to cache dashboard data for performance'
    )
    
    dashboard_enable_sql_debug = fields.Boolean(
        string='Enable SQL Debug Mode',
        default=False,
        config_parameter='shell_dashboard.enable_sql_debug',
        help='Log SQL queries for debugging (for developers only)'
    )
    
    @api.model
    def get_values(self):
        res = super(ResConfigSettings, self).get_values()
        params = self.env['ir.config_parameter'].sudo()
        
        res.update(
            dashboard_default_tile_color=params.get_param('shell_dashboard.default_tile_color', default='#1f6abb'),
            dashboard_default_text_color=params.get_param('shell_dashboard.default_text_color', default='#FFFFFF'),
            dashboard_default_cell_height=int(params.get_param('shell_dashboard.grid_cell_height', default=80)),
            dashboard_default_columns=int(params.get_param('shell_dashboard.grid_columns', default=12)),
            dashboard_enable_animations=params.get_param('shell_dashboard.enable_animations', default=True) == 'True',
            dashboard_max_blocks_per_user=int(params.get_param('shell_dashboard.max_blocks_per_user', default=50)),
            dashboard_default_chart_type=params.get_param('shell_dashboard.default_chart_type', default='bar'),
            dashboard_auto_refresh_interval=int(params.get_param('shell_dashboard.auto_refresh_interval', default=60)),
            dashboard_enable_data_export=params.get_param('shell_dashboard.enable_data_export', default=True) == 'True',
            dashboard_show_quick_stats=params.get_param('shell_dashboard.show_quick_stats', default=True) == 'True',
            dashboard_date_range_default=params.get_param('shell_dashboard.date_range_default', default='this_month'),
            dashboard_cache_duration=int(params.get_param('shell_dashboard.cache_duration', default=5)),
            dashboard_enable_sql_debug=params.get_param('shell_dashboard.enable_sql_debug', default=False) == 'True',
        )
        return res
    
    def set_values(self):
        super(ResConfigSettings, self).set_values()
        params = self.env['ir.config_parameter'].sudo()
        
        params.set_param('shell_dashboard.default_tile_color', self.dashboard_default_tile_color)
        params.set_param('shell_dashboard.default_text_color', self.dashboard_default_text_color)
        params.set_param('shell_dashboard.grid_cell_height', str(self.dashboard_default_cell_height))
        params.set_param('shell_dashboard.grid_columns', str(self.dashboard_default_columns))
        params.set_param('shell_dashboard.enable_animations', str(self.dashboard_enable_animations))
        params.set_param('shell_dashboard.max_blocks_per_user', str(self.dashboard_max_blocks_per_user))
        params.set_param('shell_dashboard.default_chart_type', self.dashboard_default_chart_type)
        params.set_param('shell_dashboard.auto_refresh_interval', str(self.dashboard_auto_refresh_interval))
        params.set_param('shell_dashboard.enable_data_export', str(self.dashboard_enable_data_export))
        params.set_param('shell_dashboard.show_quick_stats', str(self.dashboard_show_quick_stats))
        params.set_param('shell_dashboard.date_range_default', self.dashboard_date_range_default)
        params.set_param('shell_dashboard.cache_duration', str(self.dashboard_cache_duration))
        params.set_param('shell_dashboard.enable_sql_debug', str(self.dashboard_enable_sql_debug))