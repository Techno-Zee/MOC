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
    $("#save_layout").hide();

    await this.orm.call("dashboard.block", "get_dashboard_vals", [[], this.actionId]).then(function (response) {
        for (let i = 0; i < response.length; i++) {
            const widget = response[i];
            const $wrapper = $('<div class="grid-stack-item" data-id="'+widget.id+'"><div class="grid-stack-item-content"></div></div>');
            $('.items').append($wrapper);

            if (widget.type === 'tile') {
                mount(DashboardTile, $wrapper.find('.grid-stack-item-content')[0], {
                    props: { widget, doAction: self.action, dialog: self.dialog, orm: self.orm }
                });
            } else if (widget.type === 'list') {
                mount(DashboardTable, $wrapper.find('.grid-stack-item-content')[0], {
                    props: { widget, doAction: self.action, rpc: self.rpc, dialog: self.dialog, orm: self.orm }
                });
            } else {
                mount(DashboardChart, $wrapper.find('.grid-stack-item-content')[0], {
                    props: { widget, doAction: self.action, rpc: self.rpc, dialog: self.dialog, orm: self.orm }
                });
            }
        }
    });
}


    initGridstack() {
        if (typeof GridStack === "undefined") {
            console.error("GridStack belum dimuat!");
            return;
        }

        // Pastikan root grid ada
        const gridRoot = document.querySelector('.items');
        if (!gridRoot) {
            console.warn("Tidak ditemukan container .items");
            return;
        }

        // Inisialisasi gridstack di kontainer
        const grid = GridStack.init({
            float: true,
            resizable: { handles: 'all' },
            draggable: { handle: '.grid-stack-item-content' },
            cellHeight: 120,
            margin: 5,
            animate: true
        }, gridRoot);

        // Simpan instance untuk dipakai nanti
        this.grid = grid;

        // Optional: event listener buat simpan layout
        grid.on('change', (event, items) => {
            console.log("Layout berubah:", items);
        });

        console.log("Gridstack aktif pada dashboard dinamis 🚀");
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
        /* Function for saving the layout */
        var self = this;
        ev.stopPropagation();
        ev.preventDefault();
        $("#edit_layout").show();
        $("#save_layout").hide();
        var data_list = []
        $('.items .resize-drag').each(function (index, element) {
            interact(element).draggable(false)
            interact(element).resizable(false)
            data_list.push({
                'id': element.dataset['id'],
                'data-x': element.dataset['x'],
                'data-y': element.dataset['y'],
                'height': element.clientHeight,
                'width': element.clientWidth,
            })
        });
        self.orm.call('dashboard.block', 'get_save_layout', [[], data_list]).then(function (response) {
            window.location.reload();
        });
    }

    changeViewMode(ev) {
        /* Function for changing the mode of the view */
        ev.stopPropagation();
        ev.preventDefault();
        const currentMode = $(".mode").attr("mode");
        if (currentMode == "light") {
            // $('.theme').attr('style', 'display: none;')
            $(".container").attr('style', 'background-color: #383E45;min-height:-webkit-fill-available; !important')
            $("#dropdownMenuButton").attr('style', 'background-color: #03DAC5;margin-top:-4px; !important')
            $("#text_add").attr('style', 'color: black; !important')
            $(".date-label").attr('style', 'color: black;font-family:monospace; !important')
            $(".block_setting").attr('style', 'color: white; !important')
            $(".block_delete").attr('style', 'color: white; !important')
            $(".block_image").attr('style', 'color: #03DAC5; !important')
            $(".block_pdf").attr('style', 'color: #03DAC5; !important')
            $(".block_csv").attr('style', 'color: #03DAC5; !important')
            $(".block_xlsx").attr('style', 'color: #03DAC5; !important')
        }
        else {
            // $('.theme').attr('style', 'display: block;')
            // $(".container").attr('style', this.ThemeSelector.el.value + 'min-height:-webkit-fill-available;')
            $("#dropdownMenuButton").attr('style', 'background-color: none;margin-top:-4px; !important')
            $("#text_add").attr('style', 'color: white; !important')
            $(".date-label").attr('style', 'color: black; !important;font-family:monospace; !important')
            $(".block_setting").attr('style', 'color: black; !important')
            $(".block_delete").attr('style', 'color: black; !important')
            $(".block_image").attr('style', 'color: black; !important')
            $(".block_pdf").attr('style', 'color: black; !important')
            $(".block_csv").attr('style', 'color: black; !important')
            $(".block_xlsx").attr('style', 'color: black; !important')
        }
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

    async sendMail() {
        /* Function for creating pdf and sending mail to the selected users */
        /* This function calls the createPDF() function and returns the pdf datas */
        var created_pdf = await this.createPDF();
        var base64code = created_pdf.split(',')[1];
        this.action.doAction({
            type: 'ir.actions.act_window',
            name: 'SEND MAIL',
            res_model: 'dashboard.mail',
            view_mode: 'form',
            views: [[false, 'form']],
            target: 'new',
            context: {
                'default_base64code': base64code,
            }
        })
    }
}
OdooDashboard.template = "owl.OdooDashboard"
registry.category("actions").add("OdooDashboard", OdooDashboard)
