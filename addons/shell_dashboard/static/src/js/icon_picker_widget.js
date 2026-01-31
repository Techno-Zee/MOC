/** @odoo-module **/

import { Component, useState, onMounted, onWillUnmount, useRef } from "@odoo/owl";
import { standardFieldProps } from "@web/views/fields/standard_field_props";

export class IconPickerField extends Component {
    static template = "odoo_dynamic_dashboard.IconPickerField";
    static props = {
        ...standardFieldProps,
    };

    setup() {
        this.root = useRef("root");
        this.state = useState({
            value: this.props.record.data[this.props.name] || 'fa-home',
            showPicker: false,
            searchTerm: '',
        });

        // Bind methods secara manual
        this.togglePicker = this.togglePicker.bind(this);
        this.selectIcon = this.selectIcon.bind(this);

        // atau gunakan arrow function
        this.togglePicker = () => {
            this.state.showPicker = !this.state.showPicker;
        };

        this.selectIcon = (icon) => {
            this.state.value = `fa ${icon}`;
            this.props.record.update({ [this.props.name]: this.state.value });
            this.state.showPicker = false;
        };

        // Predefined set of Font Awesome icons
        this.icons = [
            "fa-home","fa-user","fa-users","fa-briefcase","fa-building",
            "fa-calendar","fa-calendar-check","fa-clock","fa-hourglass",
            "fa-chart-line","fa-chart-bar","fa-chart-pie","fa-chart-area",
            "fa-bullhorn","fa-envelope","fa-bell","fa-star","fa-heart","fa-trophy",
            "fa-thumbs-up","fa-thumbs-down","fa-check","fa-times","fa-ban",
            "fa-sync","fa-upload","fa-download","fa-search","fa-filter","fa-tags",
            "fa-percent","fa-file","fa-file-pdf","fa-folder","fa-copy",
            "fa-edit","fa-save","fa-trash","fa-key","fa-lock","fa-unlock","fa-eye",
            "fa-eye-slash","fa-shield","fa-comment","fa-comments","fa-phone",
            "fa-mobile","fa-desktop","fa-database","fa-server","fa-plug",
            "fa-power-off","fa-undo","fa-redo","fa-paste","fa-camera",
            "fa-microphone","fa-headphones","fa-credit-card","fa-calculator",
            "fa-shopping-cart","fa-money-bill","fa-handshake","fa-futbol","fa-coffee",
            "fa-cloud","fa-moon","fa-sun","fa-rocket"            
        ]


        this.clickOutsideHandler = (event) => {
            if (this.root.el && !this.root.el.contains(event.target)) {
                this.state.showPicker = false;
            }
        };

        onMounted(() => {
            document.addEventListener('click', this.clickOutsideHandler);
        });

        onWillUnmount(() => {
            document.removeEventListener('click', this.clickOutsideHandler);
        });
    }

    togglePicker() {
        this.state.showPicker = !this.state.showPicker;
    }

    selectIcon(icon) {
        this.state.value = `fa ${icon}`;
        this.props.record.update({ [this.props.name]: this.state.value });
        this.state.showPicker = false;
    }

    get filteredIcons() {
        if (!this.state.searchTerm) {
            return this.icons;
        }
        return this.icons.filter(icon =>
            icon.toLowerCase().includes(this.state.searchTerm.toLowerCase())
        );
    }
}