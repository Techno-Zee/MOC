# -*- coding: utf-8 -*-
# from odoo import http


# class ShellDashboard(http.Controller):
#     @http.route('/shell_dashboard/shell_dashboard', auth='public')
#     def index(self, **kw):
#         return "Hello, world"

#     @http.route('/shell_dashboard/shell_dashboard/objects', auth='public')
#     def list(self, **kw):
#         return http.request.render('shell_dashboard.listing', {
#             'root': '/shell_dashboard/shell_dashboard',
#             'objects': http.request.env['shell_dashboard.shell_dashboard'].search([]),
#         })

#     @http.route('/shell_dashboard/shell_dashboard/objects/<model("shell_dashboard.shell_dashboard"):obj>', auth='public')
#     def object(self, obj, **kw):
#         return http.request.render('shell_dashboard.object', {
#             'object': obj
#         })

