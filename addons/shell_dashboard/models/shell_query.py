from odoo import models
from odoo.osv import expression


def get_query(self, args, operation, field, start_date=None, end_date=None,
              group_by=False, apply_ir_rules=False):
    """Safe Dashboard block Query Creation"""
    query = self._where_calc(args)
    if apply_ir_rules:
        self._apply_ir_rules(query, 'read')

    select_clause = []
    join = ""
    group_by_str = ""

    # --- SELECT FIELD ---
    if operation and field:
        if field.name not in self._fields:
            raise ValueError(f"Invalid field: {field.name}")

        op = operation.lower()
        if op not in ("sum", "avg", "count"):
            raise ValueError(f"Invalid operation: {op}")

        select_clause.append(f"COALESCE({op}(\"{self._table}\".\"{field.name}\"),0) AS value")

        # --- GROUP BY handling ---
        if group_by:
            if group_by.name not in self._fields:
                raise ValueError(f"Invalid group_by field: {group_by.name}")

            if group_by.ttype == 'many2one':
                rel_model = self.env[group_by.relation]
                rel_table = rel_model._table
                rec_name = rel_model._rec_name_fallback()

                join = f' INNER JOIN "{rel_table}" ON "{rel_table}".id = "{self._table}"."{group_by.name}"'
                select_clause.append(f'"{rel_table}"."{rec_name}" AS "{group_by.name}"')
                group_by_str = f' GROUP BY "{rel_table}"."{rec_name}"'
            else:
                select_clause.append(f'"{self._table}"."{group_by.name}"')
                group_by_str = f' GROUP BY "{self._table}"."{group_by.name}"'
    else:
        select_clause.append(f'"{self._table}".id')

    select_str = ", ".join(select_clause)

    # --- WHERE ---
    from_clause, from_params = query.from_clause
    where_clause, where_params = query.where_clause
    where_str = f" WHERE {where_clause}" if where_clause else ""

    # --- Date filter ---
    date_filter = ""
    if start_date and start_date != 'null':
        date_filter += f' AND "{self._table}"."create_date" >= %s'
        where_params += [start_date]
    if end_date and end_date != 'null':
        date_filter += f' AND "{self._table}"."create_date" <= %s'
        where_params += [end_date]

    query_str = f"""
        SELECT {select_str}
        FROM {from_clause} {join}
        {where_str} {date_filter} {group_by_str}
    """

    return self._cr.mogrify(query_str, tuple(where_params)).decode("utf-8")


models.BaseModel.get_query = get_query