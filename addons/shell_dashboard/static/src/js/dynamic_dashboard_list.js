/** @odoo-module **/
import { _t } from "@web/core/l10n/translation";
import { ConfirmationDialog } from "@web/core/confirmation_dialog/confirmation_dialog";
import { Component, xml, onWillStart, onMounted, useRef } from "@odoo/owl";

export class DashboardTable extends Component {
    setup() {
        this.doAction = this.props.doAction.doAction;
        this.dialog = this.props.dialog;
        this.tableRef = useRef('table');
        this.tableHeaders = [];
        this.tableRows = [];

        onWillStart(async () => {
            await this.fetchAndParseData();
        });

        onMounted(() => {
            this.updateTable();
        });
    }

    parseModelFieldReference(ref) {
        const match = ref.match(/ir\.model\.fields\((\d+),\s*(\d+)\)/i); // Menyesuaikan pola
        if (match) {
            return {
                model_id: parseInt(match[1]),
                field_id: parseInt(match[2])
            };
        }
        return null;
    }


    async fetchFieldData() {
        const modelTag = this.props.widget.model_tag;
        console.log('Fetching field data for:', modelTag);

        if (typeof modelTag !== 'string') {
            console.warn('model_tag is not a string:', modelTag);
            return null;
        }

        const fieldRef = this.parseModelFieldReference(modelTag);
        if (!fieldRef) {
            console.warn('Could not parse field reference:', modelTag);
            return null;
        }

        const fieldDef = await this.props.orm.read(
            fieldRef.model,
            [fieldRef.id],
            ['name', 'model_id', 'ttype', 'relation']
        );

        if (!fieldDef || !fieldDef.length) {
            console.warn('Field definition not found');
            return null;
        }

        const field = fieldDef[0];
        console.log('Field definition:', field);

        if (this.props.widget.model_name) {
            const domain = this.props.widget.domain || [];
            const records = await this.props.orm.searchRead(
                this.props.widget.model_name,
                domain,
                [field.name]
            );
            console.log('Fetched records:', records);
            return records;
        }

        return null;
    }

    parseData(data) {
        console.log('Parsing data:', data);

        if (!data) {
            return {
                headers: ['No Data'],
                rows: [['No records found']]
            };
        }

        if (Array.isArray(data)) {
            if (data.length === 0) {
                return {
                    headers: ['No Data'],
                    rows: [['No records found']]
                };
            }

            const headers = [...new Set(data.flatMap(obj => Object.keys(obj)))];
            const rows = data.map(record =>
                headers.map(header => {
                    const value = record[header];
                    return value !== undefined && value !== null ? value : '';
                })
            );

            return { headers, rows };
        }

        if (typeof data === 'object' && data !== null) {
            return {
                headers: Object.keys(data),
                rows: [Object.values(data)]
            };
        }

        return {
            headers: ['Value'],
            rows: [[data.toString()]]
        };
    }

    async fetchAndParseData() {
        try {
            console.log('Widget props:', this.props.widget);
            const data = await this.fetchFieldData();
            console.log('Fetched data:', data);

            const { headers, rows } = this.parseData(data);
            this.tableHeaders = headers;
            this.tableRows = rows;
        } catch (error) {
            console.error('Error fetching data:', error);
            this.tableHeaders = ['Error'];
            this.tableRows = [['Unable to display data. Please check configuration.']];
        }
    }

    updateTable() {
        if (!this.tableRef.el) {
            console.warn('Table reference not found - will try again on next render');
            return;
        }

        const thead = this.tableRef.el.querySelector('thead');
        const tbody = this.tableRef.el.querySelector('tbody');

        if (!thead || !tbody) {
            console.warn('Table structure elements not found');
            return;
        }

        console.log('Updating table with:', {
            headers: this.tableHeaders,
            rows: this.tableRows
        });

        const headersHtml = this.tableHeaders
            .map(header => `<th class="text-center text-dark fw-bold">${this.escapeHtml(header)}</th>`)
            .join('');

        const rowsHtml = this.tableRows
            .map(row => {
                const cells = row
                    .map(cell => `<td class="text-center text-dark">${this.escapeHtml(cell)}</td>`)
                    .join('');
                return `<tr>${cells}</tr>`;
            })
            .join('');

        thead.innerHTML = `<tr>${headersHtml}</tr>`;
        tbody.innerHTML = rowsHtml;
    }

    escapeHtml(unsafe) {
        if (unsafe === null || unsafe === undefined) return '';
        return unsafe
            .toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    async getConfiguration(ev) {
        ev.stopPropagation();
        ev.preventDefault();
        const id = this.props.widget.id;
        await this.doAction({
            type: 'ir.actions.act_window',
            res_model: 'dashboard.block',
            res_id: id,
            view_mode: 'form',
            views: [[false, "form"]]
        });
    }

    async removeTile(ev) {
        ev.stopPropagation();
        ev.preventDefault();
        this.dialog.add(ConfirmationDialog, {
            title: _t("Delete Confirmation"),
            body: _t("Are you sure you want to delete this item?"),
            confirmLabel: _t("YES, I'M SURE"),
            cancelLabel: _t("NO, GO BACK"),
            confirm: async () => {
                await this.props.orm.unlink("dashboard.block", [this.props.widget.id]);
                location.reload();
            },
            cancel: () => { },
        });
    }
}

DashboardTable.template = xml`
    <div class="resize-drag block card"
        t-att-data-x="props.widget.data_x"
        t-att-data-y="props.widget.data_y"
        t-att-style="'height:'+props.widget.height+'; width:'+ props.widget.width+ '; transform: translate('+ props.widget.translate_x +', '+ props.widget.translate_y +'); background-color: white !important;'"
        t-att-data-id="props.widget.id">
            <h6 class="card-title text-dark fw-bold" style="width: 80%; margin-left: 10%">
                <t t-esc="props.widget.name"/>
            </h6>
        <div class="card-body mt-1" id="in_ex_body_hide">
            <div class="block_edit block_setting" t-on-click="getConfiguration">
                <i title="Configuration" class="fa fa-pencil block_setting table-edit"/>
            </div>

            <div class="block_edit block_delete" t-on-click="removeTile">
                <i title="Delete" class="fa fa-times block_delete table-delete"/>
            </div>

            <div class="table-responsive">
                <table class="table table-bordered table-hover" t-ref="table">
                    <thead></thead>
                    <tbody></tbody>
                </table>
            </div>

        </div>
    </div>
`;
