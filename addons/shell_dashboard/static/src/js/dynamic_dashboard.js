/** @odoo-module **/
import { registry } from "@web/core/registry";
import { DashboardTile } from './dynamic_dashboard_tile';
import { DashboardChart } from './dynamic_dashboard_chart';
import { DashboardTable } from "./dynamic_dashboard_list";
import { useService } from "@web/core/utils/hooks";
import { Component, useRef, mount, onWillStart, onMounted, useState } from "@odoo/owl";
import { rpc } from "@web/core/network/rpc";

export class OdooDashboard extends Component {
    state = owl.reactive({
        IsAdmin: false,
        IsManager: false,
        IsUser: false,
    });
    // Setup function to run when the template of the class OdooDashboard renders
    setup() {
        this.action = useService("action");
        this.orm = useService("orm");
        this.dialog = useService("dialog");
        this.actionId = this.props.actionId
        this.rpc = rpc;
        this.state = useState({
            IsAdmin: false,
            labels: [],
            datasets: [],
            hasData: true,
            startDate2: null,
            endDate2: null,
        });
        // Panggil CheckAdmin sebelum render
        this.CheckAdmin();
        this.refreshInterval = null;
        this.countdownInterval = null;
        this.countdownTime = 10;
        this.isCountingDown = false;
        onMounted(() => {
            this._attachEventListeners();
            this.renderDashboard();
        })
    }

    async CheckAdmin() {
        try {
            const data = await rpc("/api/shell_dashboard/check_access", {});
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

    _attachEventListeners() {
        const timerButton = document.getElementById("timerButton");
        this.dateFilter();
        this.updateDateRangeText();

        if (timerButton) {
            timerButton.addEventListener("click", this.toggleCountdown.bind(this));
        } else {
            console.error("Timer button element not found");
        }

        const datePickerButton = document.getElementById("datePickerButton");
        const datePickerContainer = document.getElementById("datePickerContainer");

        if (datePickerButton && datePickerContainer) {
            datePickerButton.addEventListener("click", (event) => {
                event.stopPropagation(); // Prevent event from bubbling up
                // Toggle the display property
                datePickerContainer.style.display = datePickerContainer.style.display === "flex" ? "none" : "flex";
            });
        } else {
            console.error("Date picker button or container element not found");
        }

        // Close the date picker if clicking outside of it
        document.addEventListener("click", (event) => {
            if (
                datePickerContainer &&
                !datePickerContainer.contains(event.target) &&
                !datePickerButton.contains(event.target)
            ) {
                datePickerContainer.style.display = "none";
            }
        });

    }

    toggleCountdown() {
        if (this.isCountingDown) {
            // Jika sedang countdown, hentikan
            this.clearIntervals();
            document.getElementById("timerCountdown").textContent = "";
            const clockElement = document.getElementById("timerIcon");
            if (clockElement) {
                clockElement.classList.add("bi", "bi-clock");
            }
        } else {
            // Jika tidak sedang countdown, mulai baru
            this.isCountingDown = true; // Set flag sebelum memulai countdown
            this.startCountdown();
            const clockElement = document.getElementById("timerIcon");
            if (clockElement) {
                clockElement.classList.remove("bi", "bi-clock");
            }
        }
    }

    clearIntervals() {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
        this.countdownTime = 10; // Reset countdown time
        this.isCountingDown = false; // Reset flag
    }

    startCountdown() {
        // Reset dan inisialisasi ulang
        this.countdownTime = 10;
        this.clearIntervals();  // Bersihkan interval yang mungkin masih berjalan
        this.updateCountdownDisplay();

        // Mulai interval baru
        this.countdownInterval = setInterval(() => {
            this.countdownTime--;

            if (this.countdownTime < 0) {
                this.countdownTime = 10;
                if (this.state.startDate && this.state.endDate) {
                    console.log("dates state: ", this.state.startDate, "& ", this.state.endDate);
                    const startDate = this.state.startDate;
                    const endDate = this.state.endDate;
                    console.log("dates: ", startDate, "& ", endDate);
                    this.UpdatedDashboard(startDate, endDate);
                } else {
                    const today = new Date();
                    const startDate = new Date(today.getFullYear(), today.getMonth(), 1); // Awal bulan ini
                    const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0); // Akhir bulan ini

                    this.UpdatedDashboard(startDate, endDate);
                }
            }

            this.updateCountdownDisplay();
        }, 1000);

        // Set flag bahwa countdown sedang berjalan
        this.isCountingDown = true;
    }

    UpdatedDashboard(start_date, end_date) {
        $(".items").empty();
        var self = this;
        this.orm.call("dashboard.block", "get_dashboard_vals", [[], this.actionId, start_date, end_date]).then(function (response) {
            for (let i = 0; i < response.length; i++) {
                if (response[i].type === 'tile') {
                    mount(DashboardTile, $('.items')[0], {
                        props: {
                            widget: response[i], doAction: self.action, dialog: self.dialog, orm: self.orm
                        }
                    });
                }
                else if (response[i].type === 'list') {
                    mount(DashboardTable, $('.items')[0], {
                        props: {
                            widget: response[i], doAction: self.action, rpc: self.rpc, dialog: self.dialog, orm: self.orm
                        }
                    });
                }
                else {
                    mount(DashboardChart, $('.items')[0], {
                        props: {
                            widget: response[i], doAction: self.action, rpc: self.rpc, dialog: self.dialog, orm: self.orm
                        }
                    });
                }
            }
        })
    }

    updateCountdownDisplay() {
        const countdownElement = document.getElementById("timerCountdown");
        const timerIcon = document.getElementById("timerIcon");

        if (countdownElement) {
            countdownElement.textContent = this.countdownTime;
        }
    }

    updateDateRangeText() {
        const dateRangeText = document.getElementById("dateRangeText");
        if (!dateRangeText) return;

        // Jika startDate2 dan endDate2 null, set default ke bulan ini
        if (!this.state.startDate2 && !this.state.endDate2) {
            const today = new Date();
            const startOfMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
            const endOfMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0));

            this.state.startDate2 = startOfMonth.toISOString().split('T')[0];
            this.state.endDate2 = endOfMonth.toISOString().split('T')[0];
        }

        const startText = this.state.startDate2
            ? new Date(this.state.startDate2).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
            })
            : null;
        const endText = this.state.endDate2
            ? new Date(this.state.endDate2).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
            })
            : null;

        let dateText;

        if (!this.state.startDate2 && !this.state.endDate2) {
            dateText = "Pilih Tanggal";
        } else if (this.state.startDate2 && this.state.endDate2) {
            dateText = `${startText} - ${endText}`;
        } else if (this.state.startDate2) {
            dateText = `${startText} - Pilih`;
        } else if (this.state.endDate2) {
            dateText = `Pilih - ${endText}`;
        }

        dateRangeText.textContent = dateText;
    }

    async renderDashboard() {
        const self = this;

        // HANCURKAN GRID SEBELUM RENDER ULANG
        if (this.grid) {
            this.grid.destroy(false);
            this.grid = null;
        }

        const container = document.querySelector('.items');
        container.innerHTML = '';

        const response = await this.orm.call(
            "dashboard.block",
            "get_dashboard_vals",
            [[], this.actionId]
        );

        for (const widget of response) {
            const item = document.createElement('div');
            item.className = 'grid-stack-item';
            item.setAttribute('gs-x', widget.x || 0);
            item.setAttribute('gs-y', widget.y || 0);
            item.setAttribute('gs-w', widget.w || 4);
            item.setAttribute('gs-h', widget.h || 2);
            item.dataset.id = widget.id;

            const content = document.createElement('div');
            content.className = 'grid-stack-item-content';
            item.appendChild(content);
            container.appendChild(item);

            if (widget.type === 'tile') {
                mount(DashboardTile, content, { props: { widget } });
            } else if (widget.type === 'list') {
                mount(DashboardTable, content, { props: { widget } });
            } else {
                mount(DashboardChart, content, { props: { widget } });
            }
        }

        // INIT GRIDSTACK SETELAH SEMUA ITEM ADA
        this.initGridstack();
    }



    initGridstack() {
        const gridRoot = document.querySelector('.grid-stack');
        if (!gridRoot || typeof GridStack === 'undefined') return;

        this.grid = GridStack.init({
            float: true,
            cellHeight: 120,
            margin: 5,
            resizable: { handles: 'all' },
            draggable: { handle: '.grid-stack-item-content' },
            animate: true,
            disableOneColumnMode: true,
        }, gridRoot);

        console.log("GridStack initialized ✅");
    }



    editLayout(ev) {
        /* Function for editing the layout , it enables resizing and dragging functionality */
        $('.items .resize-drag').each(function (index, element) {
            interact(element).draggable(true)
            interact(element).resizable(true)
        });
        ev.stopPropagation();
        ev.preventDefault();
        $("#edit_layout").hide();
        $("#save_layout").show();
        this.initGridstack()
    }

    saveLayout(ev) {
        ev.preventDefault();

        const layout = this.grid.save();
        const data = layout.map(item => ({
            id: item.el.dataset.id,
            x: item.x,
            y: item.y,
            w: item.w,
            h: item.h,
        }));

        this.orm.call(
            'dashboard.block',
            'get_save_layout',
            [[], data]
        ).then(() => window.location.reload());
    }


    onClickAdd(event) {
        /* For enabling the toggle button */
        event.stopPropagation();
        event.preventDefault();
        $(".dropdown-addblock").toggle()
    }

    onClickAddItem(event) {
        /* Function for adding tiles and charts */
        event.stopPropagation();
        event.preventDefault();
        self = this;
        var type = event.target.getAttribute('data-type');
        if (type == 'graph') {
            var chart_type = event.target.getAttribute('data-chart_type');
        }
        if (type == 'tile') {
            var randomColor = '#' + ('000000' + Math.floor(Math.random() * 16777216).toString(16)).slice(-6);
            this.action.doAction({
                type: 'ir.actions.act_window',
                res_model: 'dashboard.block',
                view_mode: 'form',
                views: [[false, 'form']],
                context: {
                    'form_view_initial_mode': 'edit',
                    'default_name': 'New Tile',
                    'default_type': type,
                    'default_height': '155px',
                    'default_width': '300px',
                    'default_tile_color': '#ffffffff',
                    'default_text_color': '#292929ff',
                    'default_val_color': '#000000ff',
                    'default_fa_icon': 'fa fa-bar-chart',
                    'default_client_action_id': parseInt(self.actionId)
                }
            })
        }
        else if (type === 'list') {
            this.action.doAction({
                type: 'ir.actions.act_window',
                res_model: 'dashboard.block',
                view_mode: 'form',
                views: [[false, 'form']],
                context: {
                    'form_view_initial_mode': 'edit',
                    'default_name': 'New ' + type,
                    'default_type': type,
                    'default_height': '325px',
                    'default_width': 'fit-content',
                    'default_graph_type': chart_type,
                    'default_fa_icon': 'fa fa-bar-chart',
                    'default_client_action_id': parseInt(self.actionId)
                },
            })
        }
        else {
            this.action.doAction({
                type: 'ir.actions.act_window',
                res_model: 'dashboard.block',
                view_mode: 'form',
                views: [[false, 'form']],
                context: {
                    'form_view_initial_mode': 'edit',
                    'default_name': 'New ' + chart_type,
                    'default_type': type,
                    'default_height': '565px',
                    'default_width': '588px',
                    'default_graph_type': chart_type,
                    'default_fa_icon': 'fa fa-bar-chart',
                    'default_client_action_id': parseInt(self.actionId)
                },
            })
        }
    }

    dateFilter() {
        /* Function for filtering the data based on the creation date */
        $(".items").empty();
        var start_date = $("#start-date").val();
        var end_date = $("#end-date").val();
        var self = this;
        if (!start_date) {
            start_date = "null"
        }
        if (!end_date) {
            end_date = "null"
        }
        else {
            this.orm.call("dashboard.block", "get_dashboard_vals", [[], this.actionId, start_date, end_date]).then(function (response) {
                for (let i = 0; i < response.length; i++) {
                    if (response[i].type === 'tile') {
                        mount(DashboardTile, $('.items')[0], {
                            props: {
                                widget: response[i], doAction: self.action, dialog: self.dialog, orm: self.orm
                            }
                        });
                    }
                    else if (response[i].type === 'list') {
                        mount(DashboardTable, $('.items')[0], {
                            props: {
                                widget: response[i], doAction: self.action, rpc: self.rpc, dialog: self.dialog, orm: self.orm
                            }
                        });
                    }
                    else {
                        mount(DashboardChart, $('.items')[0], {
                            props: {
                                widget: response[i], doAction: self.action, rpc: self.rpc, dialog: self.dialog, orm: self.orm
                            }
                        });
                    }
                }
            })
        }
    }

    async printPdf() {
        /* Function for printing whole dashboard in pdf format */
        var elements = $('.items .resize-drag')
        var newElement = document.createElement('div');
        newElement.className = 'pdf';
        elements.each(function (index, elem) {
            newElement.appendChild(elem);
        });
        for (var x = 0; x < $(newElement)[0].children.length; x++) {
            $($(newElement)[0].children[x])[0].style.transform = ""
        }
        var opt = {
            margin: 0.3,
            filename: 'Dashboard.pdf',
            image: { type: 'jpeg', quality: 1 },
            html2canvas: { scale: 1 },
            jsPDF: { unit: 'mm', format: 'a3', orientation: 'portrait' }
        };
        html2pdf().set(opt).from(newElement).save().then(() => {
            window.location.reload()
        })

    }

    async createPDF() {
        /* Function for getting pdf data in string format */
        var elements = $('.items .resize-drag')
        var newElement = document.createElement('div');
        newElement.className = 'pdf';
        elements.each(function (index, elem) {
            newElement.appendChild(elem);
        });
        for (var x = 0; x < $(newElement)[0].children.length; x++) {
            $($(newElement)[0].children[x])[0].style.transform = ""
        }
        var opt = {
            margin: 0.3,
            filename: 'Dashboard.pdf',
            image: { type: 'jpeg', quality: 1 },
            html2canvas: { scale: 1 },
            jsPDF: { unit: 'mm', format: 'a3', orientation: 'portrait' }
        };
        var pdf = html2pdf().set(opt).from(newElement).toPdf()
        var pdfOutput = await pdf.output('datauristring');
        return pdfOutput
    }
}
OdooDashboard.template = "owl.OdooDashboard"
registry.category("actions").add("OdooDashboard", OdooDashboard)
