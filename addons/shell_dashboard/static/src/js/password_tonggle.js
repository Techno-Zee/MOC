/** @odoo-module **/

import { patch } from "@web/core/utils/patch";
import { CharField as CharFieldBase } from "@web/views/fields/char/char_field";

patch(CharFieldBase.prototype, {
    setup() {
        super.setup(...arguments);
    },

    togglePassword(ev) {
        const input = document.querySelector(`#${this.props.id}`) || document.querySelector(`[autocomplete="new-password"]`);
        if (!input) return;

        // toggle the type attribute
        const type = input.type === "password" ? "text" : "password";
        input.type = type;

        // toggle the icon (using the event target)
        const icon = ev.currentTarget;
        if (icon) {
            icon.classList.toggle("bi-eye");
            icon.classList.toggle("bi-eye-slash");
        }
    }
}); 