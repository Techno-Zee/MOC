# -*- coding: utf-8 -*-
{
    'name': 'Shell Dashboard',
    'summary': 'Custom interactive dashboard module for Odoo backend',

    'description': """
Shell Dashboard adalah modul dashboard custom independen yang terinspirasi
dari modul Dynamic Dashboard karya Cybrosys Technologies.

Modul ini dikembangkan dengan pendekatan arsitektur dan sudut pandang yang berbeda,
menggunakan Chart.js, Bootstrap Icons, serta beberapa komponen UI kustom
yang dibangun dengan jQuery untuk kebutuhan visualisasi data di backend Odoo.
    """,

    'author': 'Fahmi Nur Fadillah (TechnoZee)',
    'website': 'https://techno-zee.my.id',

    'category': 'Dashboard',
    'version': '1.0',

    'depends': [
        'base',
        'web',
    ],

    'data': [
        # 'security/ir.model.access.csv',
        'views/views.xml',
        'views/templates.xml',
    ],

    'demo': [
        'demo/demo.xml',
    ],

    'assets': {
        'web.assets_backend': [
            'shell_dashboard/static/src/js/**/*.js',
            'shell_dashboard/static/src/scss/**/*.scss',
            'shell_dashboard/static/src/xml/**/*.xml',
        ],
        # Aktifkan hanya jika memang ada UI frontend
        # 'web.assets_frontend': [
        #     'shell_dashboard/static/src/js/frontend/**/*.js',
        # ],
    },

    'installable': True,
    'application': True,
    'auto_install': False,
}
