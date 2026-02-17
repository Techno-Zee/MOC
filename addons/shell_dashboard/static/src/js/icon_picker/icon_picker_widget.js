/** @odoo-module **/

import { Component, useState, onMounted, onWillUnmount, useRef } from "@odoo/owl";
import { standardFieldProps } from "@web/views/fields/standard_field_props";

export class IconPickerField extends Component {
    static template = "shell_dashboard.IconPickerField";
    static props = {
        ...standardFieldProps,
    };

    setup() {
        this.root = useRef("root");
        this.state = useState({
            // Nilai default: "fa-home" (akan ditampilkan sebagai "fa fa-home" di template)
            value: this.props.record.data[this.props.name] || 'fa-home',
            showPicker: false,
            searchTerm: '',
            icons: [],        // akan diisi dari file JSON
            loading: true,    // indikator loading
        });

        // Method untuk memuat ikon dari file JSON via fetch
        this.loadIcons = async () => {
            try {
                const response = await fetch(
                    "/shell_dashboard/static/src/font/fontawesome4-icons.json"
                );
                if (!response.ok) {
                    throw new Error("Failed to load icon list");
                }
                const data = await response.json();
                // Data diharapkan berupa array ["fa-500px", "fa-address-book", ...]
                this.state.icons = Array.isArray(data) ? data : [];
            } catch (error) {
                console.error("Icon load error:", error);
                this.state.icons = [];
            } finally {
                this.state.loading = false;
            }
        };

        // Toggle picker (menggunakan arrow function)
        this.togglePicker = () => {
            this.state.showPicker = !this.state.showPicker;
        };

        // Memilih ikon, iconClass adalah string seperti "fa-home"
        this.selectIcon = (iconClass) => {
            // Simpan nilai dalam format "fa fa-home" (dua kelas terpisah)
            const fullClass = `fa ${iconClass}`;  // misal "fa-home" -> "fa fa-home"
            this.state.value = fullClass;
            this.props.record.update({ [this.props.name]: fullClass });
            this.state.showPicker = false;
        };

        // Handler klik di luar area picker
        this.clickOutsideHandler = (event) => {
            if (this.root.el && !this.root.el.contains(event.target)) {
                this.state.showPicker = false;
            }
        };

        onMounted(() => {
            this.loadIcons();
            document.addEventListener('click', this.clickOutsideHandler);
        });

        onWillUnmount(() => {
            document.removeEventListener('click', this.clickOutsideHandler);
        });
    }

    // Getter untuk ikon yang sudah difilter berdasarkan searchTerm
    get filteredIcons() {
        if (this.state.loading) {
            return []; // saat loading, jangan tampilkan ikon
        }
        if (!this.state.searchTerm) {
            return this.state.icons;
        }
        return this.state.icons.filter(iconClass =>
            iconClass.toLowerCase().includes(this.state.searchTerm.toLowerCase())
        );
    }
}