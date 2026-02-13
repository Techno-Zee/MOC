/** @odoo-module **/
import { Component } from "@odoo/owl";
import { useService } from "@web/core/utils/hooks";
import { ConfirmationDialog } from "@web/core/confirmation_dialog/confirmation_dialog";

export class DashboardTile extends Component {
    static template = "shell_dashboard.Tile";

    setup() {
        super.setup();
        this.action = useService("action");
        this.dialog = useService("dialog");
        this.notification = useService("notification");
        this.orm = useService("orm");
    }

    getTrendClass(trendDirection) {
        switch (trendDirection) {
            case 'up': return 'bg-success';
            case 'down': return 'bg-danger';
            default: return 'bg-secondary';
        }
    }

    getTrendIcon(trendDirection) {
        switch (trendDirection) {
            case 'up': return 'fa fa-arrow-up me-1';
            case 'down': return 'fa fa-arrow-down me-1';
            default: return 'fa fa-minus me-1';
        }
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
            const confirmed = await new Promise((resolve) => {
                this.dialog.add(ConfirmationDialog, {
                    title: "Confirm Deletion",
                    body: "Are you sure you want to delete this block?",
                    confirm: () => resolve(true),
                    cancel: () => resolve(false),
                });
            });

            if (confirmed) {
                await this.orm.unlink("dashboard.block", [this.props.block.id]);
                this.notification.add("Block deleted successfully", { type: "success" });
                // Trigger dashboard refresh
                this.env.bus.trigger('dashboard:refresh');
            }
        } catch (error) {
            console.error("Error deleting block:", error);
            this.notification.add("Failed to delete block", { type: "danger" });
        }
    }

    async openRecords() {
        if (!this.props.block.model_name) return;

        try {
            await this.action.doAction({
                type: 'ir.actions.act_window',
                res_model: this.props.block.model_name,
                view_mode: 'list,form',
                views: [[false, 'list'], [false, 'form']],
                domain: this.props.block.domain || [],
                context: {}
            });
        } catch (error) {
            console.error("Error opening records:", error);
            this.notification.add("Failed to open records", { type: "danger" });
        }
    }
}
