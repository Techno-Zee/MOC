# -*- coding: utf-8 -*-
from ast import literal_eval
from odoo import api, fields, models
from odoo.osv import expression
import logging

class DashboardBlock(models.Model):
    """Class used to create charts and tiles in dashboard"""
    _name = "dashboard.block"
    _description = "Dashboard Block"

    def get_default_action(self):
        """Function to get values from dashboard if action_id is true, return
        the action ID, else return False"""
        action_id = self.env.ref('zee_ui.dashboard_view_action', False)
        return action_id.id if action_id else False

    name = fields.Char(string="Name", help='Name of the block')
    sub_title = fields.Char(string="Subtitle",default='Sub Title')
    fa_icon = fields.Char(string="Icon", help="Add icon for tile")
    operation = fields.Selection(
        selection=[("sum", "Sum"), ("avg", "Average"), ("count", "Count")],
        string="Operation",
        help='Tile Operation to calculate values for tile',
        required=True
    )
    graph_type = fields.Selection(
        selection=[("bar", "Bar"), ("radar", "Radar"), ("pie", "Pie"),
                   ("polarArea", "Polar Area"), ("line", "Line"),
                   ("donut", "Donut")],
        string="Chart Type", help='Type of Chart'
    )
    measured_field_id = fields.Many2one("ir.model.fields", string="Measured Field", help="Select the Measured")
    client_action_id = fields.Many2one('ir.actions.client', string="Client Action", default=get_default_action, help="Client Action")
    type = fields.Selection(
        selection=[("graph", "Chart"), ("tile", "Tile"), ("list", "Table")],
        string="Type", help='Type of Block: Chart, Tile, or Table'
    )
    x_axis = fields.Char(string="X-Axis", help="Chart X-axis")
    y_axis = fields.Char(string="Y-Axis", help="Chart Y-axis")
    height = fields.Char(string="Height", help="Height of the block")
    width = fields.Char(string="Width", help="Width of the block")
    translate_x = fields.Char(string="Translate_X", help="x value for style transform translate")
    translate_y = fields.Char(string="Translate_Y", help="y value for style transform translate")
    data_x = fields.Char(string="Data_X", help="Data x value for resize")
    data_y = fields.Char(string="Data_Y", help="Data y value for resize")
    group_by_id = fields.Many2one("ir.model.fields", string="Group by(Y-Axis)", help='Field value for Y-Axis')
    tag_fields_ids = fields.Many2many("ir.model.fields", string="Field", help='Field value for Table')
    tile_color = fields.Char(string="Tile Color", help='Primary Color of Tile')
    text_color = fields.Char(string="Text Color", help='Text Color of Tile')
    val_color = fields.Char(string="Value Color", help='Value Color of Tile')
    fa_color = fields.Char(string="Icon Color", help='Icon Color of Tile')
    filter = fields.Char(string="Filter", help="Add filter")
    model_id = fields.Many2one('ir.model', string='Model', help="Select the module name")
    tag_model_ids = fields.Char(related='model_id.model', string="Model Name", help="Added model_id model")
    model_name = fields.Char(related='model_id.model', string="Model Name", help="Added model_id model")
    edit_mode = fields.Boolean(string="Edit Mode", help="Enable to edit chart and tile")

    record_value = fields.Integer(string='Record Value', compute='_compute_record_value', store=True, help="Total dari measured_field_id berdasarkan operation dan filter.")
    prev = fields.Float(string='Prev Value',default=0)
    target = fields.Float(string='Target Value',default=0)

    @api.depends('measured_field_id', 'operation', 'filter', 'model_name')
    def _compute_record_value(self):
        for rec in self:
            rec.record_value = 0.0 # Selalu inisialisasi sebagai float

            if not rec.model_name:
                continue

            try:
                target_model = self.env[rec.model_name]
            except KeyError:
                continue # Model tidak ditemukan, skip record ini

            domain = []
            if rec.filter:
                try:
                    # Pastikan evaluasi aman dan menghasilkan list
                    parsed_domain = eval(rec.filter)
                    if isinstance(parsed_domain, list):
                        domain = parsed_domain
                except (SyntaxError, TypeError, NameError):
                    pass # Biarkan domain kosong jika parsing gagal

            field_name = rec.measured_field_id.name if rec.measured_field_id else False

            # --- Logika Perhitungan Baru ---
            if rec.operation == 'count':
                rec.record_value = target_model.search_count(domain)
            else:
                # Untuk operasi agregasi selain 'count'
                if not field_name or field_name not in target_model._fields:
                    # Jika field tidak valid atau tidak ada, tidak bisa melanjutkan agregasi
                    continue

                # Siapkan aggregate field yang akan diambil dari read_group
                aggregate_field = f'{rec.operation}:{field_name}'

                result = target_model.read_group(
                    domain,
                    [aggregate_field],
                    [], # Tidak ada grouping, kita hanya ingin satu nilai agregat
                    limit=1 # Hanya perlu satu hasil
                )

                # Ekstraksi nilai dari hasil read_group
                if result and result[0]:
                    # Kunci di hasil read_group akan menjadi 'operation_field_name'
                    # Contoh: 'sum_amount', 'avg_quantity'
                    computed_key = f'{rec.operation}_{field_name}'
                    if computed_key in result[0]:
                        rec.record_value = result[0][computed_key]
                    # Kasus khusus untuk count jika terpaksa menggunakan read_group (jarang)
                    elif '__count' in result[0]:
                        rec.record_value = result[0]['__count']


    @api.onchange('model_id')
    def _onchange_model_id(self):
        """Reset operation and measured field when model is changed"""
        if self.operation or self.measured_field_id:
            self.operation = False
            self.measured_field_id = False

    def get_dashboard_vals(self, action_id, start_date=None, end_date=None):
        """Fetch block values from js and create chart"""
        block_vals = []
        
        # Cari semua blok untuk action_id ini
        blocks = self.env['dashboard.block'].sudo().search(
            [('client_action_id', '=', int(action_id))]
        )
        
        for rec in blocks:
            vals = {}
            
            try:
                # 1. Penanganan Filter (Configuration Error Check)
                rec.filter = rec.filter or "[]"
                filter_list = literal_eval(rec.filter)
                
                # Handle special Odoo variables (%UID)
                for i, condition in enumerate(filter_list):
                    if isinstance(condition, (tuple, list)) and len(condition) == 3:
                        field, op, value = condition
                        if value == "%UID":
                            filter_list[i] = (field, op, self.env.user.id)
                
                # Remove create_date filters
                filter_list = [item for item in filter_list if not (
                        isinstance(item, tuple) and item[0] == 'create_date')]
                
                # Update filter in record (hanya untuk consistency, tidak wajib disimpan)
                rec.filter = repr(filter_list)
            
                # 2. Siapkan Nilai Dasar (vals)
                vals = {
                    'id': rec.id,
                    'name': rec.name,
                    'sub_title': rec.sub_title,
                    'type': rec.type,
                    'graph_type': rec.graph_type,
                    'icon': rec.fa_icon,
                    'model_name': rec.model_name,
                    'model_tag': rec.tag_fields_ids.mapped('name'), # Gunakan .mapped('name') untuk JS
                    'color': f'background-color: {rec.tile_color};' if rec.tile_color else '#1f6abb;',
                    'text_color': f'color: {rec.text_color};' if rec.text_color else '#FFFFFF;',
                    'val_color': f'color: {rec.val_color};' if rec.val_color else '#FFFFFF;',
                    'icon_color': f'color: {rec.tile_color};' if rec.tile_color else '#1f6abb;',
                    'height': rec.height,
                    'width': rec.width,
                    'translate_x': rec.translate_x,
                    'translate_y': rec.translate_y,
                    'data_x': rec.data_x,
                    'data_y': rec.data_y,
                    'domain': filter_list,
                }

                # 3. Logika Pengambilan Data (SQL Query Error Check)
                domain = expression.AND([filter_list]) # Gunakan filter_list yang sudah di-eval
                
                if rec.model_name and hasattr(self.env[rec.model_name], 'get_query'):
                    try:
                        query_function = self.env[rec.model_name].get_query
                        records = []

                        if rec.type == 'list':
                            # List/Table
                            self._cr.execute(query_function(
                                domain, '', rec.measured_field_id, start_date, end_date, group_by=rec.group_by_id
                            ))
                            list_data = self._cr.dictfetchall()
                            vals.update({'list_data': list_data})
                            
                        elif rec.type == 'graph':
                            # Chart/Graph
                            self._cr.execute(query_function(
                                domain, rec.operation, rec.measured_field_id,
                                start_date, end_date, group_by=rec.group_by_id
                            ))
                            records = self._cr.dictfetchall()
                            
                            x_axis = []
                            y_axis = []
                            for record in records:
                                x_key = rec.group_by_id.name if rec.group_by_id else 'name'
                                y_key = 'value'
                                
                                # Handling multilingual name (jika ada)
                                if record.get(x_key) and isinstance(record.get(x_key), dict):
                                    x_axis.append(record.get(x_key).get(self._context.get('lang') or 'en_US'))
                                else:
                                    x_axis.append(record.get(x_key))
                                
                                y_axis.append(record.get(y_key))
                                
                            vals.update({'x_axis': x_axis, 'y_axis': y_axis})
                            
                        else: # Tile (Default)
                            # Tile
                            self._cr.execute(query_function(
                                domain, rec.operation, rec.measured_field_id,
                                start_date, end_date
                            ))
                            records = self._cr.dictfetchall()
                            
                            if records:
                                # Logika format angka besar (K/M/G)
                                magnitude = 0
                                total = records[0].get('value', 0)
                                temp_total = abs(total)
                                while temp_total >= 1000:
                                    magnitude += 1
                                    temp_total /= 1000.0
                                # Pertahankan tanda negatif/positif dari 'total' asli
                                sign = -1 if total < 0 else 1
                                val = '%.2f%s' % (temp_total * sign, ['', 'K', 'M', 'G', 'T', 'P'][magnitude])
                                
                                records[0]['value'] = val
                                vals.update(records[0])
                                
                    except Exception as sql_e:
                        # Tangani kegagalan eksekusi SQL (Query Error)
                        _logger.error(f"SQL/Data Error for block {rec.id} ({rec.name}) on model {rec.model_name}: {sql_e}")
                        vals['error'] = f"Gagal memuat data. Error: {sql_e}"
                        
                else:
                    # Log warning jika model tidak mendukung 'get_query'
                    _logger.warning("Model '%s' does not support 'get_query' for block %s. Skipping data retrieval.", rec.model_name, rec.id)
                    vals['error'] = "Model tidak mendukung fungsi get_query."
            
            except Exception as e:
                # Tangkap error konfigurasi blok (Filter/Literal Eval Error)
                _logger.error(f"Configuration Error for block {rec.id}: {e}")
                vals['error'] = f"Error konfigurasi blok. Error: {e}"
                # Jika terjadi error di sini, vals mungkin belum terisi, tapi kita harus tetap menambahkan sesuatu ke block_vals
                if not vals: 
                     vals = {'id': rec.id, 'name': rec.name, 'error': f"Fatal Error: {e}"}
            
            block_vals.append(vals)
            
        return block_vals

    def get_save_layout(self, grid_data_list):
        """Function to fetch edited values while editing layout of chart or tile
         and save them in the database"""
        for data in grid_data_list:
            block = self.browse(int(data['id']))
            if not block:
                continue
            updated_values = {}
            if data.get('data-x'):
                updated_values.update({
                    'translate_x': f"{data['data-x']}px",
                    'translate_y': f"{data['data-y']}px",
                    'data_x': data['data-x'],
                    'data_y': data['data-y'],
                })
            if data.get('height'):
                updated_values.update({
                    'height': f"{data['height']}px",
                    'width': f"{data['width']}px",
                })
            if updated_values:
                block.write(updated_values)
        return True