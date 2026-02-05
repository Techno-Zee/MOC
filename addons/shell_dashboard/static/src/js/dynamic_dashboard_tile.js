/** @odoo-module **/
import { ConfirmationDialog } from "@web/core/confirmation_dialog/confirmation_dialog";
import { _t } from "@web/core/l10n/translation";
import { Component, xml, useState } from "@odoo/owl";
import { rpc } from "@web/core/network/rpc";

export class DashboardTile extends Component {
    // Access declaration
    state = owl.reactive({
        IsAdmin: false,
        IsManager: false,
        IsUser: false,
    });
    // Setup function of the class DashboardTile
    setup() {
        this.doAction = this.props.doAction.doAction;
        this.dialog = this.props.dialog;
        this.orm = this.props.orm;
        this.props.widget.value = new Int32Array([parseInt(this.props.widget.value, 10)]);
        this.state = useState({IsAdmin: false});
        this.CheckAdmin();
    }
    async CheckAdmin() {
        try {
            const data = await rpc("/api/shell_dashboard/check_access", {});
            // data: { is_user: true/false, is_manager: true/false, is_admin: true/false }

            // Simpan status ke state
            this.state.IsAdmin = data.is_admin;
            this.state.IsManager = data.is_manager;
            this.state.IsUser = data.is_user;

            // Batasi fitur edit hanya untuk admin & manager
            if (!(this.state.IsAdmin || this.state.IsManager)) {
                console.warn("Akses dibatasi: hanya admin dan manager yang dapat mengubah data.");
            }

        } catch (error) {
            console.error("Gagal mengecek akses admin:", error);
        }
    }

    // Function to get the configuration of the tile
    async getConfiguration(ev){
        ev.stopPropagation();
        ev.preventDefault();
        var id = this.props.widget.id
        await this.doAction({
              type: 'ir.actions.act_window',
              res_model: 'dashboard.block',
              res_id: id,
              view_mode: 'form',
              views: [[false, "form"]]
          });
    }
    // Function to remove the tile
    async removeTile(ev){
        ev.stopPropagation();
        ev.preventDefault();
        this.dialog.add(ConfirmationDialog, {
            title: _t("Delete Confirmation"),
            body: _t("Are you sure you want to delete this item?"),
            confirmLabel: _t("YES, I'M SURE"),
            cancelLabel: _t("NO, GO BACK"),
            confirm: async () => {
                await this.orm.unlink("dashboard.block", [this.props.widget.id]);
                location.reload();
            },
            cancel: () => {},
        });
    }
    // Function for getting records by double click
    async getRecords(){
        var model_name = this.props.widget.model_name;
        if (model_name){
            await this.doAction({
              type: 'ir.actions.act_window',
              res_model: model_name,
              view_mode: 'list',
              views: [[false, "list"]],
              domain: this.props.widget.domain,
          });
        }
    }
}
DashboardTile.template = xml`
<div class="resize-drag dashboard-tile shadow grid-stack-item"
         t-on-dblclick="getRecords"
         t-att-data-id="this.props.widget.id"
         t-att-style="this.props.widget.color+this.props.widget.text_color+ '; height:' + this.props.widget.height + '; width:' + this.props.widget.width + '; min-height:110px;'">
       
    <div class="grid-stack-item-content" t-att-style="this.props.widget.color+this.props.widget.text_color+'; height: 100%;'">
        <div t-att-class="'justify-content-between ' + (this.state.IsAdmin ? 'd-flex' : 'd-none')">
            <!-- Edit and Delete Icons -->
            <a class="block_setting tile_edit tile-container__setting-icon" style="color:black;" t-on-click="(ev) => this.getConfiguration(ev)">
                <i class="fa fa-edit"></i>
            </a>
            <a class="block_delete tile_edit tile-container__delete-icon" style="color:black;" t-on-click="(ev) => this.removeTile(ev)">
                <i class="fa fa-times"></i>
            </a>
        </div>

        <div class="d-flex flex-row-reverse justify-content-between align-items-center container" style="height: 100%;">
            <!-- Tile Icon -->
            <div class="auto-icon">
                <div t-att-style="this.props.widget.icon_color"
                    class="tile-container__icon-container bg-white d-flex justify-content-center align-items-center">
                    <i t-att-class="this.props.widget.icon" style="color:#6789c6;"></i>
                </div>
            </div>
            
            <!-- Tile Content -->
            <div t-att-style="this.props.widget.text_color"
                class="tile-container__status-container">
                <!-- Figures -->
                <div class="status-container__figures d-flex flex-wrap align-items-baseline">
                    <h3 class="mb-0 mb-md-1 mb-lg-0 mr-1"
                        t-att-style="this.props.widget.val_color">
                        <t t-esc="this.props.widget.value" />
                    </h3>
                </div>
                
                <!-- Title -->
                <h2 t-att-style="this.props.widget.text_color"
                    class="status-container__title">
                    <!-- Modify title structure -->
                    <span t-esc="this.props.widget.name"
                        class="d-block font-weight-bold text-start"
                        style="font-size: 1.2rem;"></span>
                </h2>
                
            </div>
        </div>
    </div>
</div>
`
