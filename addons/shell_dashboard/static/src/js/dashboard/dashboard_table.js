/** @odoo-module **/
import { Component } from "@odoo/owl";
import { useService } from "@web/core/utils/hooks";

export class DashboardTable extends Component {
    static template = "shell_dashboard.Table";
    
    setup() {
        super.setup();
        this.action = useService("action");
        this.dialog = useService("dialog");
        this.notification = useService("notification");
        this.orm = useService("orm");
    }
    
    async configureBlock() {
        try {
            await this.action.doAction({
                type: 'ir.actions.act_window',
                res_model: 'dashboard.block',
                res_id: this.props.block.id,
                view_mode: 'form',
                views: [[false, 'form']],
                target: 'current'
            });
        } catch (error) {
            console.error("Error configuring block:", error);
            this.notification.add("Failed to configure block", { type: "danger" });
        }
    }
    
    async deleteBlock() {
        try {
            const confirmed = await this.dialog.confirm("Are you sure you want to delete this table?", {
                title: "Confirm Deletion"
            });
            
            if (confirmed) {
                await this.orm.unlink("dashboard.block", [this.props.block.id]);
                this.notification.add("Table deleted successfully", { type: "success" });
                this.env.bus.trigger('dashboard:refresh');
            }
        } catch (error) {
            console.error("Error deleting table:", error);
            this.notification.add("Failed to delete table", { type: "danger" });
        }
    }
    
    async openRecord(row) {
        if (!this.props.block.model_name || !row.id) return;
        
        try {
            await this.action.doAction({
                type: 'ir.actions.act_window',
                res_model: this.props.block.model_name,
                res_id: row.id,
                view_mode: 'form',
                views: [[false, 'form']],
                target: 'current'
            });
        } catch (error) {
            console.error("Error opening record:", error);
        }
    }
}

registry.category("actions").add("shell_dashboard.action", DashboardTable);