import os
import threading
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import uvicorn
import math
from datetime import datetime

def normalize_plate_variants(plate: str):
    p = str(plate).strip().upper().replace('-', '').replace(' ', '')
    variants = {p}
    if len(p) == 7:
        mercosul_letters = {'A': '0', 'B': '1', 'C': '2', 'D': '3', 'E': '4', 'F': '5', 'G': '6', 'H': '7', 'I': '8', 'J': '9'}
        rev_map = {v: k for k, v in mercosul_letters.items()}
        # Variant 1: Grey (1234) to Mercosul (1A23) logic
        if p[4] in mercosul_letters:
            variants.add(p[:4] + mercosul_letters[p[4]] + p[5:])
        if p[4] in rev_map:
            variants.add(p[:4] + rev_map[p[4]] + p[5:])
    return list(variants)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# File Configurations
from typing import Any, Dict

FILES: Dict[str, Dict[str, Any]] = {
    "cimento": {"path": r"C:\Users\Jimmy\OneDrive\02 - CIMENTO MS\CIMENTO MS.xlsx", "sheet": ["DSO", "INTERCEMENT", "FOB", "INTERCEMENT MT", "ALVORADA", "CIMENSHOP", "ENTREGAS"], "header": 0},
    "placas": {"path": r"C:\Users\Jimmy\OneDrive\02 - CIMENTO MS\CIMENTO MS.xlsx", "sheet": "PLACAS", "header": 0},
    "sucata": {"path": r"C:\Users\Jimmy\OneDrive\04 - FROTA\CARREGAMENTOS TRANSBOTTAN.xlsx", "sheet": "ACOMPANHAMENTO", "header": 0},
    "metas": {"path": r"C:\BOTTAN\Dashboards\Transbottan geral\metas.xlsx", "sheet": "Planilha1", "header": 0},
    "veiculos": {"path": r"C:\Users\Jimmy\OneDrive\12 - DOCUMENTOS\relatorios abastecimento\consumo combustivel.xlsx", "sheet": "Planilha 1", "header": 1},
    "dre_frota": {
        "path": r"C:\Users\Jimmy\OneDrive\12 - DOCUMENTOS\relatorios dre frota",
        "sheet": None,
        "header": None,
        "custom_parser": "dre_frota"
    },
    "ctrc": {
        "path": r"C:\Users\Jimmy\OneDrive\12 - DOCUMENTOS\relatorios analiticos\1163_rel_ctrc_detalhado_20260301_153919.xlsx",
        "sheet": None,
        "header": None,
        "custom_parser": "ctrc"
    },
}

data_cache = {
    key: {"df": None, "last_mtime": 0} for key in FILES
}
data_lock = threading.Lock()

def check_and_reload():
    """Checks if any Excel file has been modified and reloads it if necessary."""
    with data_lock:
        for key, info in FILES.items():
            raw_path = info["path"]

            # Se for uma pasta, escaneia todos os .xlsx/.xls dentro dela
            if isinstance(raw_path, str) and os.path.isdir(raw_path):
                paths = [
                    os.path.join(raw_path, f)
                    for f in os.listdir(raw_path)
                    if f.lower().endswith(('.xlsx', '.xls'))
                ]
            elif isinstance(raw_path, list):
                paths = raw_path
            else:
                paths = [raw_path]

            max_mtime = 0
            valid_paths = []

            for p in paths:
                if not os.path.exists(p):
                    continue
                valid_paths.append(p)
                mtime = os.path.getmtime(p)
                if mtime > max_mtime:
                    max_mtime = mtime
                    
            if not valid_paths:
                continue
                
            try:
                if max_mtime > data_cache[key]["last_mtime"]:
                    print(f"[{key.upper()}] Arquivo atualizado. Carregando dados...")
                    
                    if info.get("custom_parser") == "dre_frota":
                        all_data = []
                        for f in valid_paths:
                            try:
                                df = pd.read_excel(f, header=None)
                                header_row_idx = -1
                                for idx in range(min(10, len(df))):
                                    if str(df.iloc[idx, 0]).strip().upper() == "CENTRO CUSTO":
                                        header_row_idx = idx
                                        break
                                if header_row_idx == -1: continue
                                headers = df.iloc[header_row_idx].tolist()
                                date_cols = {}
                                for col_idx, h in enumerate(headers):
                                    h_str = str(h).strip()
                                    if '/' in h_str and len(h_str) == 7:
                                        date_cols[col_idx] = h_str
                                current_centro_custo = None
                                for idx in range(header_row_idx + 1, len(df)):
                                    c0 = str(df.iloc[idx, 0]).strip()
                                    c1 = str(df.iloc[idx, 1]).strip()
                                    if c0 != 'nan' and c0: current_centro_custo = c0
                                    if current_centro_custo and c1 == "(+) Receita":
                                        placa = current_centro_custo.split('/')[0].strip()
                                        if not placa or placa.startswith('ADMINISTRATIVO'): continue
                                        for col_idx, date_str in date_cols.items():
                                            val = df.iloc[idx, col_idx]
                                            if pd.notna(val):
                                                try:
                                                    val = float(val)
                                                    m, y = date_str.split('/')
                                                    all_data.append({"PLACA": placa, "DATA": f"{y}-{m}-01", "RECEITA": val})
                                                except ValueError:
                                                    pass
                            except Exception as e:
                                print(f"Erro no parser dre_frota {f}: {e}")
                        data_cache[key]["df"] = pd.DataFrame(all_data)
                        data_cache[key]["last_mtime"] = max_mtime
                        print(f"[{key.upper()}] Carregado com sucesso!")
                        continue

                    if info.get("custom_parser") == "ctrc":
                        try:
                            df = pd.read_excel(valid_paths[0], header=1)
                            df['dt_emissao'] = pd.to_datetime(df['dt_emissao'], errors='coerce')
                            df = df[df['id_situacao_cte'].astype(str).str.strip() == 'Autorizado'].copy()
                            df = df[df['dt_emissao'].notna()].copy()
                            # Remove datas futuras claramente incorretas (> data atual)
                            df = df[df['dt_emissao'] <= pd.Timestamp.now()].copy()
                            str_cols = ['nm_cidade_origem', 'nm_cidade_destino', 'nm_pessoa_remetente',
                                        'nm_pessoa_tomador', 'nm_pessoa_motorista', 'ds_placa',
                                        'nm_produto', 'id_proprietario_veiculo', 'nm_pessoa_filial']
                            for col in str_cols:
                                if col in df.columns:
                                    df[col] = df[col].astype(str).str.strip()
                            data_cache[key]["df"] = df
                            data_cache[key]["last_mtime"] = max_mtime
                            print(f"[CTRC] Carregado com sucesso! {len(df)} registros.")
                        except Exception as e:
                            print(f"Erro no parser ctrc: {e}")
                        continue

                    path = valid_paths[0] # standard files only use the first valid path
                    if info["sheet"]:
                        if isinstance(info["sheet"], list):
                            dfs = []
                            for sheet_name in info["sheet"]:
                                try:
                                    df = pd.read_excel(path, sheet_name=sheet_name, header=info["header"])
                                    # Padroniza nomes das colunas de data e valor para as abas de Cimento
                                    col_mapping = {}
                                    for col in df.columns:
                                        c_up = str(col).upper()
                                        if "DATA CARREG" in c_up: col_mapping[col] = "DATA CARREG."
                                        elif "VALOR FRETE" in c_up: col_mapping[col] = "VALOR FRETE"
                                    df = df.rename(columns=col_mapping)
                                    df['_sheet'] = sheet_name
                                    dfs.append(df)
                                    print(f"   Aba '{sheet_name}' carregada com sucesso!")
                                except Exception as sheet_err:
                                    print(f"   Erro ao carregar aba '{sheet_name}': {sheet_err}")
                            if dfs:
                                data_cache[key]["df"] = pd.concat(dfs, ignore_index=True)
                            else:
                                data_cache[key]["df"] = pd.DataFrame()
                        else:
                            data_cache[key]["df"] = pd.read_excel(path, sheet_name=info["sheet"], header=info["header"])
                    else:
                        data_cache[key]["df"] = pd.read_excel(path, header=info["header"])
                    data_cache[key]["last_mtime"] = max_mtime
                    print(f"[{key.upper()}] Carregado com sucesso!")
            except Exception as e:
                print(f"Erro ao ler arquivos {paths}: {e}")

# Initial load on startup
check_and_reload()

def find_col(df, keywords):
    """Find a column in df that contains any of the keywords (case-insensitive)."""
    for col in df.columns:
        col_str = str(col).upper()
        for kw in keywords:
            if kw.upper() in col_str:
                return col
    return None

def process_financial_data(month, year, fleet_type=None, grupo=None):
    """Processes loaded data frames and returns consolidated financial metrics."""
    data_cim = data_cache.get("cimento", {})
    df_cimento = data_cim.get("df", pd.DataFrame()) if isinstance(data_cim, dict) else pd.DataFrame()
    
    data_suc = data_cache.get("sucata", {})
    df_sucata = data_suc.get("df", pd.DataFrame()) if isinstance(data_suc, dict) else pd.DataFrame()
    
    data_vei = data_cache.get("veiculos", {})
    df_veiculos = data_vei.get("df", pd.DataFrame()) if isinstance(data_vei, dict) else pd.DataFrame()
    
    data_pla = data_cache.get("placas", {})
    df_placas = data_pla.get("df", pd.DataFrame()) if isinstance(data_pla, dict) else pd.DataFrame()

    data_dre = data_cache.get("dre_frota", {})
    df_dre = data_dre.get("df", pd.DataFrame()) if isinstance(data_dre, dict) else pd.DataFrame()
    
    # Criar um dicionário rápido de PLACA -> TIPO (FROTA PROPRIA ou TERCEIRO)
    placa_to_tipo = {}
    if isinstance(df_placas, pd.DataFrame) and not df_placas.empty:
        col_placa_ref = find_col(df_placas, ["PLACAS", "PLACA"])
        col_tipo_ref = find_col(df_placas, ["TIPO"])
        if col_placa_ref and col_tipo_ref:
            for _, row in df_placas.iterrows():
                p = str(row[col_placa_ref]).strip().upper().replace('-', '').replace(' ', '')
                t = str(row[col_tipo_ref]).strip().upper()
                if p and p != 'NAN':
                    for variant in normalize_plate_variants(p):
                        placa_to_tipo[variant] = t

    # Criar dicionário de PLACA -> GRUPO (baseado em veiculos, colunas ds_placa e nm_grupo)
    placa_to_grupo = {}
    if isinstance(df_veiculos, pd.DataFrame) and not df_veiculos.empty:
        col_p = find_col(df_veiculos, ["ds_placa"])
        col_g = find_col(df_veiculos, ["nm_grupo"])
        if col_p and col_g:
            # Pegando a última ocorrência de cada placa pra definir o grupo
            df_g = df_veiculos[[col_p, col_g]].dropna().drop_duplicates(subset=[col_p], keep='last')
            for _, row in df_g.iterrows():
                p = str(row[col_p]).strip().upper().replace('-', '').replace(' ', '')
                g = str(row[col_g]).strip().upper()
                if p and p != 'NAN' and g and g != 'NAN':
                    for variant in normalize_plate_variants(p):
                        placa_to_grupo[variant] = g

    def agrupar_df(df, col_data_kw, col_receita_kw, col_despesa_kw, only_despesa=False):
        if df is None or df.empty:
            return pd.DataFrame()
        
        col_data = find_col(df, col_data_kw)
        if not col_data:
            return pd.DataFrame()

        temp_df = df.copy()

        # Filtragem por tipo de frota e/ou grupo
        if (fleet_type and fleet_type != "TODOS") or (grupo and grupo != "TODOS"):
            col_placa = find_col(temp_df, ["PLACA", "CAVALO", "ds_placa"]) # 'CAVALO' (Sucata), 'ds_placa' (Veiculos)
            if col_placa:
                p_serie = temp_df[col_placa].astype(str).str.strip().str.upper().str.replace('-', '', regex=False).str.replace(' ', '', regex=False)
                if fleet_type and fleet_type != "TODOS":
                    temp_df['_tipo_frota'] = p_serie.map(placa_to_tipo)
                    temp_df = temp_df[temp_df['_tipo_frota'] == fleet_type.upper()]
                    if temp_df.empty: return pd.DataFrame()
                
                if grupo and grupo != "TODOS":
                    temp_df['_grupo_frota'] = p_serie.map(placa_to_grupo)
                    temp_df = temp_df[temp_df['_grupo_frota'] == grupo.upper()]
                    if temp_df.empty: return pd.DataFrame()
            else:
                # Fallbacks se nao tiver coluna placa
                if fleet_type and fleet_type.upper() == "TERCEIRO":
                    return pd.DataFrame()
                if grupo and grupo != "TODOS":
                    return pd.DataFrame()
        temp_df['_dt'] = pd.to_datetime(temp_df[col_data], errors='coerce')
        temp_df = temp_df.dropna(subset=['_dt'])
        if temp_df.empty: return pd.DataFrame()

        # Cria chaves de agrupamento (mês e dia)
        temp_df['_m_key'] = temp_df['_dt'].dt.strftime('%Y-%m')
        temp_df['_d_key'] = temp_df['_dt'].dt.strftime('%Y-%m-%d')
        
        col_receita = find_col(temp_df, col_receita_kw) if not only_despesa else None
        col_despesa = find_col(temp_df, col_despesa_kw)

        temp_df['_receita'] = pd.to_numeric(temp_df[col_receita], errors='coerce').fillna(0) if col_receita else 0.0
        temp_df['_despesa'] = pd.to_numeric(temp_df[col_despesa], errors='coerce').fillna(0) if col_despesa else 0.0

        return temp_df[['_m_key', '_d_key', '_receita', '_despesa']]

    # Reúne todos os dataframes em O(1) loop
    dfs_to_concat = []
    
    # Cimento and Sucata mantêm o mapeamento de receita APENAS para uso nas caixas lado direito
    df_c_grouped = agrupar_df(df_cimento, ["DATA CARREG"], ["VALOR FRETE"], ["VALOR MOTOR", "COMISS"])
    if not df_c_grouped.empty:
        df_c_grouped['_origem'] = 'cimento'
        dfs_to_concat.append(df_c_grouped)
        
    df_s_grouped = agrupar_df(df_sucata, ["DATA CARREG"], ["VALOR A RECEBER"], ["COMISS"])
    if not df_s_grouped.empty:
        df_s_grouped['_origem'] = 'sucata'
        dfs_to_concat.append(df_s_grouped)
        
    df_v_grouped = agrupar_df(df_veiculos, ["dt_documento", "DATA"], [], ["vl_total", "VALOR TOTAL"], only_despesa=True)
    if not df_v_grouped.empty:
        df_v_grouped['_origem'] = 'veiculos'
        dfs_to_concat.append(df_v_grouped)

    df_dre_grouped = agrupar_df(df_dre, ["DATA"], ["RECEITA"], [])
    if not df_dre_grouped.empty:
        df_dre_grouped['_origem'] = 'dre_frota'
        dfs_to_concat.append(df_dre_grouped)

    monthly_data = {}
    daily_data = {}

    if dfs_to_concat:
        all_data = pd.concat(dfs_to_concat, ignore_index=True)
        
        for _, row in all_data.iterrows():
            m_key = str(row.get('_m_key', ''))
            d_key = str(row.get('_d_key', ''))
            o = str(row.get('_origem', ''))
            
            r_val = float(row.get('_receita', 0.0))
            d_val = float(row.get('_despesa', 0.0))
            
            if m_key and m_key != 'nan':
                if m_key not in monthly_data:
                    monthly_data[m_key] = {"_receita": 0.0, "_despesa": 0.0, "cimento": 0.0, "sucata_dre": 0.0}
                    
                if o == 'dre_frota':
                    monthly_data[m_key]["_receita"] += r_val
                    # Todo DRE entra num balde "agregado" pra dps tirar cimento e virar sucata global
                    monthly_data[m_key]["sucata_dre"] += r_val
                elif o == 'cimento':
                    monthly_data[m_key]["cimento"] += r_val
                    
                monthly_data[m_key]["_despesa"] += d_val
                
            if d_key and d_key != 'nan':
                if d_key not in daily_data:
                    daily_data[d_key] = {"_receita": 0.0, "_despesa": 0.0}
                    
                # Calendário usa receita diária real (Cimento e Sucata)
                if o in ('cimento', 'sucata'):
                    daily_data[d_key]["_receita"] += r_val
                daily_data[d_key]["_despesa"] += d_val

    # Convert to list and sort
    chart_data = []
    for m_key, vals in monthly_data.items():
        parts = m_key.split('-')
        if len(parts) == 2:
            chart_data.append({
                "month": m_key,
                "year_int": int(parts[0]),
                "month_int": int(parts[1]),
                "receita": vals["_receita"],
                "despesa": vals["_despesa"],
                "saldo": vals["_receita"] - vals["_despesa"],
                "cimento": vals["cimento"],
                # A "Sucata" passa a ser o valor total da DRE subtraído do que é aferido no Cimento
                "sucata": max(0, vals["sucata_dre"] - vals["cimento"])
            })
    
    chart_data.sort(key=lambda x: x["month"])

    raw_daily_chart_data = []
    for d_key, vals in daily_data.items():
        parts = d_key.split('-')
        if len(parts) == 3:
            raw_daily_chart_data.append({
                "date": d_key,
                "year_int": int(parts[0]),
                "month_int": int(parts[1]),
                "day_int": int(parts[2]),
                "receita": vals["_receita"],
                "despesa": vals["_despesa"],
                "saldo": vals["_receita"] - vals["_despesa"]
            })

    # Filter by month/year if provided
    filtered_data = chart_data
    filtered_daily_data = raw_daily_chart_data
    if year:
        filtered_data = [d for d in filtered_data if d["year_int"] == year]
        filtered_daily_data = [d for d in filtered_daily_data if d["year_int"] == year]
    if month:
        filtered_data = [d for d in filtered_data if d["month_int"] == month]
        filtered_daily_data = [d for d in filtered_daily_data if d["month_int"] == month]
        
    filtered_daily_data.sort(key=lambda x: x["date"])

    # Calculate Totals
    total_receita = sum(d["receita"] for d in filtered_data)
    total_despesa = sum(d["despesa"] for d in filtered_data)
    total_saldo = total_receita - total_despesa
    cimento_total = sum(d.get("cimento", 0) for d in filtered_data)
    sucata_total = sum(d.get("sucata", 0) for d in filtered_data)

    # Get Metas
    df_metas = data_cache.get("metas", {}).get("df", pd.DataFrame()) if isinstance(data_cache.get("metas"), dict) else pd.DataFrame()
    meta_atual = 0.0
    if isinstance(df_metas, pd.DataFrame) and not df_metas.empty:
        col_mes = find_col(df_metas, ["mês", "mes", "ms"])
        col_meta = find_col(df_metas, ["meta"])
        
        if col_mes and col_meta:
            # Simple approach: sum metas for the filtered period
            for _, row in df_metas.iterrows():
                dt = pd.to_datetime(row[col_mes], errors='coerce')
                if not pd.isna(dt):
                    if (not year or dt.year == year) and (not month or dt.month == month):
                        val = row[col_meta]
                        meta_atual += float(val) if not pd.isna(val) else 0.0

    # Origens and Previous Month
    receita_anterior = 0.0

    if dfs_to_concat and year and month:
        prev_m = 12 if month == 1 else month - 1
        prev_y = year - 1 if month == 1 else year
        prev_m_key = f"{prev_y}-{prev_m:02d}"

        # Get previous month global revenue
        for c in chart_data:
            if c["month"] == prev_m_key:
                receita_anterior = c["receita"]
                break

    # ── Receita por Grupo (DRE, excluindo CIMENTO MS) ──────────────────────────
    grupos_sucata = []
    if isinstance(df_dre, pd.DataFrame) and not df_dre.empty:
        tmp_grp = df_dre.copy()
        col_data_g  = find_col(tmp_grp, ["DATA"])
        col_rec_g   = find_col(tmp_grp, ["RECEITA"])
        col_placa_g = find_col(tmp_grp, ["PLACA"])
        if col_data_g and col_rec_g and col_placa_g:
            tmp_grp['_dt'] = pd.to_datetime(tmp_grp[col_data_g], errors='coerce')
            tmp_grp = tmp_grp.dropna(subset=['_dt'])
            if year:  tmp_grp = tmp_grp[tmp_grp['_dt'].dt.year  == year]
            if month: tmp_grp = tmp_grp[tmp_grp['_dt'].dt.month == month]
            if fleet_type and fleet_type != "TODOS":
                p_s = tmp_grp[col_placa_g].astype(str).str.strip().str.upper().str.replace('-', '', regex=False).str.replace(' ', '', regex=False)
                tmp_grp['_tipo'] = p_s.map(placa_to_tipo)
                tmp_grp = tmp_grp[tmp_grp['_tipo'] == fleet_type.upper()]
            if grupo and grupo != "TODOS":
                p_s = tmp_grp[col_placa_g].astype(str).str.strip().str.upper().str.replace('-', '', regex=False).str.replace(' ', '', regex=False)
                tmp_grp['_gf'] = p_s.map(placa_to_grupo)
                tmp_grp = tmp_grp[tmp_grp['_gf'] == grupo.upper()]
            if not tmp_grp.empty:
                p_s = tmp_grp[col_placa_g].astype(str).str.strip().str.upper().str.replace('-', '', regex=False).str.replace(' ', '', regex=False)
                tmp_grp['_grupo_v'] = p_s.map(placa_to_grupo).fillna('SEM GRUPO')
                tmp_grp['_receita_v'] = pd.to_numeric(tmp_grp[col_rec_g], errors='coerce').fillna(0)
                grupos_map = {}
                for g_nome, val in tmp_grp.groupby('_grupo_v')['_receita_v'].sum().items():
                    if str(g_nome).upper() != 'CIMENTO MS':
                        grupos_map[str(g_nome)] = float(val)
                grupos_sucata = sorted(
                    [{"grupo": g, "receita": round(v, 2)} for g, v in grupos_map.items() if v > 0],
                    key=lambda x: x["receita"], reverse=True
                )

    # ── Faturamento por Placa (mensal) ─────────────────────────────────────────
    placas_map_mensal = {}

    # O Faturamento de Placas e Motoristas agora usa primariamente a DRE Frota.

    # Sucata: Agora é o DRE inteiro EXCLUINDO as placas que também rodam Cimento 
    # ou usando uma heurística de rateio. Mas de acordo com a solicitação:
    # "Para os valores de cimento deve ser puxado planilha CIMENTO MS, já sucata deve puxar DRE"
    # Faturamento por placa (DRE puro, excluindo Cimento):
    # Vamos criar um set com as placas de Cimento que faturaram no período para ajudar
    cimento_placas_periodo = set()
    if isinstance(df_cimento, pd.DataFrame) and not df_cimento.empty:
        temp_c = df_cimento.copy()
        c_dt = find_col(temp_c, ["DATA CARREG"])
        c_pl = find_col(temp_c, ["PLACA"])
        if c_dt and c_pl:
            temp_c['_dt'] = pd.to_datetime(temp_c[c_dt], errors='coerce')
            temp_c = temp_c.dropna(subset=['_dt'])
            if year:  temp_c = temp_c[temp_c['_dt'].dt.year  == year]
            if month: temp_c = temp_c[temp_c['_dt'].dt.month == month]
            cimento_placas_periodo = set(temp_c[c_pl].astype(str).str.strip().str.upper().str.replace('-', '', regex=False).str.replace(' ', '', regex=False).unique())

    if isinstance(df_dre, pd.DataFrame) and not df_dre.empty:
        temp = df_dre.copy()
        col_data    = find_col(temp, ["DATA"])
        col_receita = find_col(temp, ["RECEITA"])
        col_placa   = find_col(temp, ["PLACA"])
        if col_data and col_receita and col_placa:
            temp['_dt'] = pd.to_datetime(temp[col_data], errors='coerce')
            temp = temp.dropna(subset=['_dt'])
            if year:  temp = temp[temp['_dt'].dt.year  == year]
            if month: temp = temp[temp['_dt'].dt.month == month]
            
            # Normaliza placa DRE para comparar e excluir as de cimento (que representam a Sucata residual)
            p_s = temp[col_placa].astype(str).str.strip().str.upper().str.replace('-', '', regex=False).str.replace(' ', '', regex=False)
            temp['_placa_norm'] = p_s
            
            # O faturamento "Geral" da DRE (independente de Cimento ou Sucata) por placa
            # já foi feito e sobrecai na tela principal de metas.
            # O bloco anterior de Faturamento Mensal (Cimento + Sucata) por PLACA:
            # Como a "Receita Geral" já é DRE, Faturamento por Placa não deve mais separar Cimento e Sucata,
            # ele deve puxar da DRE. O bloco anterior puxava de Cimento e Sucata somadas.
            # Vamos substituir esse bloco para somar da DRE!
            
            if fleet_type and fleet_type != "TODOS":
                temp['_tipo'] = p_s.map(placa_to_tipo)
                temp = temp[temp['_tipo'] == fleet_type.upper()]
            if grupo and grupo != "TODOS":
                temp['_grupo'] = p_s.map(placa_to_grupo)
                temp = temp[temp['_grupo'] == grupo.upper()]
            if not temp.empty:
                temp['_receita'] = pd.to_numeric(temp[col_receita], errors='coerce').fillna(0)
                for placa, val in temp.groupby(col_placa)['_receita'].sum().items():
                    p = str(placa).strip()
                    if p and p.upper() != 'NAN' and val > 0:
                        placas_map_mensal[p] = placas_map_mensal.get(p, 0) + float(val)

    placas_mensal = sorted(
        [{"placa": p, "valor": round(v, 2)} for p, v in placas_map_mensal.items()],
        key=lambda x: x["valor"], reverse=True
    )

    # ── Faturamento por Motorista (mensal) ──────────────────────────────────────
    motoristas_map_mensal = {}

    def _acumular_motoristas(df_src, col_data_kw, col_receita_kw, col_placa_kw):
        """Agrega VALOR por MOTORISTA no mês/ano e filtros, acumulando em motoristas_map_mensal."""
        if not (isinstance(df_src, pd.DataFrame) and not df_src.empty):
            return
        tmp = df_src.copy()
        c_data  = find_col(tmp, col_data_kw)
        c_rec   = find_col(tmp, col_receita_kw)
        c_mot   = find_col(tmp, ["MOTORISTA"])
        c_placa = find_col(tmp, col_placa_kw)
        if not (c_data and c_rec and c_mot):
            return
        tmp['_dt'] = pd.to_datetime(tmp[c_data], errors='coerce')
        tmp = tmp.dropna(subset=['_dt'])
        if year:  tmp = tmp[tmp['_dt'].dt.year  == year]
        if month: tmp = tmp[tmp['_dt'].dt.month == month]
        if fleet_type and fleet_type != "TODOS" and c_placa:
            p_s = tmp[c_placa].astype(str).str.strip().str.upper().str.replace('-', '', regex=False).str.replace(' ', '', regex=False)
            tmp['_tipo'] = p_s.map(placa_to_tipo)
            tmp = tmp[tmp['_tipo'] == fleet_type.upper()]
        if grupo and grupo != "TODOS" and c_placa:
            p_s = tmp[c_placa].astype(str).str.strip().str.upper().str.replace('-', '', regex=False).str.replace(' ', '', regex=False)
            tmp['_grupo'] = p_s.map(placa_to_grupo)
            tmp = tmp[tmp['_grupo'] == grupo.upper()]
        if tmp.empty:
            return
        tmp['_receita'] = pd.to_numeric(tmp[c_rec], errors='coerce').fillna(0)
        for mot, val in tmp.groupby(c_mot)['_receita'].sum().items():
            m = str(mot).strip()
            if m and m.upper() != 'NAN' and val > 0:
                motoristas_map_mensal[m] = motoristas_map_mensal.get(m, 0) + float(val)

    _acumular_motoristas(df_cimento, ["DATA CARREG"], ["VALOR FRETE"], ["PLACA"])

    # Para "Sucata", DRE tem os valores, mas Transbottan (df_sucata) tem a relação Placa <-> Motorista.
    # Passo 1: Descobrir qual motorista estava em qual placa no mês vigente pelo df_sucata
    placa_motorista_map = {}
    if isinstance(df_sucata, pd.DataFrame) and not df_sucata.empty:
        tmp_s = df_sucata.copy()
        c_dt = find_col(tmp_s, ["DATA CARREG"])
        c_pl = find_col(tmp_s, ["CAVALO"])
        c_mot = find_col(tmp_s, ["MOTORISTA"])
        if c_dt and c_pl and c_mot:
            tmp_s['_dt'] = pd.to_datetime(tmp_s[c_dt], errors='coerce')
            tmp_s = tmp_s.dropna(subset=['_dt'])
            if year:  tmp_s = tmp_s[tmp_s['_dt'].dt.year == year]
            if month: tmp_s = tmp_s[tmp_s['_dt'].dt.month == month]
            
            # Pega o motorista mais frequente ou o último do mês para a Placa
            # (simplest approach: just map the last non-null driver found for the plate in the period)
            for _, row in tmp_s.iterrows():
                p = str(row[c_pl]).strip().upper().replace('-', '').replace(' ', '')
                m = str(row[c_mot]).strip()
                if p and p != 'NAN' and m and m.upper() != 'NAN':
                    for variant in normalize_plate_variants(p):
                        # Pega o último registro validado
                        placa_motorista_map[variant] = m

    # Passo 2: Usar DRE para somar receita usando o mapa
    if isinstance(df_dre, pd.DataFrame) and not df_dre.empty:
        tmp_d = df_dre.copy()
        c_dt = find_col(tmp_d, ["DATA"])
        c_pl = find_col(tmp_d, ["PLACA"])
        c_rec = find_col(tmp_d, ["RECEITA"])
        
        if c_dt and c_pl and c_rec:
            tmp_d['_dt'] = pd.to_datetime(tmp_d[c_dt], errors='coerce')
            tmp_d = tmp_d.dropna(subset=['_dt'])
            if year:  tmp_d = tmp_d[tmp_d['_dt'].dt.year == year]
            if month: tmp_d = tmp_d[tmp_d['_dt'].dt.month == month]
            
            p_s = tmp_d[c_pl].astype(str).str.strip().str.upper().str.replace('-', '', regex=False).str.replace(' ', '', regex=False)
            tmp_d['_placa_norm'] = p_s

            if fleet_type and fleet_type != "TODOS":
                tmp_d['_tipo'] = p_s.map(placa_to_tipo)
                tmp_d = tmp_d[tmp_d['_tipo'] == fleet_type.upper()]
            if grupo and grupo != "TODOS":
                tmp_d['_grupo'] = p_s.map(placa_to_grupo)
                tmp_d = tmp_d[tmp_d['_grupo'] == grupo.upper()]
                
            if not tmp_d.empty:
                tmp_d['_receita'] = pd.to_numeric(tmp_d[c_rec], errors='coerce').fillna(0)
                # Agregação agrupando por placa na DRE
                for placa, val in tmp_d.groupby('_placa_norm')['_receita'].sum().items():
                    p = str(placa).strip()
                    # Só adiciona para "Sucata" se não foi placa de cimento (para evitar duplicidade de receita de cimento aqui)
                    # cimento_placas_periodo was calculated above. 
                    # If this plate did cement trips, we assume the DRE covers both, but the requirement is "Cimento pulls from Cimento MS".
                    if p and p.upper() != 'NAN' and val > 0:
                        # Achando motorista no mapa de sucatas (Transbottan)
                        if p in placa_motorista_map:
                            m = placa_motorista_map[p]
                            motoristas_map_mensal[m] = motoristas_map_mensal.get(m, 0) + float(val)

    motoristas_mensal = sorted(
        [{"motorista": m, "valor": round(v, 2)} for m, v in motoristas_map_mensal.items()],
        key=lambda x: x["valor"], reverse=True
    )

    # ── Carregamentos Cimento por Motorista (mensal) ───────────────────────────
    cimento_mensal = []
    if isinstance(df_cimento, pd.DataFrame) and not df_cimento.empty:
        tmp_cm = df_cimento.copy()
        # Exclui INTERCEMENT MT (não entra na fórmula de faturamento/viagens)
        if '_sheet' in tmp_cm.columns:
            tmp_cm = tmp_cm[tmp_cm['_sheet'] != 'INTERCEMENT MT']
        c_dt_cm  = find_col(tmp_cm, ["DATA CARREG"])
        c_fr_cm  = find_col(tmp_cm, ["VALOR FRETE"])
        c_mot_cm = find_col(tmp_cm, ["MOTORISTA"])
        c_pl_cm  = find_col(tmp_cm, ["PLACA"])
        c_en_cm  = find_col(tmp_cm, ["ENTR"])
        if c_dt_cm and c_fr_cm and c_mot_cm:
            tmp_cm['_dt'] = pd.to_datetime(tmp_cm[c_dt_cm], errors='coerce')
            tmp_cm = tmp_cm.dropna(subset=['_dt'])
            if year:  tmp_cm = tmp_cm[tmp_cm['_dt'].dt.year  == year]
            if month: tmp_cm = tmp_cm[tmp_cm['_dt'].dt.month == month]
            if fleet_type and fleet_type != "TODOS" and c_pl_cm:
                p_s = tmp_cm[c_pl_cm].astype(str).str.strip().str.upper().str.replace('-', '', regex=False).str.replace(' ', '', regex=False)
                tmp_cm['_tipo'] = p_s.map(placa_to_tipo)
                tmp_cm = tmp_cm[tmp_cm['_tipo'] == fleet_type.upper()]
            if grupo and grupo != "TODOS" and c_pl_cm:
                p_s = tmp_cm[c_pl_cm].astype(str).str.strip().str.upper().str.replace('-', '', regex=False).str.replace(' ', '', regex=False)
                tmp_cm['_grupo_f'] = p_s.map(placa_to_grupo)
                tmp_cm = tmp_cm[tmp_cm['_grupo_f'] == grupo.upper()]
            if not tmp_cm.empty:
                tmp_cm['_frete'] = pd.to_numeric(tmp_cm[c_fr_cm], errors='coerce').fillna(0)
                if c_en_cm:
                    # COUNTA: conta entradas não-nulas na coluna ENTR.
                    tmp_cm['_entr_ok'] = tmp_cm[c_en_cm].notna() & (tmp_cm[c_en_cm].astype(str).str.strip().str.lower() != 'nan') & (tmp_cm[c_en_cm].astype(str).str.strip() != '')
                    grp_cm = tmp_cm.groupby(c_mot_cm).agg(viagens=('_entr_ok', 'sum'), faturamento=('_frete', 'sum')).reset_index()
                else:
                    grp_cm = tmp_cm.groupby(c_mot_cm).agg(viagens=(c_mot_cm, 'count'), faturamento=('_frete', 'sum')).reset_index()
                grp_cm = grp_cm[grp_cm['faturamento'] > 0].sort_values('faturamento', ascending=False)
                cimento_mensal = [
                    {"motorista": str(row[c_mot_cm]).strip(), "viagens": int(row['viagens']), "faturamento": round(float(row['faturamento']), 2)}
                    for _, row in grp_cm.iterrows()
                ]

    return {
        "kpis": {
            "receita": round(float(total_receita), 2),
            "despesa": round(float(total_despesa), 2),
            "saldo": round(float(total_saldo), 2),
            "meta": round(float(meta_atual), 2),
            "cimento": round(float(cimento_total), 2),
            "sucata": round(float(sucata_total), 2),
            "receita_anterior": round(float(receita_anterior), 2),
            "grupos_sucata": grupos_sucata
        },
        "chart_data": filtered_data,
        "daily_data": filtered_daily_data,
        "placas_mensal": placas_mensal,
        "motoristas_mensal": motoristas_mensal,
        "cimento_mensal": cimento_mensal
    }

@app.get("/api/dashboard")
def get_dashboard_data(month: int = None, year: int = None, fleet_type: str = "TODOS", grupo: str = "TODOS"):
    # Ensure data is up to date before serving
    check_and_reload()
    
    data = process_financial_data(month, year, fleet_type, grupo)
    
    return {
        "status": "ok", 
        "data": data
    }

@app.get("/api/filters")
def get_filters():
    """Returns dynamic filter options."""
    check_and_reload()
    
    data_veic = data_cache.get("veiculos", {})
    df_veiculos = data_veic.get("df", pd.DataFrame()) if isinstance(data_veic, dict) else pd.DataFrame()
    grupos = []
    
    if isinstance(df_veiculos, pd.DataFrame) and not df_veiculos.empty:
        col_g = find_col(df_veiculos, ["nm_grupo"])
        if col_g:
            # Dropna and get unique upper string values
            unique_grps = df_veiculos[col_g].dropna().astype(str).str.strip().str.upper().unique()
            grupos = sorted([g for g in unique_grps if g and g != 'NAN'])
            
    return {
        "status": "ok",
        "grupos": grupos
    }

@app.get("/api/day-detail")
def get_day_detail(month: int = None, year: int = None, day: int = None, fleet_type: str = "TODOS", grupo: str = "TODOS"):
    """Returns plate faturamento and cement loadings for a specific day."""
    check_and_reload()

    if not month or not year or not day:
        return {"status": "error", "message": "month, year, day are required"}

    target_date = f"{year}-{month:02d}-{day:02d}"

    df_cimento  = data_cache.get("cimento",  {}).get("df", pd.DataFrame())
    df_dre      = data_cache.get("dre_frota",{}).get("df", pd.DataFrame())
    df_placas   = data_cache.get("placas",   {}).get("df", pd.DataFrame())
    df_veiculos = data_cache.get("veiculos", {}).get("df", pd.DataFrame())

    # Build lookup dicts (same as process_financial_data)
    placa_to_tipo = {}
    if isinstance(df_placas, pd.DataFrame) and not df_placas.empty:
        col_placa_ref = find_col(df_placas, ["PLACAS", "PLACA"])
        col_tipo_ref  = find_col(df_placas, ["TIPO"])
        if col_placa_ref and col_tipo_ref:
            for _, row in df_placas.iterrows():
                p = str(row[col_placa_ref]).strip().upper().replace('-', '').replace(' ', '')
                t = str(row[col_tipo_ref]).strip().upper()
                if p and p != 'NAN':
                    for variant in normalize_plate_variants(p):
                        placa_to_tipo[variant] = t

    placa_to_grupo = {}
    if isinstance(df_veiculos, pd.DataFrame) and not df_veiculos.empty:
        col_p = find_col(df_veiculos, ["ds_placa"])
        col_g = find_col(df_veiculos, ["nm_grupo"])
        if col_p and col_g:
            df_g = df_veiculos[[col_p, col_g]].dropna().drop_duplicates(subset=[col_p], keep='last')
            for _, row in df_g.iterrows():
                p = str(row[col_p]).strip().upper().replace('-', '').replace(' ', '')
                g = str(row[col_g]).strip().upper()
                if p and p != 'NAN':
                    for variant in normalize_plate_variants(p):
                        placa_to_grupo[variant] = g

    placas_map     = {}   # placa -> valor acumulado
    motoristas_map = {}   # motorista -> valor acumulado (cimento + sucata)
    cimento_data   = []

    # ── Cimento ────────────────────────────────────────────────────────────────
    if isinstance(df_cimento, pd.DataFrame) and not df_cimento.empty:
        temp = df_cimento.copy()
        # Exclui INTERCEMENT MT (não entra na fórmula de faturamento/viagens)
        if '_sheet' in temp.columns:
            temp = temp[temp['_sheet'] != 'INTERCEMENT MT']
        col_data      = find_col(temp, ["DATA CARREG"])
        col_receita   = find_col(temp, ["VALOR FRETE"])
        col_placa     = find_col(temp, ["PLACA"])
        col_motorista = find_col(temp, ["MOTORISTA"])
        col_entr      = find_col(temp, ["ENTR"])

        if col_data:
            temp['_dt']    = pd.to_datetime(temp[col_data], errors='coerce')
            temp['_d_key'] = temp['_dt'].dt.strftime('%Y-%m-%d')
            temp = temp[temp['_d_key'] == target_date]

            if fleet_type and fleet_type != "TODOS" and col_placa:
                p_s = temp[col_placa].astype(str).str.strip().str.upper().str.replace('-', '', regex=False).str.replace(' ', '', regex=False)
                temp['_tipo'] = p_s.map(placa_to_tipo)
                temp = temp[temp['_tipo'] == fleet_type.upper()]

            if grupo and grupo != "TODOS" and col_placa:
                p_s = temp[col_placa].astype(str).str.strip().str.upper().str.replace('-', '', regex=False).str.replace(' ', '', regex=False)
                temp['_grupo'] = p_s.map(placa_to_grupo)
                temp = temp[temp['_grupo'] == grupo.upper()]

            if col_receita and not temp.empty:
                temp['_receita'] = pd.to_numeric(temp[col_receita], errors='coerce').fillna(0)

                # Faturamento por placa
                if col_placa:
                    for placa, val in temp.groupby(col_placa)['_receita'].sum().items():
                        p = str(placa).strip()
                        if p and p.upper() != 'NAN' and val > 0:
                            placas_map[p] = placas_map.get(p, 0) + float(val)

                # Faturamento por motorista (cimento)
                if col_motorista:
                    for mot, val in temp.groupby(col_motorista)['_receita'].sum().items():
                        m = str(mot).strip()
                        if m and m.upper() != 'NAN' and val > 0:
                            motoristas_map[m] = motoristas_map.get(m, 0) + float(val)

                # Carregamentos por motorista (para TabelaCimento) — usa ENTR. se disponível
                if col_motorista:
                    if col_entr:
                        temp['_entr_ok'] = temp[col_entr].notna() & (temp[col_entr].astype(str).str.strip().str.lower() != 'nan') & (temp[col_entr].astype(str).str.strip() != '')
                        grouped = temp.groupby(col_motorista).agg(
                            viagens=('_entr_ok', 'sum'),
                            faturamento=('_receita', 'sum')
                        ).reset_index()
                    else:
                        grouped = temp.groupby(col_motorista).agg(
                            viagens=(col_motorista, 'count'),
                            faturamento=('_receita', 'sum')
                        ).reset_index()
                    grouped = grouped[grouped['faturamento'] > 0].sort_values('faturamento', ascending=False)
                    cimento_data = [
                        {
                            "motorista": str(row[col_motorista]).strip(),
                            "viagens": int(row['viagens']),
                            "faturamento": round(float(row['faturamento']), 2)
                        }
                        for _, row in grouped.iterrows()
                    ]

    # ── Sucata (Diário via DRE) ────────────────────────────────────────────────
    if isinstance(df_dre, pd.DataFrame) and not df_dre.empty:
        temp = df_dre.copy()
        col_data    = find_col(temp, ["DATA"])
        col_receita = find_col(temp, ["RECEITA"])
        col_placa   = find_col(temp, ["PLACA"])

        if col_data:
            temp['_dt']    = pd.to_datetime(temp[col_data], errors='coerce')
            temp['_d_key'] = temp['_dt'].dt.strftime('%Y-%m-%d')
            temp = temp[temp['_d_key'] == target_date]
            
            # Como a DRE é mensal, os valores diários do DRE aparecem artificialmente no dia 01
            # Isso quer dizer que num clique dia 05, nada vai vir. Mas se o usuário quiser ver
            # o rateio diário de Sucata via DRE, teremos que aceitar só exibir "Sucata" se for dia 01, ou ratear.
            # Como o Calendário agora puxa Cimento e Sucata (Transbottan original) para "acender" visualmente,
            # ele vai exibir a Sucata Diária apenas se coincidir no DRE.

            if fleet_type and fleet_type != "TODOS" and col_placa:
                p_s = temp[col_placa].astype(str).str.strip().str.upper().str.replace('-', '', regex=False).str.replace(' ', '', regex=False)
                temp['_tipo'] = p_s.map(placa_to_tipo)
                temp = temp[temp['_tipo'] == fleet_type.upper()]

            if grupo and grupo != "TODOS" and col_placa:
                p_s = temp[col_placa].astype(str).str.strip().str.upper().str.replace('-', '', regex=False).str.replace(' ', '', regex=False)
                temp['_grupo'] = p_s.map(placa_to_grupo)
                temp = temp[temp['_grupo'] == grupo.upper()]

            if col_receita and not temp.empty:
                temp['_receita'] = pd.to_numeric(temp[col_receita], errors='coerce').fillna(0)

                # Para vincular Motoristas, criamos um mapa da planilha Sucata (Transbottan) do dia
                placa_motorista_map_dia = {}
                if isinstance(df_sucata, pd.DataFrame) and not df_sucata.empty:
                    tmp_s = df_sucata.copy()
                    c_dt_s = find_col(tmp_s, ["DATA CARREG"])
                    c_pl_s = find_col(tmp_s, ["CAVALO"])
                    c_mot_s = find_col(tmp_s, ["MOTORISTA"])
                    if c_dt_s and c_pl_s and c_mot_s:
                        tmp_s['_dt'] = pd.to_datetime(tmp_s[c_dt_s], errors='coerce')
                        tmp_s['_d_key'] = tmp_s['_dt'].dt.strftime('%Y-%m-%d')
                        tmp_s = tmp_s[tmp_s['_d_key'] == target_date]
                        for _, row_s in tmp_s.iterrows():
                            p_s_val = str(row_s[c_pl_s]).strip().upper().replace('-', '').replace(' ', '')
                            m_s_val = str(row_s[c_mot_s]).strip()
                            if p_s_val and p_s_val != 'NAN' and m_s_val and m_s_val.upper() != 'NAN':
                                for variant in normalize_plate_variants(p_s_val):
                                    placa_motorista_map_dia[variant] = m_s_val

                # Faturamento por placa e motorista (Mapeado via DRE + Transbottan)
                if col_placa:
                    for placa, val in temp.groupby(col_placa)['_receita'].sum().items():
                        p = str(placa).strip()
                        if p and p.upper() != 'NAN' and val > 0:
                            placas_map[p] = placas_map.get(p, 0) + float(val)
                            
                            # Adiciona a Receita para o Motorista, SE houver vínculo naquele dia na Sucata
                            if p in placa_motorista_map_dia:
                                m = placa_motorista_map_dia[p]
                                motoristas_map[m] = motoristas_map.get(m, 0) + float(val)

    placas_data = sorted(
        [{"placa": p, "valor": round(v, 2)} for p, v in placas_map.items()],
        key=lambda x: x["valor"], reverse=True
    )

    motoristas_data = sorted(
        [{"motorista": m, "valor": round(v, 2)} for m, v in motoristas_map.items()],
        key=lambda x: x["valor"], reverse=True
    )

    return {
        "status": "ok",
        "data": {
            "placas_data": placas_data,
            "motoristas_data": motoristas_data,
            "cimento_data": cimento_data,
            "target_date": target_date
        }
    }


@app.get("/api/grupos-variacao")
def get_grupos_variacao(month: int = None, year: int = None, fleet_type: str = "TODOS"):
    """Returns faturamento by vehicle group for current and previous month."""
    check_and_reload()

    df_dre      = data_cache.get("dre_frota", {}).get("df", pd.DataFrame())
    df_placas   = data_cache.get("placas",    {}).get("df", pd.DataFrame())
    df_veiculos = data_cache.get("veiculos",  {}).get("df", pd.DataFrame())

    # Build placa -> tipo lookup
    placa_to_tipo = {}
    if isinstance(df_placas, pd.DataFrame) and not df_placas.empty:
        col_placa_ref = find_col(df_placas, ["PLACAS", "PLACA"])
        col_tipo_ref  = find_col(df_placas, ["TIPO"])
        if col_placa_ref and col_tipo_ref:
            for _, row in df_placas.iterrows():
                p = str(row[col_placa_ref]).strip().upper().replace('-', '').replace(' ', '')
                t = str(row[col_tipo_ref]).strip().upper()
                if p and p != 'NAN':
                    for variant in normalize_plate_variants(p):
                        placa_to_tipo[variant] = t

    # Build placa -> grupo lookup
    placa_to_grupo = {}
    if isinstance(df_veiculos, pd.DataFrame) and not df_veiculos.empty:
        col_p = find_col(df_veiculos, ["ds_placa"])
        col_g = find_col(df_veiculos, ["nm_grupo"])
        if col_p and col_g:
            df_g = df_veiculos[[col_p, col_g]].dropna().drop_duplicates(subset=[col_p], keep='last')
            for _, row in df_g.iterrows():
                p = str(row[col_p]).strip().upper().replace('-', '').replace(' ', '')
                g = str(row[col_g]).strip().upper()
                if p and p != 'NAN':
                    for variant in normalize_plate_variants(p):
                        placa_to_grupo[variant] = g

    def get_grupo_totals(m, y):
        if not (isinstance(df_dre, pd.DataFrame) and not df_dre.empty):
            return {}
        tmp = df_dre.copy()
        col_data    = find_col(tmp, ["DATA"])
        col_receita = find_col(tmp, ["RECEITA"])
        col_placa   = find_col(tmp, ["PLACA"])
        if not (col_data and col_receita and col_placa):
            return {}
        tmp['_dt'] = pd.to_datetime(tmp[col_data], errors='coerce')
        tmp = tmp.dropna(subset=['_dt'])
        tmp = tmp[tmp['_dt'].dt.year  == y]
        tmp = tmp[tmp['_dt'].dt.month == m]
        if fleet_type and fleet_type != "TODOS":
            p_s = tmp[col_placa].astype(str).str.strip().str.upper().str.replace('-', '', regex=False).str.replace(' ', '', regex=False)
            tmp['_tipo'] = p_s.map(placa_to_tipo)
            tmp = tmp[tmp['_tipo'] == fleet_type.upper()]
        if tmp.empty:
            return {}
        p_s = tmp[col_placa].astype(str).str.strip().str.upper().str.replace('-', '', regex=False).str.replace(' ', '', regex=False)
        tmp['_grupo'] = p_s.map(placa_to_grupo).fillna('SEM GRUPO')
        tmp['_receita'] = pd.to_numeric(tmp[col_receita], errors='coerce').fillna(0)
        return tmp.groupby('_grupo')['_receita'].sum().to_dict()

    if not month or not year:
        return {"status": "error", "message": "month and year are required"}

    prev_m = 12 if month == 1 else month - 1
    prev_y = year - 1 if month == 1 else year

    atual_map    = get_grupo_totals(month, year)
    anterior_map = get_grupo_totals(prev_m, prev_y)

    all_grupos = set(atual_map.keys()) | set(anterior_map.keys())
    result = []
    for g in all_grupos:
        atual    = atual_map.get(g, 0.0)
        anterior = anterior_map.get(g, 0.0)
        variacao = round((atual - anterior) / anterior * 100, 1) if anterior > 0 else None
        result.append({
            "grupo":    g,
            "atual":    round(atual,    2),
            "anterior": round(anterior, 2),
            "variacao": variacao
        })

    result.sort(key=lambda x: x["atual"], reverse=True)
    return {"status": "ok", "data": result}


@app.get("/api/ultimos-carregamentos")
def get_ultimos_carregamentos(month: int = None, year: int = None, limit: int = 10):
    """Returns the last N carregamentos (sucata and cimento) within the selected month/year."""
    check_and_reload()

    # ── Sucata ────────────────────────────────────────────────────────────────
    sucata_result = []
    data_suc = data_cache.get("sucata", {})
    df_suc = data_suc.get("df", pd.DataFrame()) if isinstance(data_suc, dict) else pd.DataFrame()
    if isinstance(df_suc, pd.DataFrame) and not df_suc.empty:
        col_data    = find_col(df_suc, ["DATA CARREG"])
        col_motor   = find_col(df_suc, ["MOTORISTA"])
        col_cavalo  = find_col(df_suc, ["CAVALO"])
        col_produto = find_col(df_suc, ["PRODUTO"])
        col_cliente = find_col(df_suc, ["CLIENTE"])
        col_coleta  = find_col(df_suc, ["CIDADE COLETA", "COLETA"])
        col_entrega = find_col(df_suc, ["CIDADE ENTREGA", "ENTREGA"])
        col_valor   = find_col(df_suc, ["VALOR A RECEBER", "VALOR"])

        tmp = df_suc.copy()
        if col_data:
            tmp[col_data] = pd.to_datetime(tmp[col_data], errors='coerce')
            tmp = tmp.dropna(subset=[col_data])
            if month and year:
                tmp = tmp[(tmp[col_data].dt.month == month) & (tmp[col_data].dt.year == year)]
            tmp = tmp.sort_values(col_data, ascending=False)

        for _, row in tmp.head(limit).iterrows():
            sucata_result.append({
                "data":      str(row[col_data].date()) if col_data else "",
                "motorista": str(row[col_motor]).strip() if col_motor else "",
                "placa":     str(row[col_cavalo]).strip() if col_cavalo else "",
                "produto":   str(row[col_produto]).strip() if col_produto else "",
                "cliente":   str(row[col_cliente]).strip() if col_cliente else "",
                "origem":    str(row[col_coleta]).strip() if col_coleta else "",
                "destino":   str(row[col_entrega]).strip() if col_entrega else "",
                "valor":     float(row[col_valor]) if col_valor and pd.notna(row[col_valor]) else 0.0,
            })

    # ── Cimento ───────────────────────────────────────────────────────────────
    cimento_result = []
    data_cim = data_cache.get("cimento", {})
    df_cim = data_cim.get("df", pd.DataFrame()) if isinstance(data_cim, dict) else pd.DataFrame()
    if isinstance(df_cim, pd.DataFrame) and not df_cim.empty:
        tmp_c = df_cim.copy()
        # Exclui INTERCEMENT MT
        if '_sheet' in tmp_c.columns:
            tmp_c = tmp_c[tmp_c['_sheet'] != 'INTERCEMENT MT']

        c_data  = find_col(tmp_c, ["DATA CARREG"])
        c_mot   = find_col(tmp_c, ["MOTORISTA"])
        c_placa = find_col(tmp_c, ["PLACA"])
        c_peso  = find_col(tmp_c, ["PESO", "QTD", "QUANTIDADE"])
        c_dest  = find_col(tmp_c, ["DESTINO", "CIDADE ENTREGA", "ENTREGA", "LOCAL"])
        c_entr  = find_col(tmp_c, ["ENTR"])

        if c_data:
            tmp_c[c_data] = pd.to_datetime(tmp_c[c_data], errors='coerce')
            tmp_c = tmp_c.dropna(subset=[c_data])
            if month and year:
                tmp_c = tmp_c[(tmp_c[c_data].dt.month == month) & (tmp_c[c_data].dt.year == year)]
            tmp_c = tmp_c.sort_values(c_data, ascending=False)

        for _, row in tmp_c.head(limit).iterrows():
            peso_val = 0.0
            if c_peso:
                try:
                    peso_val = float(row[c_peso]) if pd.notna(row[c_peso]) else 0.0
                except (ValueError, TypeError):
                    peso_val = 0.0
            entr_val = ""
            if c_entr:
                ev = row[c_entr]
                entr_val = "" if pd.isna(ev) else str(ev).strip()

            planilha = str(row.get('_sheet', '')).strip() if '_sheet' in row.index else ''

            cimento_result.append({
                "data":      str(row[c_data].date()) if c_data else "",
                "motorista": str(row[c_mot]).strip() if c_mot else "",
                "placa":     str(row[c_placa]).strip() if c_placa else "",
                "peso":      peso_val,
                "destino":   str(row[c_dest]).strip() if c_dest and pd.notna(row[c_dest]) else "",
                "entr":      entr_val,
                "planilha":  planilha,
            })

    return {"status": "ok", "data": {"sucata": sucata_result, "cimento": cimento_result}}


@app.get("/api/combustivel")
def get_combustivel(year: int = None, group: str = "TODOS", metodo: str = "ponderada", months: str = None):
    """Retorna dados de consumo de combustível.
    metodo: 'ponderada' (km_rodado/qt_produto) | 'tanque_cheio' (usa vl_media_tc/qt_produto_tc do ERP)
    months: '1,2,3' para filtrar meses específicos (opcional)
    """
    check_and_reload()

    df_raw = data_cache.get("veiculos", {}).get("df", pd.DataFrame())
    if not isinstance(df_raw, pd.DataFrame) or df_raw.empty:
        return {"status": "ok", "data": {}}

    df = df_raw.copy()
    df['dt_documento'] = pd.to_datetime(df['dt_documento'], errors='coerce')
    df = df.dropna(subset=['dt_documento'])

    # Normalizar colunas numéricas (inclui _tc)
    for col in ['qt_produto', 'vl_total', 'vl_media', 'vl_km_rodado', 'vl_por_km',
                'vl_produto', 'qt_produto_tc', 'vl_media_tc']:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce')

    # Filtros
    available_years = sorted(df['dt_documento'].dt.year.unique().tolist(), reverse=True)
    if year:
        df = df[df['dt_documento'].dt.year == year]
    if group and group.upper() != "TODOS":
        df = df[df['nm_grupo'].astype(str).str.strip().str.upper() == group.upper()]
    if months:
        month_list = [int(m.strip()) for m in months.split(',') if m.strip().isdigit()]
        if month_list:
            df = df[df['dt_documento'].dt.month.isin(month_list)]

    grupos_disponiveis = sorted(df_raw['nm_grupo'].dropna().astype(str).str.strip().unique().tolist())

    if df.empty:
        return {"status": "ok", "data": {"kpis": {}, "monthly_trend": [], "por_grupo": [],
                                          "tabela_veiculos": [], "ranking": [],
                                          "grupos": grupos_disponiveis, "anos": available_years}}

    use_tc = (metodo == "tanque_cheio")
    df['_mes']     = df['dt_documento'].dt.to_period('M')
    df['_mes_str'] = df['dt_documento'].dt.strftime('%Y-%m')

    # Subconjunto TC: registros onde vl_media_tc está preenchido — usamos o valor direto do ERP
    if use_tc:
        df_calc = df[df['vl_media_tc'].notna()].copy().sort_values('dt_documento')
        cobertura_tc = round(len(df_calc) / len(df) * 100, 1) if len(df) > 0 else 0
        placas_tc    = int(df_calc['ds_placa'].nunique())
    else:
        df_calc = df.copy()
        cobertura_tc = None
        placas_tc    = None

    # Deduplica para cálculo de km: dois abastecimentos no mesmo veículo+data+km
    # (ex: duas bombas no mesmo posto) contam o km apenas uma vez, mas somam os litros
    # Usa apenas a data (sem hora) para a deduplicação
    df_km = df_calc.copy()
    df_km['_date'] = df_km['dt_documento'].dt.date
    df_km = df_km.drop_duplicates(subset=['ds_placa', '_date', 'vl_km_rodado'])

    # ── KPIs globais ─────────────────────────────────────────────────────────
    total_litros = float(df['qt_produto'].sum())
    total_custo  = float(df['vl_total'].sum())
    total_abast  = int(len(df))

    if use_tc:
        media_km_l = float(df_calc['vl_media_tc'].iloc[-1]) if len(df_calc) > 0 else 0
        total_km   = float(df_km['vl_km_rodado'].dropna().sum())
    else:
        total_km   = float(df_km['vl_km_rodado'].dropna().sum())
        media_km_l = total_km / total_litros if total_litros > 0 else 0

    custo_por_km    = round(total_custo / total_km, 4)    if total_km    > 0 else 0
    custo_por_litro = round(total_custo / total_litros, 4) if total_litros > 0 else 0

    # Variação MoM
    meses_ord = sorted(df_calc['_mes'].unique())
    var_media_mom = None
    if len(meses_ord) >= 2:
        m_cur  = df_calc[df_calc['_mes'] == meses_ord[-1]]
        m_prev = df_calc[df_calc['_mes'] == meses_ord[-2]]
        if use_tc:
            med_c = float(m_cur['vl_media_tc'].iloc[-1]) if len(m_cur) > 0 else 0
            med_p = float(m_prev['vl_media_tc'].iloc[-1]) if len(m_prev) > 0 else 0
        else:
            km_c_df = df_km[df_km['_mes'] == meses_ord[-1]]
            km_p_df = df_km[df_km['_mes'] == meses_ord[-2]]
            km_c = km_c_df['vl_km_rodado'].sum(); lt_c = m_cur['qt_produto'].sum()
            km_p = km_p_df['vl_km_rodado'].sum(); lt_p = m_prev['qt_produto'].sum()
            med_c = km_c / lt_c if lt_c > 0 else 0
            med_p = km_p / lt_p if lt_p > 0 else 0
        if med_p > 0:
            var_media_mom = round((med_c - med_p) / med_p * 100, 1)

    kpis = {
        "total_litros":    round(total_litros, 1),
        "total_custo":     round(total_custo, 2),
        "total_km":        round(total_km, 1),
        "media_km_l":      round(media_km_l, 3),
        "custo_por_km":    round(custo_por_km, 3),
        "custo_por_litro": round(custo_por_litro, 3),
        "total_abast":     total_abast,
        "var_media_mom":   var_media_mom,
        "cobertura_tc":    cobertura_tc,
        "placas_tc":       placas_tc,
    }

    # ── Tendência Mensal ──────────────────────────────────────────────────────
    monthly_km_mes = df_km.groupby('_mes')['vl_km_rodado'].sum().reset_index(name='km')

    if use_tc:
        monthly_tc = df_calc.groupby('_mes').agg(
            litros=('qt_produto', 'sum'),
            abast=('ds_placa', 'count'),
            media_km_l=('vl_media_tc', 'last'),
        ).reset_index()
        custo_mes = df.groupby('_mes')['vl_total'].sum().reset_index(name='custo')
        monthly_raw = monthly_tc.merge(custo_mes, on='_mes', how='left')
        monthly_raw = monthly_raw.merge(monthly_km_mes, on='_mes', how='left')
        monthly_raw['km'] = monthly_raw['km'].fillna(0)
        monthly_raw['media_km_l'] = monthly_raw['media_km_l'].round(3)
    else:
        monthly_raw = df_calc.groupby('_mes').agg(
            litros=('qt_produto', 'sum'),
            custo=('vl_total', 'sum'),
            abast=('ds_placa', 'count'),
        ).reset_index()
        monthly_raw = monthly_raw.merge(monthly_km_mes, on='_mes', how='left')
        monthly_raw['km'] = monthly_raw['km'].fillna(0)
        monthly_raw['media_km_l'] = (monthly_raw['km'] / monthly_raw['litros']).round(3)

    monthly_raw['custo_litro']     = (monthly_raw['custo'] / monthly_raw['litros']).round(3)
    monthly_raw['var_media']       = monthly_raw['media_km_l'].pct_change().mul(100).round(1)
    monthly_raw['var_custo_litro'] = monthly_raw['custo_litro'].pct_change().mul(100).round(1)

    monthly_trend = []
    for _, r in monthly_raw.iterrows():
        monthly_trend.append({
            "mes":             str(r['_mes']),
            "mes_label":       r['_mes'].strftime('%b/%y'),
            "litros":          round(float(r['litros']), 1),
            "custo":           round(float(r['custo']), 2),
            "km":              round(float(r['km']), 1),
            "abast":           int(r['abast']),
            "media_km_l":      round(float(r['media_km_l']), 3) if pd.notna(r['media_km_l']) else None,
            "custo_litro":     round(float(r['custo_litro']), 3) if pd.notna(r['custo_litro']) else None,
            "var_media":       float(r['var_media']) if pd.notna(r['var_media']) else None,
            "var_custo_litro": float(r['var_custo_litro']) if pd.notna(r['var_custo_litro']) else None,
        })

    # ── Por Grupo ─────────────────────────────────────────────────────────────
    grp_km = df_km.groupby('nm_grupo')['vl_km_rodado'].sum().reset_index(name='km')

    if use_tc:
        grp_raw = df_calc.groupby('nm_grupo').agg(
            litros=('qt_produto', 'sum'),
            custo=('vl_total', 'sum'),
            abast=('ds_placa', 'count'),
            media_km_l=('vl_media_tc', 'last'),
        ).reset_index()
        grp_raw = grp_raw.merge(grp_km, on='nm_grupo', how='left')
        grp_raw['km'] = grp_raw['km'].fillna(0)
        grp_raw['media_km_l']  = grp_raw['media_km_l'].round(3)
        grp_raw['custo_litro'] = (grp_raw['custo'] / grp_raw['litros']).round(3)
    else:
        grp_raw = df_calc.groupby('nm_grupo').agg(
            litros=('qt_produto', 'sum'),
            custo=('vl_total', 'sum'),
            abast=('ds_placa', 'count'),
        ).reset_index()
        grp_raw = grp_raw.merge(grp_km, on='nm_grupo', how='left')
        grp_raw['km'] = grp_raw['km'].fillna(0)
        grp_raw['media_km_l']  = (grp_raw['km'] / grp_raw['litros']).round(3)
        grp_raw['custo_litro'] = (grp_raw['custo'] / grp_raw['litros']).round(3)

    por_grupo = []
    for _, r in grp_raw.sort_values('custo', ascending=False).iterrows():
        por_grupo.append({
            "grupo":       str(r['nm_grupo']),
            "litros":      round(float(r['litros']), 1),
            "custo":       round(float(r['custo']), 2),
            "km":          round(float(r['km']), 1),
            "media_km_l":  round(float(r['media_km_l']), 3) if pd.notna(r['media_km_l']) else None,
            "custo_litro": round(float(r['custo_litro']), 3) if pd.notna(r['custo_litro']) else None,
            "abast":       int(r['abast']),
        })

    # ── Tabela Veículos x Mês ─────────────────────────────────────────────────
    all_months = sorted(df_calc['_mes_str'].unique().tolist())

    veh_km_mes  = df_km.groupby(['ds_placa', '_mes_str'])['vl_km_rodado'].sum().reset_index(name='km')
    veh_km_anual = df_km.groupby('ds_placa')['vl_km_rodado'].sum().reset_index(name='km_tot')

    if use_tc:
        veh_month = df_calc.groupby(['ds_placa', '_mes_str', 'nm_grupo']).agg(
            media=('vl_media_tc', 'last'),
        ).reset_index()
        veh_month['media'] = veh_month['media'].round(2)

        veh_anual = df_calc.groupby('ds_placa').agg(
            media_anual=('vl_media_tc', 'last'),
            lt_tot=('qt_produto', 'sum'),
            grupo=('nm_grupo', 'first'),
        ).reset_index()
        veh_anual = veh_anual.merge(veh_km_anual, on='ds_placa', how='left')
        veh_anual['km_tot'] = veh_anual['km_tot'].fillna(0)
        veh_anual['media_anual'] = veh_anual['media_anual'].round(2)
    else:
        veh_month_litros = df_calc.groupby(['ds_placa', '_mes_str', 'nm_grupo']).agg(
            litros=('qt_produto', 'sum'),
        ).reset_index()
        veh_month = veh_month_litros.merge(veh_km_mes, on=['ds_placa', '_mes_str'], how='left')
        veh_month['km'] = veh_month['km'].fillna(0)
        veh_month['media'] = (veh_month['km'] / veh_month['litros']).round(2)

        veh_anual = df_calc.groupby('ds_placa').agg(
            lt_tot=('qt_produto', 'sum'),
            grupo=('nm_grupo', 'first'),
        ).reset_index()
        veh_anual = veh_anual.merge(veh_km_anual, on='ds_placa', how='left')
        veh_anual['km_tot'] = veh_anual['km_tot'].fillna(0)
        veh_anual['media_anual'] = (veh_anual['km_tot'] / veh_anual['lt_tot']).round(2)

    tabela_veiculos = []
    for _, va in veh_anual.sort_values('media_anual', ascending=False).iterrows():
        placa = va['ds_placa']
        row_months = {}
        for _, vm in veh_month[veh_month['ds_placa'] == placa].iterrows():
            row_months[vm['_mes_str']] = round(float(vm['media']), 2) if pd.notna(vm['media']) else None
        tabela_veiculos.append({
            "placa":        placa,
            "grupo":        str(va['grupo']),
            "meses":        row_months,
            "media_anual":  round(float(va['media_anual']), 2) if pd.notna(va['media_anual']) else None,
            "total_km":     round(float(va['km_tot']), 1),
            "total_litros": round(float(va['lt_tot']), 1),
        })

    # ── Ranking de Veículos ───────────────────────────────────────────────────
    ranking = sorted(
        [{"placa": r["placa"], "grupo": r["grupo"], "media_anual": r["media_anual"],
          "total_km": r["total_km"], "total_litros": r["total_litros"]}
         for r in tabela_veiculos if r["media_anual"] is not None],
        key=lambda x: x["media_anual"] or 0, reverse=True
    )

    return {
        "status": "ok",
        "data": {
            "kpis":            kpis,
            "monthly_trend":   monthly_trend,
            "por_grupo":       por_grupo,
            "tabela_veiculos": tabela_veiculos,
            "all_months":      all_months,
            "ranking":         ranking,
            "grupos":          grupos_disponiveis,
            "anos":            available_years,
            "metodo":          metodo,
        }
    }


@app.get("/api/analitico")
def get_analitico(
    year: int = 2025,
    month: int = 0,           # 0 = todos os meses do ano
    cliente: str = "TODOS",
    origem: str = "TODOS",
    destino: str = "TODOS",
    frota_tipo: str = "TODOS" # Proprio | Agregado | Terceiro | TODOS
):
    check_and_reload()
    MES_ABREV = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

    def safe_float(v):
        try:
            f = float(v)
            return None if (math.isnan(f) or math.isinf(f)) else round(f, 2)
        except Exception:
            return None

    def safe_pct(new_v, old_v):
        try:
            if not old_v or old_v == 0:
                return None
            return round((new_v - old_v) / abs(old_v) * 100, 1)
        except Exception:
            return None

    # ── DRE (sempre usado sem filtro de cliente/rota) ──────────────────────────
    data_dre = data_cache.get("dre_frota", {})
    df_dre = data_dre.get("df", pd.DataFrame()).copy() if isinstance(data_dre, dict) else pd.DataFrame()
    if not df_dre.empty and "DATA" in df_dre.columns:
        df_dre["DATA"] = pd.to_datetime(df_dre["DATA"], errors="coerce")

    def dre_receita(yr, mo=0):
        if df_dre.empty or "DATA" not in df_dre.columns:
            return 0.0
        d = df_dre[df_dre["DATA"].dt.year == yr]
        if mo > 0:
            d = d[d["DATA"].dt.month == mo]
        return float(d["RECEITA"].sum())

    # ── CTRC ──────────────────────────────────────────────────────────────────
    data_ctrc = data_cache.get("ctrc", {})
    df_ctrc_full = data_ctrc.get("df", pd.DataFrame()).copy() if isinstance(data_ctrc, dict) else pd.DataFrame()

    def apply_ctrc_filters(df, yr, mo=0, apply_extra=True):
        if df.empty:
            return df
        d = df[df["dt_emissao"].dt.year == yr].copy()
        if mo > 0:
            d = d[d["dt_emissao"].dt.month == mo]
        if apply_extra:
            if cliente != "TODOS":
                d = d[d["nm_pessoa_tomador"] == cliente]
            if origem != "TODOS":
                d = d[d["nm_cidade_origem"] == origem]
            if destino != "TODOS":
                d = d[d["nm_cidade_destino"] == destino]
            if frota_tipo != "TODOS":
                d = d[d["id_proprietario_veiculo"] == frota_tipo]
        return d

    # Períodos correntes e anteriores
    prev_year = year - 1
    if month > 0:
        prev_month_mo = month - 1 if month > 1 else 12
        prev_month_yr = year if month > 1 else year - 1
    else:
        prev_month_mo, prev_month_yr = 0, prev_year

    df_cur  = apply_ctrc_filters(df_ctrc_full, year, month)
    df_prev = apply_ctrc_filters(df_ctrc_full, prev_month_yr, prev_month_mo)
    df_yoy  = apply_ctrc_filters(df_ctrc_full, prev_year, month)

    rec_cur  = dre_receita(year, month)
    rec_prev = dre_receita(prev_month_yr, prev_month_mo)
    rec_yoy  = dre_receita(prev_year, month)

    v_cur  = len(df_cur)
    v_prev = len(df_prev)
    v_yoy  = len(df_yoy)

    peso_cur  = float(df_cur["vl_peso_kg"].sum()) / 1000  if not df_cur.empty  else 0.0
    peso_prev = float(df_prev["vl_peso_kg"].sum()) / 1000 if not df_prev.empty else 0.0
    peso_yoy  = float(df_yoy["vl_peso_kg"].sum()) / 1000  if not df_yoy.empty  else 0.0

    ticket_cur  = rec_cur  / v_cur  if v_cur  > 0 else 0.0
    ticket_prev = rec_prev / v_prev if v_prev > 0 else 0.0
    ticket_yoy  = rec_yoy  / v_yoy  if v_yoy  > 0 else 0.0

    kpis = {
        "receita":      safe_float(rec_cur),
        "receita_mom":  safe_pct(rec_cur, rec_prev),
        "receita_yoy":  safe_pct(rec_cur, rec_yoy),
        "viagens":      v_cur,
        "viagens_mom":  safe_pct(v_cur, v_prev),
        "viagens_yoy":  safe_pct(v_cur, v_yoy),
        "ticket_medio": safe_float(ticket_cur),
        "ticket_mom":   safe_pct(ticket_cur, ticket_prev),
        "ticket_yoy":   safe_pct(ticket_cur, ticket_yoy),
        "peso_total":   safe_float(peso_cur),
        "peso_mom":     safe_pct(peso_cur, peso_prev),
        "peso_yoy":     safe_pct(peso_cur, peso_yoy),
    }

    # ── Tendência mensal (12 meses do ano e do ano anterior) ─────────────────
    df_year_cur  = apply_ctrc_filters(df_ctrc_full, year,      0)
    df_year_prev = apply_ctrc_filters(df_ctrc_full, prev_year, 0)

    monthly_trend = []
    for mo in range(1, 13):
        dc = df_year_cur[df_year_cur["dt_emissao"].dt.month == mo]  if not df_year_cur.empty  else pd.DataFrame()
        dp = df_year_prev[df_year_prev["dt_emissao"].dt.month == mo] if not df_year_prev.empty else pd.DataFrame()
        monthly_trend.append({
            "mes":               f"{year}-{mo:02d}",
            "mes_label":         MES_ABREV[mo - 1],
            "receita":           safe_float(dre_receita(year, mo)),
            "receita_anterior":  safe_float(dre_receita(prev_year, mo)),
            "viagens":           len(dc),
            "viagens_anterior":  len(dp),
            "peso":              safe_float(float(dc["vl_peso_kg"].sum()) / 1000) if not dc.empty else 0,
            "peso_anterior":     safe_float(float(dp["vl_peso_kg"].sum()) / 1000) if not dp.empty else 0,
        })

    # ── Top Clientes ──────────────────────────────────────────────────────────
    top_clientes = []
    if not df_cur.empty and "nm_pessoa_tomador" in df_cur.columns:
        tc_cur = df_cur.groupby("nm_pessoa_tomador").agg(
            viagens=("nr_ctrc", "count"),
            peso=("vl_peso_kg", "sum")
        ).reset_index()
        tc_yoy_grp = df_yoy.groupby("nm_pessoa_tomador")["nr_ctrc"].count().reset_index(name="viagens_ant") if not df_yoy.empty else pd.DataFrame(columns=["nm_pessoa_tomador","viagens_ant"])
        tc = tc_cur.merge(tc_yoy_grp, on="nm_pessoa_tomador", how="left")
        tc["viagens_ant"] = tc["viagens_ant"].fillna(0)
        tc["var_yoy"] = tc.apply(lambda r: safe_pct(r["viagens"], r["viagens_ant"]), axis=1)
        tc["peso_ton"] = (tc["peso"] / 1000).round(1)
        tc = tc.sort_values("viagens", ascending=False).head(15)
        top_clientes = [
            {"cliente": r["nm_pessoa_tomador"], "viagens": int(r["viagens"]),
             "viagens_ant": int(r["viagens_ant"]), "var_yoy": r["var_yoy"], "peso": r["peso_ton"]}
            for _, r in tc.iterrows()
        ]

    # ── Top Rotas ─────────────────────────────────────────────────────────────
    top_rotas = []
    if not df_cur.empty and "nm_cidade_origem" in df_cur.columns:
        df_cur["_rota"]  = df_cur["nm_cidade_origem"]  + " → " + df_cur["nm_cidade_destino"]
        df_yoy2 = df_yoy.copy()
        if not df_yoy2.empty:
            df_yoy2["_rota"] = df_yoy2["nm_cidade_origem"] + " → " + df_yoy2["nm_cidade_destino"]
        rota_cur = df_cur.groupby("_rota").agg(
            viagens=("nr_ctrc", "count"),
            peso=("vl_peso_kg", "sum")
        ).reset_index()
        rota_yoy = df_yoy2.groupby("_rota")["nr_ctrc"].count().reset_index(name="viagens_ant") if not df_yoy2.empty else pd.DataFrame(columns=["_rota","viagens_ant"])
        rr = rota_cur.merge(rota_yoy, on="_rota", how="left")
        rr["viagens_ant"] = rr["viagens_ant"].fillna(0)
        rr["var_yoy"] = rr.apply(lambda r: safe_pct(r["viagens"], r["viagens_ant"]), axis=1)
        rr["peso_ton"] = (rr["peso"] / 1000).round(1)
        rr = rr.sort_values("viagens", ascending=False).head(15)
        top_rotas = [
            {"rota": r["_rota"], "viagens": int(r["viagens"]),
             "viagens_ant": int(r["viagens_ant"]), "var_yoy": r["var_yoy"], "peso": r["peso_ton"]}
            for _, r in rr.iterrows()
        ]

    # ── Top Produtos ──────────────────────────────────────────────────────────
    top_produtos = []
    if not df_cur.empty and "nm_produto" in df_cur.columns:
        prod = df_cur.groupby("nm_produto").agg(
            viagens=("nr_ctrc", "count"),
            peso=("vl_peso_kg", "sum")
        ).reset_index()
        total_v = prod["viagens"].sum()
        prod["pct"] = (prod["viagens"] / total_v * 100).round(1) if total_v > 0 else 0
        prod["peso_ton"] = (prod["peso"] / 1000).round(1)
        prod = prod.sort_values("viagens", ascending=False).head(10)
        top_produtos = [
            {"produto": r["nm_produto"], "viagens": int(r["viagens"]),
             "pct": r["pct"], "peso": r["peso_ton"]}
            for _, r in prod.iterrows()
        ]

    # ── Distribuição Frota ────────────────────────────────────────────────────
    dist_frota = []
    if not df_cur.empty and "id_proprietario_veiculo" in df_cur.columns:
        ft = df_cur.groupby("id_proprietario_veiculo").size().reset_index(name="viagens")
        total = ft["viagens"].sum()
        ft["pct"] = (ft["viagens"] / total * 100).round(1) if total > 0 else 0
        dist_frota = [{"tipo": r["id_proprietario_veiculo"], "viagens": int(r["viagens"]), "pct": float(r["pct"])} for _, r in ft.iterrows()]

    # ── Filtros disponíveis ───────────────────────────────────────────────────
    df_ano = apply_ctrc_filters(df_ctrc_full, year, 0, apply_extra=False)
    clientes_list = sorted(df_ano["nm_pessoa_tomador"].dropna().unique().tolist())[:300] if not df_ano.empty else []
    origens_list  = sorted(df_ano["nm_cidade_origem"].dropna().unique().tolist())[:300]  if not df_ano.empty else []
    destinos_list = sorted(df_ano["nm_cidade_destino"].dropna().unique().tolist())[:300] if not df_ano.empty else []

    anos_ctrc = sorted(df_ctrc_full["dt_emissao"].dt.year.dropna().unique().astype(int).tolist()) if not df_ctrc_full.empty else [2024, 2025]
    anos_dre  = sorted(df_dre["DATA"].dt.year.dropna().unique().astype(int).tolist()) if not df_dre.empty and "DATA" in df_dre.columns else []
    anos = sorted(set(anos_ctrc + anos_dre))

    return {
        "data": {
            "kpis":          kpis,
            "monthly_trend": monthly_trend,
            "top_clientes":  top_clientes,
            "top_rotas":     top_rotas,
            "top_produtos":  top_produtos,
            "dist_frota":    dist_frota,
            "filtros": {
                "anos":      anos,
                "clientes":  clientes_list,
                "origens":   origens_list,
                "destinos":  destinos_list,
            }
        }
    }


@app.get("/api/last-update")
def get_last_update():
    """Retorna a data de modificação do arquivo mais recente na pasta de relatórios DRE frota."""
    dre_folder = r"C:\Users\Jimmy\OneDrive\12 - DOCUMENTOS\relatorios dre frota"
    last_mtime = None
    last_file = None

    if os.path.isdir(dre_folder):
        for fname in os.listdir(dre_folder):
            if fname.lower().endswith(('.xlsx', '.xls')):
                fpath = os.path.join(dre_folder, fname)
                try:
                    mtime = os.path.getmtime(fpath)
                    if last_mtime is None or mtime > last_mtime:
                        last_mtime = mtime
                        last_file = fname
                except OSError:
                    pass

    if last_mtime is not None:
        dt = datetime.fromtimestamp(last_mtime)
        return {
            "status": "ok",
            "last_update": dt.isoformat(),
            "last_file": last_file
        }

    return {"status": "ok", "last_update": None, "last_file": None}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
