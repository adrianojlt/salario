import openpyxl
import os

DATA_DIR = '/Users/adriano/src/mine/salario/data'
TEMP_DIR = '/Users/adriano/src/mine/salario/temp'

def pct(v):
    if v is None:
        return '0,00%'
    return f'{v * 100:.2f}'.replace('.', ',')

def fmt(v):
    if v is None:
        return '0'
    r = round(v, 2)
    s = str(r).replace('.', ',')
    return s

def extract_table_data(ws, data_start, data_end):
    rows = []
    for i, row in enumerate(ws.iter_rows(min_row=data_start, max_row=data_end, values_only=True), data_start):
        b = row[1] if len(row) > 1 else None
        if b in ('Até', 'Superior a'):
            rows.append(row)
    return rows

def convert_rows(rows):
    lines = []
    for row in rows:
        sinal = 'min' if row[1] == 'Superior a' else 'max'
        limite = row[2] if row[2] is not None else 0
        maximo = row[3] if row[3] is not None else 0
        parc = row[5] if row[5] is not None else 0
        var1_raw = row[6]
        adicional = row[11] if len(row) > 11 and row[11] is not None else 0
        var3_raw = row[15] if len(row) > 15 and row[15] is not None else None

        if isinstance(maximo, (int, float)) and maximo == 0:
            maximo_str = '0,00%'
            parc_str = '0'
            v1 = '0'
            v2 = '0'
        elif isinstance(var1_raw, str) and var1_raw == 'x':
            maximo_str = pct(maximo) + '%'
            parc_str = pct(parc) + '%'
            v1 = fmt(row[7]) if isinstance(row[7], (int, float)) else '0'
            v2 = fmt(row[9]) if len(row) > 9 and isinstance(row[9], (int, float)) else '0'
        else:
            maximo_str = pct(maximo) + '%'
            parc_str = fmt(parc)
            v1 = '0'
            v2 = '0'

        adicional_str = fmt(adicional)
        if var3_raw is None:
            var3_str = '0'
        elif isinstance(var3_raw, (int, float)) and var3_raw == -1:
            var3_str = '-1'
        else:
            var3_str = fmt(var3_raw * 10)

        lines.append((limite, sinal, maximo_str, parc_str, v1, v2, adicional_str, var3_str))

    return lines

def process_file(filepath, region, sheet_name, tables, cat_suffix):
    wb = openpyxl.load_workbook(filepath, data_only=True)
    ws = wb[sheet_name]

    all_lines = ['tipo;sinal;limite;maximo;parcela_abater;var1;var2;adicional;var3']

    for tipo, data_start, data_end in tables:
        rows = extract_table_data(ws, data_start, data_end)
        csv_rows = convert_rows(rows)
        all_lines.extend(
            f'{tipo};{s};{l};{m};{p};{v1};{v2};{ad};{v3}'
            for l, s, m, p, v1, v2, ad, v3 in csv_rows
        )

    out_name = f'taxas_{region}_2026.csv'
    out_path = os.path.join(DATA_DIR, out_name)
    with open(out_path, 'w') as f:
        f.write('\n'.join(all_lines) + '\n')
    print(f'Created: {out_path} ({len(all_lines)-1} data rows)')


acores_catA = [
    ('SOLCAS2',      8,  20),
    ('SOLD',        29, 41),
    ('CAS1',        50, 60),
    ('SOLCAS2+DEF', 69, 76),
    ('CAS2D+DEF',   85, 92),
    ('SOLCAS2+DEF', 101, 109),
    ('CAS1+DEF',    118, 124),
]

acores_catH = [
    ('SOLD',         8,  20),
    ('CAS1',        29, 40),
    ('SOLCAS2+DEF', 49, 56),
    ('CAS1+DEF',    65, 71),
]

madeira_catA = [
    ('SOLCAS2',      8,  20),
    ('SOLD',        29, 41),
    ('CAS1',        50, 61),
    ('SOLCAS2+DEF', 70, 78),
    ('CAS2D+DEF',   86, 94),
    ('SOLCAS2+DEF', 102, 111),
    ('CAS1+DEF',    119, 125),
]

madeira_catH = [
    ('SOLD',         8,  20),
    ('CAS1',        29, 40),
    ('SOLCAS2+DEF', 49, 57),
    ('CAS1+DEF',    65, 72),
]

process_file(
    os.path.join(TEMP_DIR, 'tabelas_irs_acores.xlsx'),
    'acores', 'Categoria A', acores_catA, 'catA'
)
process_file(
    os.path.join(TEMP_DIR, 'tabelas_irs_madeira.xlsx'),
    'madeira', 'Categoria A', madeira_catA, 'catA'
)

print('\nAll files created successfully!')
