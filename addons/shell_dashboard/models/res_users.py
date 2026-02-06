from odoo import models, api

class ResUsers(models.Model):
    _inherit = "res.users"

    @api.model
    def get_shell_dashboard_roles(self):
        user = self.env.user
        return {
            "is_admin": user.has_group("shell_dashboard.group_dashboard_admin"),
            "is_manager": user.has_group("shell_dashboard.group_dashboard_manager"),
            "is_user": user.has_group("shell_dashboard.group_dashboard_user"),
        }
