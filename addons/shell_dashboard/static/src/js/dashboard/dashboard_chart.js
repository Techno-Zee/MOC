/** @odoo-module **/
import { Component, useRef, onMounted, onWillUnmount } from "@odoo/owl";
import { useService } from "@web/core/utils/hooks";

export class DashboardChart extends Component {
    static template = "shell_dashboard.Chart";

    setup() {
        super.setup();
        this.action = useService("action");
        this.dialog = useService("dialog");
        this.notification = useService("notification");
        this.orm = useService("orm");

        // Chart reference
        this.chartCanvas = useRef("chartCanvas");
        this.chartContainer = useRef("chartContainer");
        this.chart = null;

        // Initialize chart after mount
        onMounted(() => {
            this.initializeChart();
            this.setupResizeObserver();
        });

        // Cleanup chart
        onWillUnmount(() => {
            if (this.resizeObserver) {
                this.resizeObserver.disconnect();
            }
            if (this.chart) {
                this.chart.destroy();
            }
        });
    }

    setupResizeObserver() {
        if (!window.ResizeObserver) return;

        const container = this.chartContainer.el;
        if (!container) return;

        this.resizeObserver = new ResizeObserver(() => {
            if (this.chart) {
                this.chart.resize();
            }
        });
        this.resizeObserver.observe(container);
    }

    initializeChart() {
        if (!window.Chart || !this.chartCanvas.el) return;

        const ctx = this.chartCanvas.el.getContext('2d');
        const block = this.props.block;
        console.log('block :', block);

        // Prepare chart data
        const chartData = {
            labels: block.data.labels || [],
            datasets: [{
                label: block.name,
                data: block.data.datasets?.[0]?.data || [],
                backgroundColor: this.getChartColors(block.data.labels?.length || 0),
                borderColor: block.type === 'line' || block.type === 'radar'
                    ? this.getChartColors(1, true)
                    : undefined,
                borderWidth: 2,
                fill: block.type === 'radar'
            }]
        };

        // Chart configuration
        const config = {
            type: block.config.chart_type || 'bar',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                return `${context.dataset.label}: ${context.raw}`;
                            }
                        }
                    }
                },
                scales: block.type !== 'pie' && block.type !== 'donut' ? {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function (value) {
                                if (value >= 1000) {
                                    return (value / 1000).toFixed(1) + 'K';
                                }
                                return value;
                            }
                        }
                    }
                } : {}
            }
        };

        // Create chart
        if (this.chart) {
            this.chart.destroy();
        }

        this.chart = new Chart(ctx, config);
    }

    getChartColors(count, border = false) {
        const colors = [
            '#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6',
            '#1abc9c', '#d35400', '#34495e', '#7f8c8d', '#27ae60'
        ];

        if (border) {
            return colors.map(color => color.replace('rgb', 'rgba').replace(')', ', 0.8)'));
        }

        if (count === 1) return [colors[0]];

        const result = [];
        for (let i = 0; i < count; i++) {
            result.push(colors[i % colors.length]);
        }
        return result;
    }

    getChartColor(index) {
        const colors = this.getChartColors(index + 1);
        return colors[index];
    }

    formatDate(dateString) {
        if (!dateString) return "N/A";
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
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

    async exportChart(format) {
        console.log('exportChart called with', format);
        if (!this.chart) return;

        try {
            const canvas = this.chartCanvas.el;

            if (format === 'png') {
                const link = document.createElement('a');
                link.download = `${this.props.block.name}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();

            } else if (format === 'pdf') {
                const { jsPDF } = window.jspdf;
                const pdf = new jsPDF('landscape');
                const imgData = canvas.toDataURL('image/png');
                pdf.addImage(imgData, 'PNG', 10, 10, 280, 150);
                pdf.save(`${this.props.block.name}.pdf`);

            } else if (format === 'csv') {
                const block = this.props.block;
                let csvContent = "data:text/csv;charset=utf-8,";

                // Add headers
                csvContent += "Label,Value\n";

                // Add data
                block.data.labels?.forEach((label, index) => {
                    const value = block.data.datasets?.[0]?.data?.[index] || 0;
                    csvContent += `"${label}",${value}\n`;
                });

                const link = document.createElement('a');
                link.href = encodeURI(csvContent);
                link.download = `${this.props.block.name}.csv`;
                link.click();
            }

            this.notification.add(`Exported as ${format.toUpperCase()}`, { type: "success" });

        } catch (error) {
            console.error("Error exporting chart:", error);
            this.notification.add("Failed to export chart", { type: "danger" });
        }
    }

    async deleteBlock() {
        try {
            const confirmed = await this.dialog.confirm("Are you sure you want to delete this chart?", {
                title: "Confirm Deletion"
            });

            if (confirmed) {
                await this.orm.unlink("dashboard.block", [this.props.block.id]);
                this.notification.add("Chart deleted successfully", { type: "success" });
                this.env.bus.trigger('dashboard:refresh');
            }
        } catch (error) {
            console.error("Error deleting chart:", error);
            this.notification.add("Failed to delete chart", { type: "danger" });
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
