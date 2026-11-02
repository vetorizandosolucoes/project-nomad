#!/usr/bin/env python3
"""
Builds collections/medicamentos_br.json from the CMED price list published by Anvisa.

Keeps only presentations the list marks as sold (the "COMERCIALIZAÇÃO" column), grouped
by product. Prices are left out because they vary by state tax.

    python3 build_br_medicines.py lista_pmc.xlsx medicamentos_br.json 2026-10-09

Source: https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/cmed/precos
"""
import json
import re
import sys
import xml.etree.ElementTree as ET
import zipfile

MAIN = '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'


def column_index(ref):
    n = 0
    for ch in re.match(r'[A-Z]+', ref).group():
        n = n * 26 + ord(ch) - 64
    return n - 1


def read_rows(path):
    archive = zipfile.ZipFile(path)
    strings = [
        ''.join(t.text or '' for t in si.iter(MAIN + 't'))
        for si in ET.fromstring(archive.read('xl/sharedStrings.xml')).findall(MAIN + 'si')
    ]
    for _, element in ET.iterparse(archive.open('xl/worksheets/sheet2.xml')):
        if not element.tag.endswith('}row'):
            continue
        row = {}
        for cell in element.findall(MAIN + 'c'):
            value = cell.find(MAIN + 'v')
            if value is not None:
                row[column_index(cell.get('r'))] = strings[int(value.text)] if cell.get('t') == 's' else value.text
        yield row
        element.clear()


def main(source, target, published):
    rows = read_rows(source)
    header = {index: name.strip() for index, name in next(rows).items()}
    sold_column = next(name for name in header.values() if name.startswith('COMERCIALIZA'))

    products = {}
    for raw in rows:
        row = {header[i]: str(v).strip() for i, v in raw.items() if i in header}
        if row.get(sold_column, '').upper() != 'SIM':
            continue
        key = (row['PRODUTO'], row['SUBSTÂNCIA'], row['LABORATÓRIO'])
        product = products.get(key)
        if product is None:
            tarja = row.get('TARJA', '').replace('Tarja ', '').strip()
            product = products[key] = {
                'name': row['PRODUTO'],
                'substance': row['SUBSTÂNCIA'],
                'lab': row['LABORATÓRIO'],
                'class': row.get('CLASSE TERAPÊUTICA', ''),
                'type': row.get('TIPO DE PRODUTO (STATUS DO PRODUTO)', ''),
                'tarja': '' if tarja.startswith('-') else tarja,
                'hospital': row.get('RESTRIÇÃO HOSPITALAR', '').upper() == 'SIM',
                'registry': row.get('REGISTRO', ''),
                'presentations': [],
            }
        presentation = row.get('APRESENTAÇÃO', '')
        if presentation and presentation not in product['presentations']:
            product['presentations'].append(presentation)

    medicines = sorted(products.values(), key=lambda m: (m['name'], m['lab']))
    for index, medicine in enumerate(medicines, start=1):
        medicine['id'] = index

    with open(target, 'w', encoding='utf-8') as output:
        json.dump(
            {
                'version': published,
                'soldColumn': sold_column,
                'source': 'Lista de preços de medicamentos da CMED/Anvisa',
                'medicines': medicines,
            },
            output,
            ensure_ascii=False,
            separators=(',', ':'),
        )
    print(f'{len(medicines)} produtos em {target}')


if __name__ == '__main__':
    main(*sys.argv[1:4])
