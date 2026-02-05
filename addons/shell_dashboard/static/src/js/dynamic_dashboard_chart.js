/** @odoo-module **/
import { loadJS } from '@web/core/assets';
import { getColor } from "@web/core/colors/colors";
import { _t } from "@web/core/l10n/translation";
import { ConfirmationDialog } from "@web/core/confirmation_dialog/confirmation_dialog";
const { Component, xml, onWillStart, useRef, onMounted, useState } = owl;
import { rpc } from "@web/core/network/rpc";

export class DashboardChart extends Component {
    state = owl.reactive({
        IsAdmin: false,
        IsManager: false,
        IsUser: false,
    });
    setup() {
        this.doAction = this.props.doAction.doAction;
        this.chartRef = useRef("chart");
        this.dialog = this.props.dialog;
        this.chart = null;
        this.state = useState({IsAdmin: false });
        this.CheckAdmin();

        onMounted(() => this.renderChart());
    }

    async CheckAdmin() {
        try {
            const data = await rpc("/api/shell_dashboard/check_access", {});

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

    async getRecords() {
        const model_name = this.props.widget.model_name;
        if (model_name) {
            await this.doAction({
                type: 'ir.actions.act_window',
                res_model: model_name,
                view_mode: 'list',
                views: [[false, "list"]],
                domain: this.props.widget.domain,
            });
        }
    }

    exportItem(ev) {
        ev.stopPropagation();
        ev.preventDefault();

        const type = $(ev.currentTarget).attr('data-type');
        const dataTitle = this.props.widget.name;

        if (!this.chart) {
            console.error("Chart is not initialized.");
            return;
        }

        if (type === 'png' || type === 'pdf') {
            this.chart.dataURI().then(({ imgURI }) => {
                if (type === 'png') {
                    const downloadLink = document.createElement('a');
                    downloadLink.href = imgURI;
                    downloadLink.download = `${dataTitle}.png`;
                    document.body.appendChild(downloadLink);
                    downloadLink.click();
                    document.body.removeChild(downloadLink);
                } else if (type === 'pdf') {
                    const pdf = new jsPDF();
                    pdf.addImage(imgURI, 'PNG', 0, 0);
                    pdf.save(`${dataTitle}.pdf`);
                }
            }).catch(error => {
                console.error("Error exporting chart:", error);
            });
        } else if (type === 'xlsx' || type === 'csv') {
            const x_axis = this.props.widget.x_axis || [];
            const y_axis = this.props.widget.y_axis || [];
            const rows = [x_axis, y_axis];

            if (type === 'xlsx') {
                // Export to XLSX
                const workbook = new ExcelJS.Workbook();
                const worksheet = workbook.addWorksheet('Chart Data');

                // Add data rows
                for (let i = 0; i < rows.length; i++) {
                    worksheet.addRow(rows[i]);
                }

                // Add chart image
                this.chart.dataURI().then(({ imgURI }) => {
                    const image = workbook.addImage({
                        base64: imgURI.split(',')[1],
                        extension: 'png',
                    });

                    // Get chart dimensions
                    const chartEl = this.chartRef.el;
                    const chartWidth = chartEl ? chartEl.offsetWidth : 500;
                    const chartHeight = chartEl ? chartEl.offsetHeight : 350;

                    worksheet.addImage(image, {
                        tl: { col: 0, row: 4 },
                        ext: { width: chartWidth, height: chartHeight }
                    });

                    // Save workbook to a file
                    workbook.xlsx.writeBuffer()
                        .then((buffer) => {
                            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                            const link = document.createElement('a');
                            link.href = window.URL.createObjectURL(blob);
                            link.setAttribute("download", `${dataTitle}.xlsx`);
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                        });
                }).catch(error => {
                    console.error("Error exporting chart to XLSX:", error);
                });
            } else if (type === 'csv') {
                // Export to CSV
                let csvContent = "data:text/csv;charset=utf-8,";
                rows.forEach(function (rowArray) {
                    let row = rowArray.join(",");
                    csvContent += row + "\r\n";
                });

                const link = document.createElement("a");
                link.setAttribute("href", encodeURI(csvContent));
                link.setAttribute("download", `${dataTitle}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        }
    }

    renderChart() {
        if (this.props.widget.graph_type) {
            const x_axis = this.props.widget.x_axis || [];
            const y_axis = this.props.widget.y_axis || [];
            const data = [];

            // Validate data length
            if (x_axis.length !== y_axis.length) {
                console.error("X axis and Y axis lengths do not match!");
                return;
            }

            // Process data
            for (let i = 0; i < x_axis.length; i++) {
                if (x_axis[i] !== undefined && y_axis[i] !== undefined && !isNaN(y_axis[i])) {
                    let key = (typeof x_axis[i] === 'object') ? x_axis[i]?.en_US ?? "null" : x_axis[i];
                    data.push({ key: key, value: y_axis[i] });
                } else {
                    console.warn(`Invalid data at index ${i}: x_axis=${x_axis[i]}, y_axis=${y_axis[i]}`);
                }
            }

            if (data.length > 0) {
                const chartType = this.props.widget.graph_type;
                let options = {
                    chart: {
                        type: chartType,
                        height: 350,
                        toolbar: {
                            show: true,
                            tools: {
                                download: false,  // We'll implement our own export
                                selection: true,
                                zoom: true,
                                zoomin: true,
                                zoomout: true,
                                pan: true,
                                reset: true
                            }
                        },
                        events: {
                            dataPointSelection: (event, chartContext, config) => {
                                // Double click handled outside this event for entire chart
                            }
                        }
                    },
                    title: {
                        text: this.props.widget.name,
                        align: 'center',
                    },
                    series: [],
                    colors: data.map((_, index) => {
                        try {
                            return getColor(index); // Use the same color helper as Chart.js version
                        } catch (e) {
                            // Fallback color array if getColor is not available
                            const colors = ['#008FFB', '#00E396', '#FEB019', '#FF4560', '#775DD0', '#546E7A', '#26a69a', '#D10CE8'];
                            return colors[index % colors.length];
                        }
                    }),
                    labels: [],
                    dataLabels: {
                        enabled: true,
                        style: {
                            colors: ['#000'],
                        },
                    },
                    responsive: [{
                        breakpoint: 768,
                        options: {
                            chart: {
                                width: "100%",
                            },
                            legend: {
                                position: "bottom",
                            },
                        },
                    }],
                };

                // Configure chart based on chart type
                if (['donut', 'pie', 'polarArea'].includes(chartType)) {
                    options.series = data.map(row => row.value);
                    options.labels = data.map(row => row.key);
                } else if (chartType === 'radar') {
                    options.series = [{
                        name: this.props.widget.measured_field || 'Data',
                        data: data.map(row => row.value),
                    }];
                    options.labels = data.map(row => row.key);
                } else {
                    options.series = [{
                        name: this.props.widget.measured_field || 'Data',
                        data: data.map(row => row.value),
                    }];
                    options.xaxis = {
                        categories: data.map(row => row.key),
                    };
                }

                if (this.chartRef && this.chartRef.el) {
                    // Clear any previous chart
                    this.chartRef.el.innerHTML = '';

                    // Create and render the chart
                    this.chart = new ApexCharts(this.chartRef.el, options);
                    this.chart.render().then(() => {
                        // Add double-click event to view records
                        this.chartRef.el.addEventListener('dblclick', (event) => {
                            event.stopPropagation();
                            this.getRecords();
                        });
                    }).catch((error) => {
                        console.error("Error rendering chart:", error);
                    });
                } else {
                    console.error("Chart element is not initialized.");
                }
            } else {
                console.error("Data is empty or invalid.");
            }
        }
    }

    async getConfiguration(ev) {
        ev.stopPropagation();
        ev.preventDefault();
        var id = this.props.widget.id;
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

DashboardChart.template = xml`
    <div class="resize-drag block card item"
        t-att-data-x="this.props.widget.data_x"
        t-att-data-y="this.props.widget.data_y"
        t-att-style="'height:'+this.props.widget.height+'; width:'+ this.props.widget.width+ '; transform: translate('+ this.props.widget.translate_x +', '+ this.props.widget.translate_y +'); background-color: white !important;'"
        t-att-data-id="this.props.widget.id">
        <div class="card-body mt-1" id="in_ex_body_hide">
            <div t-att-class="(this.state.IsAdmin ? '' : 'd-none')">
                <div class="block_edit block_setting" t-on-click="(ev) => this.getConfiguration(ev)">
                    <i title="Configuration" class="fa fa-pencil block_setting chart-edit"/>
                </div>

                <div class="block_edit block_image" data-type="png" t-on-click="(ev) => this.exportItem(ev)">
                    <i title="Save As Image" class="bi bi-image block_image chart-image"/>
                </div>

                <div class="block_edit block_pdf" data-type="pdf" t-on-click="(ev) => this.exportItem(ev)">
                    <i title="Export to PDF" class="bi bi-file-earmark-pdf block_pdf chart-pdf"/>
                </div>

                <div class="block_edit block_csv" t-att-data-id="this.props.widget.id" data-type="csv" t-on-click="(ev) => this.exportItem(ev)">
                    <i title="Export to CSV" class="bi bi-filetype-csv block_csv chart-csv"/>
                </div>

                <div class="block_edit block_xlsx" t-att-data-id="this.props.widget.id" data-type="xlsx" t-on-click="(ev) => this.exportItem(ev)">
                    <i title="Export to XLSX" class="fa fa-file-excel-o block_xlsx chart-xlsx"/>
                </div>

                <div class="block_edit block_delete" t-on-click="(ev) => this.removeTile(ev)">
                    <i title="Delete" class="fa fa-times block_delete chart-delete"/>
                </div>
            </div>

            <div t-ref="chart" id="chartCanvas" data-title="this.props.widget.name" style="height:90%; width:100%;display: flex;justify-content: center;align-items: center;"/>
        </div>
    </div>
`;