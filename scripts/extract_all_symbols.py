"""
에머슨 Ovation Algorithm Reference Manual PDF에서
121개 심볼의 포트 정보를 추출하는 스크립트.

사용법:
    python extract_all_symbols.py

입력:
    - algorithm_index.json (심볼별 페이지 범위)
    - Ovation-Algorithms-Reference-Manual-R3_1100.pdf

출력:
    - extracted_ports.json (심볼별 포트, 설명, 수식)
"""

import json
import re
import sys
import os

try:
    import fitz  # PyMuPDF
except ImportError:
    print("PyMuPDF not installed. Run: pip install PyMuPDF")
    sys.exit(1)

# Paths
BASE_DIR = r"C:\Users\이성규\AppProduct\에머슨로직매뉴얼"
INDEX_PATH = os.path.join(BASE_DIR, "algorithm_index.json")
PDF_PATH = os.path.join(BASE_DIR, "PDF", "Ovation-Algorithms-Reference-Manual-R3_1100.pdf")
OUTPUT_PATH = r"C:\Users\이성규\AppProduct\ControlLogicEditor\data\extracted_ports.json"

# fi ligature -> fi
FI_LIGATURE = "\ufb01"

# Page range overrides for symbols with incorrect end_page in index
PAGE_OVERRIDES = {
    "X3STEP": {"end_page": 437},  # Table extends to page 437, not 434
}

# Symbols that are STEAMTABLE sub-functions: extract ports from functional symbol
STEAMTABLE_SUBS = {
    "HSCLTP", "HSLT", "HSTVSVP", "HSVSSTP", "PSLT", "PSVS",
    "SSLT", "TSLH", "TSLP", "VCLTP", "VSLT",
}


def normalize_text(text):
    """Normalize fi ligature and other special chars."""
    text = text.replace(FI_LIGATURE, "fi")
    text = text.replace("\ufb02", "fl")
    return text


def load_index():
    with open(INDEX_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def get_pages_text(doc, start_page, end_page):
    """Extract text from page range (1-based)."""
    if end_page < start_page:
        end_page = start_page
    texts = []
    for p in range(start_page - 1, end_page):
        if 0 <= p < len(doc):
            texts.append(normalize_text(doc[p].get_text()))
    return "\n".join(texts)


def extract_description(full_text):
    """Extract first sentence from Description section."""
    desc_match = re.search(
        r'Description\s*\n(.+?)(?:\n(?:Functional Symbol|Algorithm Record|Algorithm Definitions?|Tracking Signals|Guidelines|Note\b|Invalid Numbers|Bit\s+Description))',
        full_text, re.DOTALL
    )
    if desc_match:
        desc_text = desc_match.group(1).strip()
    else:
        desc_match = re.search(r'Description\s*\n(.+)', full_text, re.DOTALL)
        if desc_match:
            desc_text = desc_match.group(1).strip()
            para_end = desc_text.find('\n\n')
            if para_end > 0:
                desc_text = desc_text[:para_end].strip()
        else:
            return ""

    # Join lines
    desc_text = re.sub(r'\s*\n\s*', ' ', desc_text).strip()

    # First sentence
    sentence_match = re.match(r'(.+?\.)\s', desc_text)
    if sentence_match:
        return sentence_match.group(1)

    return desc_text[:300]


def extract_formula(full_text):
    """Extract Function: formula."""
    # Pattern: "Function\n<formula>" between Algorithm Definitions header and Name header
    func_match = re.search(r'Algorithm Definitions?\s*\nFunction\s*\n(.+?)\nName\n', full_text, re.DOTALL)
    if func_match:
        formula = func_match.group(1).strip()
        formula = re.sub(r'\s*\n\s*', ' ', formula).strip()
        return formula

    # Pattern: "Function\n<formula>" standalone
    func_match = re.search(r'\nFunction\s*\n(.+?)\n(?:Name\n|Algorithm)', full_text, re.DOTALL)
    if func_match:
        formula = func_match.group(1).strip()
        formula = re.sub(r'\s*\n\s*', ' ', formula).strip()
        if len(formula) < 200:
            return formula

    return None


def find_table_headers(full_text):
    """
    Find all table header positions in text.
    Returns list of positions after the header (where port data begins).

    Handles multiple header formats:
    - "Name\n...Alg...Record\nField...Type...Required/Optional...Record\n"
    - "Name\n...Alg...Rec. Field\nType\nReq'd or\nOpt...Rec.\n"
    """
    positions = []

    for m in re.finditer(r'Name\s*\n', full_text):
        start = m.start()
        snippet = full_text[start:start + 300]
        # Check if this is a table header: must have Field/Type and Required/Req'd
        has_field = 'Field' in snippet or 'Rec. Field' in snippet
        has_type = 'Type' in snippet
        has_req = 'Required' in snippet or 'Optional' in snippet or "Req'd" in snippet or "Opt." in snippet
        if has_field and has_type and has_req:
            # Find the end of the header (last "Record\n" or "Rec.\n" in the header block)
            header_text = snippet
            last_record = max(header_text.rfind('Record\n'), header_text.rfind('Rec.\n'))
            if last_record >= 0:
                # Determine the actual line ending
                line_end = header_text.index('\n', last_record) + 1
                data_start = start + line_end
                positions.append(data_start)

    return positions


def extract_table_sections(full_text):
    """
    Find all table data sections (after headers).
    Returns list of text segments containing port data.
    """
    positions = find_table_headers(full_text)
    if not positions:
        return []

    sections = []
    for idx, pos in enumerate(positions):
        # Section extends until the next header or end of text
        if idx + 1 < len(positions):
            end = positions[idx + 1]
            # But the next header is preceded by "Name\n" - find where that starts
            # Go back to find the preceding "Name\n"
            name_pos = full_text.rfind('Name\n', pos, end)
            if name_pos > pos:
                end = name_pos
        else:
            end = len(full_text)

        section = full_text[pos:end]
        # Trim at known section boundaries
        for boundary in [
            r'\nThe error input',
            r'\nCascaded Mode',
            r'\nOutput Calculation',
            r'\nFunctional Operation',
            r'\nError Deadband',
            r'\nTracking Signal',
            r'\nAlgorithm Configuration',
            r'\nTuning Constant',
            r'\nAlgorithm Record Type',
            r'\nOUT Quality',
        ]:
            bm = re.search(boundary, section)
            if bm:
                section = section[:bm.start()]

        sections.append(section)

    return sections


# Record types that end a port entry
RECORD_TYPES = {'LA', 'LD', 'LP', 'LB', 'LC', 'LF'}


def is_record_or_dash(line):
    """Check if a line is a record type like LA, LD, LP or — (end-of-port marker)."""
    line = line.strip()
    if line in ('\u2014', '\u2013', '-', '—', '–'):
        return True
    # Could be "LA", "LD", "LP", "LA, LP", "LD, LP", "LD,LP" etc
    # Normalize: remove spaces around commas
    parts = [p.strip() for p in line.replace(' ', '').split(',')]
    if all(p in RECORD_TYPES for p in parts) and len(parts) > 0 and parts[0]:
        return True
    return False


def is_port_name(line):
    """Check if a line looks like a port name."""
    line = line.strip()
    if re.match(r'^[A-Z][A-Z0-9_]{0,15}$', line):
        return True
    return False


def is_field_code(line):
    """Check if a line is a field code like R1, S3, X5, LU-Integer, C0, or — for Variable."""
    line = line.strip()
    if re.match(r'^(R[1-9]|S[1-9]|X[1-5]|C[0-9]|LU|G[0-9]|T[1-9]|U[1-9]|D[0-9]|YT|YP|C[4-9])', line):
        return True
    if line in ('\u2014', '\u2013', '-', '—'):
        return True
    return False


def is_required(req_str):
    """Parse Required/Optional variants to bool."""
    s = req_str.strip().lower()
    # "Required", "Req'd", "Req.", "Req'd/Opt."
    if 'req' in s:
        return True
    return False


def is_req_or_opt_line(line):
    """Check if a line is a Required/Optional indicator."""
    s = line.strip().lower()
    return ('req' in s or 'opt' in s) and len(s) < 30


def parse_port_entries(table_text):
    """Parse port entries from table text."""
    lines = table_text.split('\n')
    ports = []
    i = 0

    while i < len(lines):
        line = lines[i].strip()

        if not line:
            i += 1
            continue

        if not is_port_name(line):
            i += 1
            continue

        port_name = line

        if i + 1 >= len(lines):
            i += 1
            continue

        next_line = lines[i + 1].strip()

        if not is_field_code(next_line):
            i += 1
            continue

        port = parse_single_port(lines, i)
        if port:
            ports.append(port)
            i = port.pop('_end_idx')
        else:
            i += 1

    return ports


def parse_single_port(lines, start_idx):
    """Parse a single port entry."""
    port_name = lines[start_idx].strip()
    field_line = lines[start_idx + 1].strip()

    if field_line in ('\u2014', '\u2013', '-', '—'):
        return parse_variable_port(lines, start_idx, port_name)
    else:
        return parse_record_port(lines, start_idx, port_name, field_line)


def parse_variable_port(lines, start_idx, port_name):
    """Parse a Variable type port."""
    i = start_idx + 2

    if i >= len(lines):
        return None
    type_line = lines[i].strip()
    if type_line != 'Variable':
        return None
    i += 1

    # Required/Optional (various formats)
    if i >= len(lines):
        return None
    req_line = lines[i].strip()

    # Handle split lines: "Required/\nOptional", "Req'd or\nOpt."
    if req_line.endswith('/') or req_line.endswith(' or'):
        i += 1
        if i < len(lines):
            req_line += ' ' + lines[i].strip()
    required = is_required(req_line)
    i += 1

    # Default value
    if i >= len(lines):
        return None
    default_line = lines[i].strip()
    default_val = None
    if default_line not in ('—', '–', '-'):
        default_val = default_line
    i += 1

    # Description lines until record type or next port
    desc_lines = []
    record = ""
    while i < len(lines):
        l = lines[i].strip()
        if not l:
            i += 1
            break
        if is_record_or_dash(l):
            record = l if l not in ('—', '–', '-') else ""
            i += 1
            break
        if is_port_name(l) and i + 1 < len(lines) and is_field_code(lines[i + 1].strip()):
            break
        desc_lines.append(l)
        i += 1

    description = ' '.join(desc_lines).strip()

    return {
        "name": port_name,
        "field": "Variable",
        "type": "Variable",
        "required": required,
        "default": default_val,
        "description": description,
        "record": record,
        "_end_idx": i
    }


def parse_record_port(lines, start_idx, port_name, field_line):
    """Parse a Record field port."""
    i = start_idx + 2

    # Parse field code
    field_code = ""
    data_type = ""

    fm = re.match(r'(R[1-9]|S[1-9]|X[1-5]|C[0-9]|G[0-9]|T[1-9]|U[1-9]|D[0-9]|YT|YP)', field_line)
    if fm:
        field_code = fm.group(1)
        rest = field_line[fm.end():].strip()
        type_m = re.search(r'(?:-\s*)?(Real|Byte|Integer)', rest)
        if type_m:
            data_type = type_m.group(1)
    elif field_line.startswith('LU'):
        field_code = "LU-Integer"
        data_type = "Integer"
    else:
        field_code = re.split(r'\s', field_line)[0]

    # Check for "Bits N [and M]" line
    bits_info = ""
    if i < len(lines):
        bits_line = lines[i].strip()
        if re.match(r'Bits?\s+\d', bits_line):
            bits_info = bits_line
            i += 1
            # Sometimes there's a continuation like "0" on next line for "Bits 1 and\n0"
            if i < len(lines) and re.match(r'^\d+$', lines[i].strip()):
                bits_info += ' ' + lines[i].strip()
                i += 1

    # Check if type info was already on the field_line
    has_type_info = any(kw in field_line for kw in ['Data Init', 'Tuning', 'Selectable'])

    if not has_type_info:
        # Consume type info lines
        type_info_parts = []
        while i < len(lines):
            l = lines[i].strip()
            if l in ('Tuning', 'Constant', 'Selectable', 'Data Init', 'Data Init.'):
                type_info_parts.append(l)
                i += 1
            elif l.startswith('Tuning') or l.startswith('Data Init') or l.startswith('Selectable'):
                type_info_parts.append(l)
                i += 1
                if 'Constant' in l or 'Selectable' in l or 'Init' in l:
                    break
            else:
                break
            combined = ' '.join(type_info_parts)
            if 'Constant' in combined or 'Selectable' in combined or 'Init' in combined:
                break

    # Required/Optional
    if i >= len(lines):
        return None
    req_line = lines[i].strip()
    # Handle "Required/" or "Req'd or" split across lines
    if req_line.endswith('/') or req_line.endswith(' or'):
        i += 1
        if i < len(lines):
            req_line += ' ' + lines[i].strip()
    if not is_req_or_opt_line(req_line):
        return None
    required = is_required(req_line)
    i += 1

    # Default value
    if i >= len(lines):
        return None
    default_line = lines[i].strip()
    default_val = None
    if default_line not in ('—', '–', '-'):
        default_val = default_line
    i += 1

    # Description lines
    desc_lines = []
    record = ""
    while i < len(lines):
        l = lines[i].strip()
        if not l:
            i += 1
            break
        if is_record_or_dash(l):
            record = l if l not in ('—', '–', '-') else ""
            i += 1
            break
        if is_port_name(l) and i + 1 < len(lines) and is_field_code(lines[i + 1].strip()):
            break
        desc_lines.append(l)
        i += 1

    description = ' '.join(desc_lines).strip()

    if not data_type:
        if field_code.startswith('X'):
            data_type = "Byte"
        elif field_code.startswith(('LU', 'G', 'D', 'YT', 'YP', 'C')):
            data_type = "Integer"
        else:
            data_type = "Real"

    return {
        "name": port_name,
        "field": field_code + (f" {bits_info}" if bits_info else ""),
        "type": data_type,
        "required": required,
        "default": default_val,
        "description": description,
        "record": record,
        "_end_idx": i
    }


def extract_steamtable_ports(full_text, symbol_name):
    """
    Extract ports from steam table sub-functions by parsing the Functional Symbol diagram.
    These symbols have no Algorithm Definitions table.
    Ports are extracted from the diagram text lines.
    """
    # Common pattern: these all reference STEAMTABLE
    # From the functional symbol diagram we can extract port names
    # The diagram typically shows input/output names around "STM-TBL"

    # Known mappings for steam table sub-functions
    steam_ports = {
        "HSCLTP": [
            {"name": "TEMP", "description": "Temperature input", "direction": "input"},
            {"name": "PRES", "description": "Pressure input", "direction": "input"},
            {"name": "ENTHALPY", "description": "Enthalpy output", "direction": "output"},
            {"name": "FLAG", "description": "Error flag output", "direction": "output"},
        ],
        "HSLT": [
            {"name": "TEMP", "description": "Temperature input", "direction": "input"},
            {"name": "ENTHALPY", "description": "Enthalpy of Saturated Liquid output", "direction": "output"},
            {"name": "FLAG", "description": "Error flag output", "direction": "output"},
        ],
        "HSTVSVP": [
            {"name": "TEMP", "description": "Temperature input", "direction": "input"},
            {"name": "PRES", "description": "Pressure input", "direction": "input"},
            {"name": "ENTHALPY", "description": "Enthalpy output", "direction": "output"},
            {"name": "ENTROPY", "description": "Entropy output", "direction": "output"},
            {"name": "VOLUME", "description": "Specific Volume output", "direction": "output"},
            {"name": "FLAG", "description": "Error flag output", "direction": "output"},
        ],
        "HSVSSTP": [
            {"name": "TEMP", "description": "Temperature input", "direction": "input"},
            {"name": "PRES", "description": "Pressure input", "direction": "input"},
            {"name": "ENTHALPY", "description": "Enthalpy output", "direction": "output"},
            {"name": "ENTROPY", "description": "Entropy output", "direction": "output"},
            {"name": "VOLUME", "description": "Specific Volume output", "direction": "output"},
            {"name": "FLAG", "description": "Error flag output", "direction": "output"},
        ],
        "PSLT": [
            {"name": "TEMP", "description": "Temperature input", "direction": "input"},
            {"name": "PRES", "description": "Pressure of Saturated Liquid output", "direction": "output"},
            {"name": "FLAG", "description": "Error flag output", "direction": "output"},
        ],
        "PSVS": [
            {"name": "PRES", "description": "Pressure input", "direction": "input"},
            {"name": "VOLUME", "description": "Specific Volume output", "direction": "output"},
            {"name": "FLAG", "description": "Error flag output", "direction": "output"},
        ],
        "SSLT": [
            {"name": "TEMP", "description": "Temperature input", "direction": "input"},
            {"name": "ENTROPY", "description": "Entropy of Saturated Liquid output", "direction": "output"},
            {"name": "FLAG", "description": "Error flag output", "direction": "output"},
        ],
        "TSLH": [
            {"name": "ENTHALPY", "description": "Enthalpy input", "direction": "input"},
            {"name": "TEMP", "description": "Temperature output", "direction": "output"},
            {"name": "FLAG", "description": "Error flag output", "direction": "output"},
        ],
        "TSLP": [
            {"name": "PRES", "description": "Pressure input", "direction": "input"},
            {"name": "TEMP", "description": "Saturation Temperature output", "direction": "output"},
            {"name": "FLAG", "description": "Error flag output", "direction": "output"},
        ],
        "VCLTP": [
            {"name": "TEMP", "description": "Temperature input", "direction": "input"},
            {"name": "PRES", "description": "Pressure input", "direction": "input"},
            {"name": "VOLUME", "description": "Specific Volume output", "direction": "output"},
            {"name": "FLAG", "description": "Error flag output", "direction": "output"},
        ],
        "VSLT": [
            {"name": "TEMP", "description": "Temperature input", "direction": "input"},
            {"name": "VOLUME", "description": "Specific Volume of Saturated Liquid output", "direction": "output"},
            {"name": "FLAG", "description": "Error flag output", "direction": "output"},
        ],
    }

    if symbol_name in steam_ports:
        ports = []
        for p in steam_ports[symbol_name]:
            ports.append({
                "name": p["name"],
                "field": "Variable",
                "type": "Variable",
                "required": True,
                "default": None,
                "description": p["description"],
                "record": "LA"
            })
        return ports
    return []


def parse_port_table(full_text):
    """Extract all ports from Algorithm Definitions tables in the text."""
    sections = extract_table_sections(full_text)
    all_ports = []
    for section in sections:
        ports = parse_port_entries(section)
        all_ports.extend(ports)
    return all_ports


def extract_symbol_data(doc, symbol_name, info):
    """Extract full data for one symbol."""
    start_page = info["start_page"]
    end_page = info["end_page"]

    # Apply overrides
    if symbol_name in PAGE_OVERRIDES:
        overrides = PAGE_OVERRIDES[symbol_name]
        if "end_page" in overrides:
            end_page = overrides["end_page"]
        if "start_page" in overrides:
            start_page = overrides["start_page"]

    full_text = get_pages_text(doc, start_page, end_page)

    # Try standard table extraction first
    ports = parse_port_table(full_text)

    # For steam table sub-functions without tables
    if not ports and symbol_name in STEAMTABLE_SUBS:
        ports = extract_steamtable_ports(full_text, symbol_name)

    description = extract_description(full_text)
    formula = extract_formula(full_text)

    result = {
        "ports": ports,
        "description": description,
    }
    if formula:
        result["formula"] = formula

    return result


def extract_all():
    """Main extraction function."""
    index = load_index()
    doc = fitz.open(PDF_PATH)

    print(f"PDF loaded: {len(doc)} pages")
    print(f"Symbols: {len(index)}")
    print()

    results = {}
    success_count = 0
    no_ports_count = 0
    no_ports_list = []

    for symbol_name, info in sorted(index.items()):
        try:
            data = extract_symbol_data(doc, symbol_name, info)
            results[symbol_name] = data

            port_count = len(data["ports"])
            if port_count > 0:
                success_count += 1
                port_names = [p["name"] for p in data["ports"]]
                names_str = ', '.join(port_names[:6]) + ('...' if len(port_names) > 6 else '')
                print(f"  [OK] {symbol_name}: {port_count} ports ({names_str})")
            else:
                no_ports_count += 1
                no_ports_list.append(symbol_name)
                print(f"  [--] {symbol_name}: no ports found (pages {info['start_page']}-{info['end_page']})")
        except Exception as e:
            print(f"  [ERR] {symbol_name}: {e}")
            import traceback
            traceback.print_exc()
            results[symbol_name] = {"ports": [], "description": "", "error": str(e)}

    doc.close()

    # Save
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    print(f"\n=== Results ===")
    print(f"Total: {len(index)} symbols")
    print(f"With ports: {success_count}")
    print(f"No ports: {no_ports_count}")
    if no_ports_list:
        print(f"Missing: {', '.join(no_ports_list)}")
    print(f"Saved to: {OUTPUT_PATH}")

    total_ports = sum(len(v["ports"]) for v in results.values())
    print(f"Total ports: {total_ports}")


if __name__ == "__main__":
    extract_all()
