/** @odoo-module **/

import { registry } from "@web/core/registry";
import { IconPickerField } from "./icon_picker_widget";

export const iconPickerField = {
    component: IconPickerField,
};

registry.category("fields").add("icon_picker", iconPickerField);