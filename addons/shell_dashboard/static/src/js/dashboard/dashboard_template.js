/** @odoo-module **/
import { registry } from "@web/core/registry";
import { Component, useRef, onMounted, onWillUnmount, useState } from "@odoo/owl";
import { useService } from "@web/core/utils/hooks";
import { DashboardTile } from './dashboard_tile';
import { DashboardChart } from './dashboard_chart';
import { DashboardTable } from './dashboard_table';
import { DashboardKPI } from './dashboard_kpi';
import { session } from "@web/session";
import { mount } from "@odoo/owl";

export class ShellDashboard extends Component {
    static template = "shell_dashboard.Dashboard";

    setup() {
        super.setup();

        // Services
        this.action = useService("action");
        this.orm = useService("orm");
        this.dialog = useService("dialog");
        this.notification = useService("notification");

        // Refs
        this.gridContainer = useRef("gridContainer");

        // State
        this.state = useState({
            loading: false,
            editMode: false,
            autoRefresh: false,
            refreshCountdown: 30,
            showDatePicker: false,
            startDate: null,
            endDate: null,
            Name: session.partner_display_name,
            IsAdmin: false,
            IsManager: false,
            IsUser: false,
            blocks: []
        });

        //LoadRoles
        this.loadRoles();

        // Gridstack instance
        this.grid = null;
        this.refreshInterval = null;
        this.countdownInterval = null;

        // Initialize after mount
        onMounted(async () => {
            await this.initializeDashboard();
            this.setupEventListeners();
        });

        // Cleanup
        onWillUnmount(() => {
            this.clearIntervals();
            if (this.grid) {
                this.grid.destroy(false);
            }
        });
    }

    async loadRoles() {
        const res = await this.orm.call(
            "res.users",
            "get_shell_dashboard_roles",
            [],
        );

        this.state.IsAdmin = res.is_admin;
        this.state.IsManager = res.is_manager;
        this.state.IsUser = res.is_user;
    }

    async initializeDashboard() {
        this.state.loading = true;
        try {
            // Fetch blocks from backend
            const blocks = await this.orm.call(
                "dashboard.block",
                "get_dashboard_vals",
                [this.props.actionId]
            );

            this.state.blocks = blocks;

            // Initialize grid after a small delay to ensure DOM is ready
            setTimeout(() => this.initializeGridStack(), 100);

        } catch (error) {
            console.error("Error initializing dashboard:", error);
            this.notification.add("Failed to load dashboard", { type: "danger" });
        } finally {
            this.state.loading = false;
        }
    }

    initializeGridStack() {
        if (!window.GridStack || !this.gridContainer.el) return;

        // Destroy existing grid
        if (this.grid) {
            this.grid.destroy(false);
        }

        // Initialize GridStack
        this.grid = GridStack.init({
            float: true,
            cellHeight: 100,
            margin: 10,
            resizable: {
                handles: 'e, se, s, sw, w'
            },
            draggable: {
                handle: '.grid-stack-item-content'
            },
            animate: true,
            disableOneColumnMode: true,
            acceptWidgets: false
        }, this.gridContainer.el);

        // Load saved positions
        this.grid.load(this.state.blocks.map(block => ({
            id: block.id.toString(),
            x: block.grid_position.x,
            y: block.grid_position.y,
            w: block.grid_position.w,
            h: block.grid_position.h,
            content: this.getBlockContent(block)
        })));

        // Listen for grid changes
        this.grid.on('change', (event, items) => {
            if (this.state.editMode) {
                this.saveLayout();
            }
        });
    }

    getBlockContent(block) {
        // This method creates the appropriate OWL component for each block type
        let ComponentClass;
        switch (block.type) {
            case 'tile':
                ComponentClass = DashboardTile;
                break;
            case 'graph':
                ComponentClass = DashboardChart;
                break;
            case 'list':
                ComponentClass = DashboardTable;
                break;
            case 'kpi':
                ComponentClass = DashboardKPI;
                break;
            default:
                console.warn(`Unknown block type: ${block.type}`);
                return '<div class="alert alert-warning">Unknown block type</div>';
        }

        // Create a container for the component
        const container = document.createElement('div');

        // Mount the OWL component
        mount(ComponentClass, {
            target: container,
            env: this.env,
            props: {
                block: block,
                isEditable: this.state.IsAdmin || this.state.IsManager,
            },
        });

        return container.innerHTML;
    }

    toggleEditMode() {
        this.state.editMode = !this.state.editMode;

        if (this.state.editMode) {
            this.grid.enableMove(true);
            this.grid.enableResize(true);
            this.notification.add("Edit mode enabled. Drag and resize blocks.", { type: "info" });
        } else {
            this.grid.enableMove(false);
            this.grid.enableResize(false);
            this.saveLayout();
        }
    }

    async saveLayout() {
        if (!this.grid) return;

        const layout = this.grid.save();
        const layoutData = layout.map(item => ({
            id: parseInt(item.id),
            x: item.x,
            y: item.y,
            w: item.w,
            h: item.h
        }));

        try {
            await this.orm.call(
                "dashboard.block",
                "get_save_layout",
                [layoutData]
            );
            this.notification.add("Layout saved successfully", { type: "success" });
        } catch (error) {
            console.error("Error saving layout:", error);
            this.notification.add("Failed to save layout", { type: "danger" });
        }
    }

    onClickAddItem = (type, chartType = null) => {
        const context = {
            'default_type': type,
            'default_name': `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
            'default_client_action_id': parseInt(this.props.actionId),
        };

        // Set defaults based on type
        switch (type) {
            case 'tile':
                context.default_height = '180px';
                context.default_width = '300px';
                context.default_fa_icon = 'fa fa-cube';
                break;
            case 'kpi':
                context.default_height = '200px';
                context.default_width = '300px';
                context.default_fa_icon = 'fa fa-chart-line';
                break;
            case 'graph':
                context.default_height = '350px';
                context.default_width = '400px';
                context.default_graph_type = chartType || 'bar';
                context.default_fa_icon = `fa fa-${chartType}-chart`;
                break;
            case 'list':
                context.default_height = '400px';
                context.default_width = '600px';
                context.default_fa_icon = 'fa fa-table';
                break;
        }

        this.action.doAction({
            type: 'ir.actions.act_window',
            res_model: 'dashboard.block',
            views: [[false, 'form']],
            target: 'new',
            context: {
                ...context,
                default_name: "",
            },
        });

    }

    toggleDatePicker() {
        this.state.showDatePicker = !this.state.showDatePicker;
    }

    getDateRangeText() {
        if (!this.state.startDate && !this.state.endDate) {
            return "Select Date Range";
        }

        const formatDate = (dateStr) => {
            if (!dateStr) return "";
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        };

        const start = formatDate(this.state.startDate);
        const end = formatDate(this.state.endDate);

        return `${start} ${start && end ? ' - ' : ''}${end}`;
    }

    async applyDateFilter() {
        this.state.showDatePicker = false;
        this.state.loading = true;

        try {
            const blocks = await this.orm.call(
                "dashboard.block",
                "get_dashboard_vals",
                [this.props.actionId, this.state.startDate, this.state.endDate]
            );

            this.state.blocks = blocks;
            this.initializeGridStack();
            this.notification.add("Date filter applied", { type: "success" });

        } catch (error) {
            console.error("Error applying date filter:", error);
            this.notification.add("Failed to apply date filter", { type: "danger" });
        } finally {
            this.state.loading = false;
        }
    }

    resetDateFilter() {
        this.state.startDate = null;
        this.state.endDate = null;
        this.state.showDatePicker = false;
        this.initializeDashboard();
    }

    toggleAutoRefresh() {
        this.state.autoRefresh = !this.state.autoRefresh;

        if (this.state.autoRefresh) {
            this.startAutoRefresh();
        } else {
            this.stopAutoRefresh();
        }
    }

    startAutoRefresh() {
        this.state.refreshCountdown = 30;

        this.countdownInterval = setInterval(() => {
            this.state.refreshCountdown--;

            if (this.state.refreshCountdown <= 0) {
                this.refreshDashboard();
                this.state.refreshCountdown = 30;
            }
        }, 1000);
    }

    stopAutoRefresh() {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }
    }

    async refreshDashboard() {
        this.state.loading = true;
        try {
            await this.initializeDashboard();
            this.notification.add("Dashboard refreshed", { type: "success" });
        } catch (error) {
            console.error("Error refreshing dashboard:", error);
        } finally {
            this.state.loading = false;
        }
    }

    clearIntervals() {
        this.stopAutoRefresh();
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    setupEventListeners() {
        // Close date picker when clicking outside
        document.addEventListener('click', (event) => {
            if (this.state.showDatePicker &&
                !event.target.closest('.date-filter-container')) {
                this.state.showDatePicker = false;
            }
        });
    }

    async exportAsPDF() {
        try {
            const element = this.gridContainer.el;
            const opt = {
                margin: 10,
                filename: 'dashboard.pdf',
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: { unit: 'mm', format: 'a3', orientation: 'portrait' }
            };

            html2pdf().from(element).set(opt).save();

        } catch (error) {
            console.error("Error exporting PDF:", error);
            this.notification.add("Failed to export PDF", { type: "danger" });
        }
    }

    async exportAsPNG() {
        try {
            const element = this.gridContainer.el;
            const canvas = await html2canvas(element, { scale: 2 });
            const link = document.createElement('a');
            link.download = 'dashboard.png';
            link.href = canvas.toDataURL('image/png');
            link.click();

        } catch (error) {
            console.error("Error exporting PNG:", error);
            this.notification.add("Failed to export PNG", { type: "danger" });
        }
    }

    async exportAsCSV() {
        try {
            // Collect all data from blocks
            let csvData = [];

            this.state.blocks.forEach(block => {
                if (block.type === 'list' && block.data.rows) {
                    // Add block name as header
                    csvData.push([`Block: ${block.name}`]);

                    // Add table headers
                    if (block.data.columns) {
                        csvData.push(block.data.columns);
                    }

                    // Add table rows
                    block.data.rows.forEach(row => {
                        csvData.push(row);
                    });

                    csvData.push([]); // Empty row between blocks
                }
            });

            // Convert to CSV string
            const csvContent = csvData.map(row =>
                row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
            ).join('\n');

            // Download CSV
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'dashboard_data.csv';
            link.click();

        } catch (error) {
            console.error("Error exporting CSV:", error);
            this.notification.add("Failed to export CSV", { type: "danger" });
        }
    }
}

// Register the dashboard action
registry.category("actions").add("shell_dashboard.action", ShellDashboard);