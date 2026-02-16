# -*- coding: utf-8 -*-
from ast import literal_eval
from odoo import api, fields, models
from odoo.osv import expression
import logging
import random

_logger = logging.getLogger(__name__)

class DashboardBlock(models.Model):
    """Class used to create charts and tiles in dashboard"""
    _name = "dashboard.block"
    _description = "Dashboard Block"
    _order = "sequence, name"
    
    # ==== SEQUENCE AND VISIBILITY ====
    sequence = fields.Integer(string="Sequence", default=10, help="Order of blocks in dashboard")
    active = fields.Boolean(string="Active", default=True, help="Uncheck to hide this block")
    is_public = fields.Boolean(string="Public Dashboard", default=False, 
                               help="If checked, this block will be visible to all users")
    
    # ==== BASIC INFORMATION ====
    name = fields.Char(string="Name", required=True, help='Name of the block')
    description = fields.Text(string="Description", help="Detailed description of this block")
    type = fields.Selection(
        selection=[("graph", "Chart"), ("tile", "Tile"), ("list", "Table"), ("kpi", "KPI")],
        string="Type", required=True, default="tile",
        help='Type of Block: Chart, Tile, Table, or KPI'
    )
    
    # ==== DATA SOURCE CONFIGURATION ====
    # PERBAIKAN: Hapus ondelete='restrict' untuk ir.model
    model_id = fields.Many2one(
        'ir.model', 
        string='Model', 
        required=True, 
        ondelete='cascade',  # Ubah dari 'restrict' ke 'cascade'
        help="Select the model to fetch data from"
    )
    model_name = fields.Char(
        related='model_id.model', 
        string="Model Name", 
        store=True, 
        readonly=True
    )
    filter = fields.Char(
        string="Domain Filter", 
        help="Filter domain for data (e.g., [('state','=','done')])",
        widget="domain", 
        options="{'model': 'model_name'}"
    )
    
    # PERBAIKAN: Tambahkan ondelete='cascade' untuk field yang merujuk ke ir.model.fields
    group_by_id = fields.Many2one(
        "ir.model.fields", 
        string="Group by",
        ondelete='cascade',  # Tambahkan ini
        domain="[('model_id','=',model_id), ('ttype','not in',['one2many','binary']), ('store', '=', True)]",
        help='Field to group by (for charts and tables)'
    )
    
    # ==== MEASUREMENT CONFIGURATION ====
    operation = fields.Selection(
        selection=[
            ("sum", "Sum"), 
            ("avg", "Average"), 
            ("count", "Count"),
            ("min", "Minimum"),
            ("max", "Maximum")
        ],
        string="Operation",
        default="count",
        help='Aggregation operation to calculate values'
    )
    
    # PERBAIKAN: Tambahkan ondelete='cascade' untuk field yang merujuk ke ir.model.fields
    measured_field_id = fields.Many2one(
        "ir.model.fields", 
        string="Measured Field",
        ondelete='cascade',  # Tambahkan ini
        domain="[('model_id','=',model_id), ('ttype','in',['float','integer','monetary']), ('store', '=', True)]",
        help="Field to measure/aggregate"
    )
    
    # ==== VISUAL CONFIGURATION ====
    # For Charts
    graph_type = fields.Selection(
        selection=[
            ("bar", "Bar Chart"), 
            ("line", "Line Chart"), 
            ("pie", "Pie Chart"),
            ("doughnut", "Donut Chart"),
            ("radar", "Radar Chart"),
            ("polarArea", "Polar Area")
        ],
        string="Chart Type",
        default="bar",
        help='Type of Chart'
    )
    
    # For Tiles/KPI
    fa_icon = fields.Char(
        string="Icon", 
        default="fa-cube",
        help="Font Awesome icon class (e.g., 'fa-users', 'fa-chart-line')"
    )
    icon_size = fields.Selection(
        [('small', 'Small'), ('medium', 'Medium'), ('large', 'Large')],
        string="Icon Size",
        default='medium'
    )
    
    # Colors
    tile_color = fields.Char(
        string="Background Color", 
        default="#ffffff", 
        help='Primary Color of Tile/Chart'
    )
    text_color = fields.Char(
        string="Text Color", 
        default="#171717", 
        help='Text Color'
    )
    fa_color = fields.Char(
        string="Icon Color", 
        default="#000000", 
        help='Icon Color'
    )
    
    # ==== LAYOUT AND POSITION ====
    height = fields.Char(string="Height", default="180px", help="Height of the block")
    width = fields.Char(string="Width", default="300px", help="Width of the block")
    translate_x = fields.Char(string="Position X", help="X position for grid layout")
    translate_y = fields.Char(string="Position Y", help="Y position for grid layout")
    data_x = fields.Integer(string="Grid X", default=0, help="Grid X coordinate")
    data_y = fields.Integer(string="Grid Y", default=0, help="Grid Y coordinate")
    grid_width = fields.Integer(string="Grid Width", default=1, help="Width in grid units (1-12)")
    grid_height = fields.Integer(string="Grid Height", default=1, help="Height in grid units (1-12)")
    
    # ==== TABLE CONFIGURATION ====
    # PERBAIKAN: Untuk Many2many, Odoo menangani ondelete secara otomatis
    tag_fields_ids = fields.Many2many(
        "ir.model.fields", 
        string="Table Columns",
        domain="[('model_id','=',model_id), ('ttype','not in',['binary']), ('store', '=', True)]",
        help='Fields to display in table'
    )
    table_limit = fields.Integer(string="Row Limit", default=10, 
                               help="Maximum number of rows to display")
    show_pagination = fields.Boolean(string="Show Pagination", default=False)
    
    # ==== KPI/TARGET SETTINGS ====
    record_value = fields.Float(
        string='Current Value', 
        compute='_compute_record_value', 
        store=True, 
        digits=(16, 2),
        help="Calculated value based on operation and filter"
    )
    prev_value = fields.Float(
        string='Previous Value', 
        default=0, 
        help="Previous period value for comparison"
    )
    target_value = fields.Float(
        string='Target Value', 
        default=0, 
        help="Target value for KPI"
    )
    show_trend = fields.Boolean(string="Show Trend Indicator", default=True)
    trend_period = fields.Selection(
        [('day', 'Day'), ('week', 'Week'), ('month', 'Month'), ('year', 'Year')],
        string="Trend Period",
        default='month'
    )
    
    # ==== SYSTEM FIELDS ====
    # PERBAIKAN: Tambahkan ondelete='cascade' untuk client_action_id
    client_action_id = fields.Many2one(
        'ir.actions.client', 
        string="Client Action", 
        ondelete='cascade',  # Tambahkan ini
        default=lambda self: self._get_default_action(),
        help="Client Action"
    )
    last_update = fields.Datetime(
        string="Last Updated", 
        compute='_compute_last_update', 
        store=True
    )
    
    # ==== COMPUTED FIELDS ====
    @api.depends('measured_field_id', 'operation', 'filter', 'model_name', 'group_by_id')
    def _compute_record_value(self):
        """Compute the aggregated value based on operation and filter"""
        for rec in self:
            rec.record_value = 0.0
            
            if not rec.model_name:
                continue
                
            try:
                target_model = self.env[rec.model_name]
            except KeyError:
                _logger.warning("Model %s not found for block %s", rec.model_name, rec.name)
                continue
            
            # Prepare domain
            domain = self._parse_domain(rec.filter) if rec.filter else []
            
            # Compute value
            if rec.operation == 'count':
                rec.record_value = target_model.search_count(domain)
            else:
                if not rec.measured_field_id or rec.measured_field_id.name not in target_model._fields:
                    continue
                    
                field_name = rec.measured_field_id.name
                aggregate_field = f'{rec.operation}:{field_name}'
                
                try:
                    result = target_model.read_group(
                        domain,
                        [aggregate_field],
                        [],
                        limit=1
                    )
                    
                    if result and result[0]:
                        computed_key = f'{rec.operation}_{field_name}'
                        rec.record_value = result[0].get(computed_key, 0.0)
                except Exception as e:
                    _logger.error("Error computing value for block %s: %s", rec.name, e)
                    rec.record_value = 0.0
    
    @api.depends('write_date')
    def _compute_last_update(self):
        """Update last update timestamp"""
        for rec in self:
            rec.last_update = fields.Datetime.now()
    
    # ==== HELPER METHODS ====
    def _parse_domain(self, filter_str):
        """Safely parse domain string"""
        if not filter_str:
            return []
            
        try:
            domain = literal_eval(filter_str)
            if isinstance(domain, list):
                # Replace special variables
                for i, condition in enumerate(domain):
                    if isinstance(condition, (tuple, list)) and len(condition) == 3:
                        field, op, value = condition
                        if value == "%UID":
                            domain[i] = (field, op, self.env.user.id)
                        elif value == "%COMPANY":
                            domain[i] = (field, op, self.env.company.id)
                return domain
        except Exception as e:
            _logger.error("Error parsing domain: %s", e)
        return []
    
    def _format_number(self, number):
        """Format large numbers with K, M, G suffixes"""
        if number == 0:
            return "0"
            
        suffixes = ['', 'K', 'M', 'G', 'T', 'P']
        magnitude = 0
        
        abs_number = abs(number)
        while abs_number >= 1000 and magnitude < len(suffixes) - 1:
            magnitude += 1
            abs_number /= 1000.0
            
        sign = '-' if number < 0 else ''
        
        # Format based on magnitude
        if magnitude == 0:
            # Integer for small numbers
            formatted = f"{sign}{int(abs_number)}"
        else:
            # One decimal for large numbers
            formatted = f"{sign}{abs_number:.1f}{suffixes[magnitude]}"
        
        return formatted
    
    def _generate_colors(self, count):
        """Generate distinct colors for charts"""
        colors = []
        hue_step = 360 / max(count, 1)
        
        for i in range(count):
            hue = int(i * hue_step) % 360
            # Use HSL for consistent brightness and saturation
            colors.append(f'hsl({hue}, 70%, 60%)')
        
        return colors
    
    # ==== DEFAULT METHODS ====
    def _get_default_action(self):
        """Get default client action"""
        action_id = self.env.ref('zee_ui.dashboard_view_action', False)
        return action_id.id if action_id else False
    
    # ==== ONCHANGE METHODS ====
    @api.onchange('model_id')
    def _onchange_model_id(self):
        """Reset related fields when model is changed"""
        self.operation = 'count'
        self.measured_field_id = False
        self.group_by_id = False
        self.tag_fields_ids = [(5, 0, 0)]  # Clear all
        self.filter = False
    
    @api.onchange('type')
    def _onchange_type(self):
        """Set defaults based on type"""
        if self.type == 'graph':
            self.graph_type = 'bar'
        elif self.type == 'tile' or self.type == 'kpi':
            self.fa_icon = self.fa_icon or 'fa-cube'
        elif self.type == 'list':
            self.table_limit = 10
    
    @api.onchange('measured_field_id')
    def _onchange_measured_field_id(self):
        """Set appropriate operation based on field type"""
        if self.measured_field_id:
            field_type = self.measured_field_id.ttype
            if field_type in ['many2one', 'many2many', 'one2many']:
                self.operation = 'count'
    
    # ==== BUSINESS METHODS ====
    @api.model
    def get_dashboard_vals(self, action_id, start_date=None, end_date=None):
        """Fetch block values from js and create chart"""
        block_vals = []
        
        # PERBAIKAN: Gunakan sudo() dengan hati-hati, hanya untuk read
        blocks = self.env['dashboard.block'].search(
            [
                ('client_action_id', '=', int(action_id)), 
                ('active', '=', True)
            ],
            order='data_y, data_x'
        )
        
        for rec in blocks:
            try:
                vals = {
                    'id': rec.id,
                    'name': rec.name,
                    'type': rec.type,
                    'model_name': rec.model_name,
                    'active': rec.active,
                    'grid_position': {
                        'x': rec.data_x or 0,
                        'y': rec.data_y or 0,
                        'w': rec.grid_width or 1,
                        'h': rec.grid_height or 1
                    },
                    'config': self._get_block_config(rec),
                    'data': self._get_block_data(rec, start_date, end_date),
                    'last_update': rec.last_update.isoformat() if rec.last_update else None,
                    'error': None
                }
            except Exception as e:
                _logger.error("Error preparing block %s: %s", rec.name, e)
                vals = {
                    'id': rec.id,
                    'name': rec.name,
                    'type': rec.type,
                    'error': f"Error: {str(e)}",
                    'config': {},
                    'data': {}
                }
            
            block_vals.append(vals)
            
        return block_vals
    
    def _get_block_config(self, rec):
        """Get block configuration"""
        config = {
            'colors': {
                'background': rec.tile_color or "#ffffff",
                'text': rec.text_color or "#171717",
                'icon': rec.fa_color or "#000000"
            },
            'layout': {
                'height': rec.height or '300px',
                'width': rec.width or '100%'
            }
        }
        
        if rec.type == 'graph':
            config.update({
                'chart_type': rec.graph_type or 'bar',
                'group_by': rec.group_by_id.name if rec.group_by_id else None,
                'show_legend': True,
                'show_grid': True
            })
        elif rec.type in ['tile', 'kpi']:
            config.update({
                'icon': rec.fa_icon or 'fa-cube',
                'icon_size': rec.icon_size or 'medium',
                'show_trend': rec.show_trend,
                'trend_period': rec.trend_period
            })
        elif rec.type == 'list':
            config.update({
                'columns': rec.tag_fields_ids.mapped('name') if rec.tag_fields_ids else [],
                'limit': rec.table_limit or 10,
                'pagination': rec.show_pagination
            })
            
        return config
    
    def _get_block_data(self, rec, start_date=None, end_date=None):
        """Get block data based on type"""
        try:
            if not rec.model_name:
                return {'error': 'No model selected'}
                
            target_model = self.env[rec.model_name]
            domain = self._parse_domain(rec.filter) if rec.filter else []
            
            # Add date filters if provided
            if start_date and end_date:
                date_domain = [('create_date', '>=', start_date), ('create_date', '<=', end_date)]
                if domain:
                    domain = expression.AND([domain, date_domain])
                else:
                    domain = date_domain
            
            if rec.type == 'list':
                return self._get_list_data(rec, target_model, domain)
            elif rec.type == 'graph':
                return self._get_chart_data(rec, target_model, domain)
            else:  # tile/kpi
                return self._get_tile_data(rec, target_model, domain)
                
        except Exception as e:
            _logger.error("Error getting data for block %s: %s", rec.name, e)
            return {'error': str(e)}
    
    def _get_list_data(self, rec, model, domain):
        """Get table data"""
        if not rec.tag_fields_ids:
            return {'error': 'No columns selected for table'}
            
        fields = rec.tag_fields_ids.mapped('name')
        
        try:
            records = model.search_read(
                domain=domain,
                fields=fields,
                limit=rec.table_limit or 10,
                order='id desc'  # Default order by latest
            )
            
            return {
                'columns': fields,
                'rows': records,
                'total': model.search_count(domain),
                'limit': rec.table_limit or 10
            }
        except Exception as e:
            _logger.error("Error fetching list data: %s", e)
            return {'error': f"Data fetch error: {str(e)}"}
    
    def _get_chart_data(self, rec, model, domain, start_date=None, end_date=None):
        """Get chart data using direct SQL query (model lama style)"""
        if not rec.group_by_id:
            return {'error': 'No group by field selected for chart'}

        try:
            # Gunakan method get_query yang sudah ditambahkan ke model
            query = model.get_query(
                args=domain,
                operation=rec.operation,
                field=rec.measured_field_id,
                start_date=start_date,
                end_date=end_date,
                group_by=rec.group_by_id,
                apply_ir_rules=True
            )

            self._cr.execute(query)
            records = self._cr.dictfetchall()

            group_field = rec.group_by_id.name
            x_axis = []
            y_axis = []

            for record in records:
                # Nilai sumbu X (group by)
                x_val = record.get(group_field)
                if isinstance(x_val, dict) and 'name' in x_val:
                    x_val = x_val.get('name')  # Untuk field many2one
                elif x_val is False:
                    x_val = 'Undefined'
                x_axis.append(x_val)

                # Nilai sumbu Y (hasil agregasi)
                y_axis.append(record.get('value', 0))

            return {
                'labels': x_axis,
                'datasets': [{
                    'label': rec.name,
                    'data': y_axis,
                    'backgroundColor': self._generate_colors(len(y_axis))
                }]
            }

        except Exception as e:
            _logger.error("Error in _get_chart_data: %s", e)
            return {'error': str(e)}
        
    def _get_tile_data(self, rec, model, domain):
        """Get tile/KPI data"""
        try:
            current_value = rec.record_value
            previous_value = rec.prev_value
            target_value = rec.target_value
            
            # Calculate trend
            trend = 0
            trend_direction = 'neutral'
            
            if previous_value != 0:
                trend = ((current_value - previous_value) / abs(previous_value)) * 100
                if trend > 0:
                    trend_direction = 'up'
                elif trend < 0:
                    trend_direction = 'down'
            
            # Calculate achievement percentage
            achievement = 0
            if target_value != 0:
                achievement = (current_value / target_value) * 100
            
            # Format numbers
            formatted_value = self._format_number(current_value)
            formatted_target = self._format_number(target_value) if target_value != 0 else "0"
            
            return {
                'value': current_value,
                'formatted_value': formatted_value,
                'previous_value': previous_value,
                'target_value': target_value,
                'formatted_target': formatted_target,
                'trend': round(trend, 2),
                'trend_direction': trend_direction,
                'achievement': round(achievement, 2)
            }
        except Exception as e:
            _logger.error("Error calculating tile data: %s", e)
            return {
                'value': 0,
                'formatted_value': "0",
                'error': str(e)
            }
            
    @api.model
    def get_save_layout(self, grid_data_list):
        """Save edited layout values"""
        for data in grid_data_list:
            block = self.browse(int(data['id']))
            if not block:
                continue
                
            updates = {}
            if 'x' in data and 'y' in data:
                updates.update({
                    'data_x': int(data['x']),
                    'data_y': int(data['y'])
                })
            
            if 'w' in data and 'h' in data:
                updates.update({
                    'grid_width': int(data['w']),
                    'grid_height': int(data['h'])
                })
            
            if 'height' in data:
                updates.update({
                    'height': f"{data['height']}px"
                    # 'width': f"{data['width']}px"
                })
            
            if updates:
                block.write(updates)
                
        return {'success': True, 'message': 'Layout saved successfully'}
    
    def action_refresh_data(self):
        """Manual refresh of block data"""
        self._compute_record_value()
        return {
            'type': 'ir.actions.client',
            'tag': 'display_notification',
            'params': {
                'title': 'Data Refreshed',
                'message': 'Dashboard data has been refreshed.',
                'type': 'success',
                'sticky': False,
            }
        }
    
    def action_duplicate_block(self):
        """Duplicate a dashboard block"""
        self.ensure_one()
        
        # Prepare copy values
        copy_vals = {
            'name': f"{self.name} (Copy)",
            'sequence': self.sequence + 1,
            'data_x': (self.data_x or 0) + 1,
            'data_y': (self.data_y or 0) + 1,
        }
        
        # Copy the record
        new_block = self.copy(copy_vals)
        
        # Return action to open the new block
        return {
            'type': 'ir.actions.act_window',
            'res_model': 'dashboard.block',
            'res_id': new_block.id,
            'view_mode': 'form',
            'target': 'current',
            'context': {'form_view_initial_mode': 'edit'}
        }
    
    def action_archive(self):
        """Archive the block"""
        self.ensure_one()
        self.active = False
        return True
    
    def action_unarchive(self):
        """Unarchive the block"""
        self.ensure_one()
        self.active = True
        return True
    
    @api.model
    def create(self, vals):
        """Override create to set default values"""
        if 'tile_color' not in vals:
            # Generate random color if not provided
            colors = ['#1f6abb', '#2c9faf', '#34a853', '#fbbc05', '#ea4335', 
                     '#4285f4', '#9c27b0', '#ff9800', '#795548', '#607d8b']
            vals['tile_color'] = random.choice(colors)
        
        if 'fa_icon' not in vals and vals.get('type') in ['tile', 'kpi']:
            # Set default icon based on type
            icon_map = {
                'graph': 'fa-chart-bar',
                'tile': 'fa-cube',
                'list': 'fa-table',
                'kpi': 'fa-chart-line'
            }
            vals['fa_icon'] = icon_map.get(vals.get('type'), 'fa-cube')
        
        return super(DashboardBlock, self).create(vals)
    
    def write(self, vals):
        """Override write to handle field updates"""
        # If model is changed, reset related fields
        if 'model_id' in vals:
            reset_fields = ['measured_field_id', 'group_by_id', 'filter']
            for field in reset_fields:
                if field not in vals:
                    vals[field] = False
            # Clear many2many fields
            self.tag_fields_ids = [(5, 0, 0)]
        
        return super(DashboardBlock, self).write(vals)