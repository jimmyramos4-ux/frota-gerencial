import time
import os
from datetime import datetime
from playwright.sync_api import sync_playwright

def do_requests_download(context, report_frame, download_dir, file_name, form_selector="form"):
    import requests
    print(f"Iniciando rotina de download via requisição direta para: {file_name}")
    try:
        # 1. Obter cookies do context ativo
        playwright_cookies = context.cookies()
        session_cookies = {c['name']: c['value'] for c in playwright_cookies}
        
        # 2. Obter URL do form
        form_action = report_frame.locator(form_selector).first.get_attribute("action")
        frame_url = report_frame.url
        base_url = frame_url.rsplit('/', 1)[0]
        submit_url = f"{base_url}/{form_action}"
        
        # 3. Serializar inputs do formulário
        form_data = report_frame.locator(form_selector).first.evaluate('''form => {
            const data = {};
            const formData = new FormData(form);
            for (const [key, value] of formData.entries()) {
                data[key] = value;
            }
            return data;
        }''')
        
        print(f"Fazendo POST para: {submit_url}")
        print("Isso pode levar alguns minutos devido ao tamanho da base CTRC no Servidor ERP. Aguarde...")
        
        response = requests.post(submit_url, data=form_data, cookies=session_cookies, timeout=600)
        
        if response.status_code == 200:
            final_path = os.path.join(download_dir, file_name)
            
            # 1. Salva o binário ou texto puramente do Retorno HTTP no disco
            with open(final_path, 'wb') as f:
                f.write(response.content)
            
            # 2. Tenta Limpeza de Metadados
            if file_name.endswith('.xlsx') or file_name.endswith('.xls'):
                try:
                    import pandas as pd
                    import warnings
                    warnings.filterwarnings('ignore')
                    
                    df = None
                    try:
                        # Risco 1: Tenta ler como HTML tabular (Muitos ERPs como o FrotaGerencial enviam falsos-xls em html)
                        df_list = pd.read_html(final_path, decimal=',', thousands='.')
                        if df_list:
                            df = df_list[0]
                    except Exception as e_html:
                        # Risco 2: Se não é HTML, pode ser CSV cru (para poupar limite de memória do PHP)
                        try:
                            df = pd.read_csv(final_path, sep=';', encoding='latin1', decimal=',', thousands='.')
                        except Exception as e_csv:
                            # Risco 3: Tentar salvar a grade primeiramente purificando como Excel moderno
                            try:
                                df = pd.read_excel(final_path)
                            except Exception as e_real_xls:
                                # Fallback: Tratando erro fatal de corrupção do PHP usando OLE2 (Para o relatório massivo CTRC)
                                try:
                                    import xlrd
                                    wb = xlrd.open_workbook(final_path, ignore_workbook_corruption=True)
                                    sheet = wb.sheet_by_index(0)
                                    data = []
                                    for row_idx in range(sheet.nrows):
                                        data.append(sheet.row_values(row_idx))
                                    if len(data) > 0:
                                        df = pd.DataFrame(data[1:], columns=data[0])
                                except Exception as e_xls:
                                    print(f"Formatos rústicos falharam ao parsear: HTML({e_html}), CSV({e_csv}), XLS({e_xls})")
                    
                    if df is not None:
                        # Salva um XLSX real e veloz c/ Openpyxl e descarta a grade de texto primitiva do ERP
                        with pd.ExcelWriter(final_path, engine='openpyxl') as writer:
                            df.to_excel(writer, index=False)
                        print(f"Sucesso! Planilha XLSX purificada e salva em: {final_path}")
                        return final_path
                    else:
                        print("Aviso: Parse de tabelas falhou. Planilha primitiva enviada pelo sistema preservada intacta!")
                except Exception as ex:
                    print("Aviso de Limpeza: O bot não conseguiu recriar a planilha de extensão Excel (Formato nativo preservado).", str(ex))
            
            print(f"Sucesso! Planilha salva em: {final_path}")
            return final_path
        else:
            print(f"Erro na requisicao HTTP: Code {response.status_code}")
            return False
            
    except Exception as e:
        print(f"Erro no Download nativo: {e}")
        raise

def run(target="all"):
    download_dir = r"C:\Users\Jimmy\OneDrive\12 - DOCUMENTOS\relatorios dre frota"
    
    # Garantir que a pasta exista
    if not os.path.exists(download_dir):
        os.makedirs(download_dir)
        print(f"Criando diretório: {download_dir}")
        
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(accept_downloads=True)
        page = context.new_page()

        print("Acessando o sistema...")
        page.goto("https://bottan.atua.com.br/adm/")
        
        # Login
        print("Realizando login...")
        page.locator("input[type='text']").first.focus()
        page.locator("input[type='text']").first.fill("Jimmy")
        page.locator("input[type='password']").first.focus()
        page.locator("input[type='password']").first.fill("Jimmy01")
        
        page.locator("form").locator("input[type='submit'], input[type='image'], button, img").first.click()
        page.wait_for_load_state("networkidle")
        time.sleep(5)
        
        # === RELATORIO 1: DEM. RES. - FROTA ===
        if target in ["all", "dre"]:
            try:
                print("--- Iniciando Relatório 1: Dem. Res. - Frota ---")
                for frame in page.frames:
                    try:
                        loc = frame.locator("text=Gerencial")
                        if loc.count() > 0:
                            loc.first.hover()
                            time.sleep(1)
                            sub = frame.locator("text=Dem. Res. - Frota")
                            if sub.count() > 0:
                                sub.first.click()
                                print("Clicou no relatorio DRE Frota!")
                                break
                    except Exception:
                        pass
                
                page.wait_for_load_state("networkidle")
                time.sleep(5) 
                
                report_frame1 = None
                for f in page.frames:
                    if f.locator("text=Formato").count() > 0 or f.locator("text=Mês >=").count() > 0:
                        report_frame1 = f
                        break
                        
                if report_frame1:
                    print("Preenchendo filtros DRE...")
                    current_month = datetime.now().strftime("%m/%Y")
                    
                    report_frame1.locator("input[name='f_dt_inicio_1']").fill(current_month)
                    report_frame1.locator("input[name='f_dt_final_1']").fill(current_month)
                    report_frame1.locator("select[name='f_id_conjunto']").select_option("2")
                    report_frame1.locator("select[name='f_id_tipo_relatorio']").select_option("2")
                    report_frame1.locator("select[name='f_id_formato']").select_option("2")
                    
                    file_name1 = f"Relatorio_frota_{datetime.now().strftime('%m%Y')}.xls"
                    do_requests_download(context, report_frame1, download_dir, file_name1)
                else:
                    print("ERRO: Nao achou o frame do relatorio DRE!")
            except Exception as e1:
                print(f"Erro no relatorio 1: {e1}")
            
        # === RELATORIO 2: DESEMPENHO/CONSUMO ===
        if target in ["all", "consumo"]:
            try:
                print("--- Iniciando Relatório 2: Média de Consumo ---")
                for frame in page.frames:
                    try:
                        loc = frame.locator("a", has_text="Frota")
                        if loc.count() > 0:
                            loc.first.hover()
                            time.sleep(2)
                            
                            sub = frame.locator("a", has_text="Relatório")
                            if sub.count() > 0:
                                sub.locator("visible=true").first.hover()
                                time.sleep(2)
                                
                                sub2 = frame.locator("a", has_text="Média")
                                if sub2.count() > 0:
                                    sub2.locator("visible=true").first.click()
                                    print("Clicou no relatorio Média de Consumo!")
                                    break
                    except Exception:
                        pass
                
                page.wait_for_load_state("networkidle")
                time.sleep(5) 
                
                report_frame2 = None
                for f in page.frames:
                    if f.name == "conteudo" or "Média" in f.url or "consumo" in f.url:
                        if "Dt. Doc. >=" in f.content():
                            report_frame2 = f
                            break
                            
                if not report_frame2:
                     for f in page.frames:
                          if "Relatório de Consumo" in f.content() or "f_id_tipo" in f.content():
                              report_frame2 = f
                              break
                              
                if report_frame2:
                    print("Preenchendo filtros de Consumo...")
                    import calendar
                    now = datetime.now()
                    last_day = calendar.monthrange(now.year, now.month)[1]
                    end_dt = f"{last_day:02d}/{now.month:02d}/{now.year}"
                    start_dt = "01/01/2025"
                    
                    # dt inicio e fim - form de consumo
                    if report_frame2.locator("input[name='f_dt_inicio']").count() > 0:
                       report_frame2.locator("input[name='f_dt_inicio']").fill(start_dt)
                    if report_frame2.locator("input[name='f_dt_final']").count() > 0:
                       report_frame2.locator("input[name='f_dt_final']").fill(end_dt)
                    
                    # Tipo: Analitico (value=2)
                    if report_frame2.locator("select[name='f_id_tipo_relatorio']").count() > 0:
                       report_frame2.locator("select[name='f_id_tipo_relatorio']").select_option("2")
                    
                    # Formato: XLS (value=2 ou 3 em alguns relatorios, mas o padrao Mais Frete xls=2)
                    if report_frame2.locator("select[name='f_id_formato']").count() > 0:
                       report_frame2.locator("select[name='f_id_formato']").select_option("2")
                    
                    # Pasta e Nome novos conforme pedido
                    download_dir2 = r"C:\Users\Jimmy\OneDrive\12 - DOCUMENTOS\relatorios abastecimento"
                    if not os.path.exists(download_dir2):
                        os.makedirs(download_dir2)
                        print(f"Criando diretório: {download_dir2}")
                        
                    file_name2 = "consumo combustivel.xlsx"
                    do_requests_download(context, report_frame2, download_dir2, file_name2, form_selector="form[name='form']")
                else:
                    print("ERRO: Nao achou o frame do relatorio de Consumo!")
            except Exception as e2:
                print(f"Erro no relatorio 2: {e2}")

        # === RELATORIO 3: CTRC DETALHADO ===
        if target in ["all", "ctrc"]:
            try:
                print("--- Iniciando Relatório 3: CTRC Detalhado (Via URL Direta) ---")
                
                # Ao invés de lutar contra o sub-menu instável do ERP, navegamos 
                # diretamente à página de filtros embutida usando a sessão ativa.
                page.goto("https://bottan.atua.com.br/adm/fil_ctrc_detalhado.php")
                page.wait_for_load_state("networkidle")
                time.sleep(3)
                
                print("Aguardando carregamento da interface de filtros...")
                report_frame3 = None
                
                for iter_n in range(15):
                    for f in page.frames:
                        try:
                            if f.locator("input[name='f_dt_emissao_inicio']").count() > 0:
                                report_frame3 = f
                                break
                        except Exception:
                            pass
                    
                    if report_frame3:
                        break
                                
                    time.sleep(2)
                
                if not report_frame3:
                     page.screenshot(path="bug_debug3.png", full_page=True)
                        
                if report_frame3:
                    print("Preenchendo filtros de CTRC Detalhado...")
                    import calendar
                    
                    # 1. Carregar Filtro Salvo do Cliente
                    try:
                        filtro_input = report_frame3.locator("input[placeholder='Filtros salvos...']")
                        if filtro_input.count() > 0:
                            filtro_input.fill("DETALHES CARREGAMENTOS - 3")
                            page.wait_for_timeout(1500) # tempo pro ajax do filter store
                            # Clicar na sugestao que aparecer no autocomplete
                            report_frame3.locator("text='DETALHES CARREGAMENTOS - 3'").first.click()
                            page.wait_for_timeout(1000) # delay para preencher os inputs da tela
                    except Exception as e:
                        print("Aviso: Falha ao carregar filtro salvo:", e)

                    hj = datetime.today()
                    primeira_data = "01/01/2024"
                    ultimo_dia = calendar.monthrange(hj.year, hj.month)[1]
                    ultima_data = f"{ultimo_dia:02d}/{hj.month:02d}/{hj.year}"
                    
                    # 2. Sobrescrever Datas de Emissão conforme Escopo
                    report_frame3.locator("input[name='f_dt_emissao_inicio']").fill(primeira_data)
                    report_frame3.locator("input[name='f_dt_emissao_final']").fill(ultima_data)
                    
                    # 3. Garantir disparo sem Forçar formato do Cliente
                    print("Filtros Salvos aplicados e Datas ajustadas para >= 2024. Mantendo formatação original e emitindo Carga.")
                    
                    # Clicar em Gerar
                    report_frame3.locator("input[type='submit'][value='Gerar']").click()
                    print("Mandou gerar Relatório 3. Extraindo do JS...")
                    # Pasta e Nome novos (CTRC Detalhado)
                    download_dir3 = r"C:\Users\Jimmy\OneDrive\12 - DOCUMENTOS\relatorios analiticos"
                    if not os.path.exists(download_dir3):
                        os.makedirs(download_dir3)
                        print(f"Criando diretório: {download_dir3}")
                        
                    file_name3 = "Base_ctrc_detalhado.xlsx"
                    do_requests_download(context, report_frame3, download_dir3, file_name3, form_selector="form[name='form']")
                else:
                    print("ERRO: Nao achou o frame do relatorio CTRC Detalhado!")
            except Exception as e3:
                print(f"Erro no relatorio 3: {e3}")

if __name__ == "__main__":
    import sys
    tgt = sys.argv[1] if len(sys.argv) > 1 else "all"
    run(tgt)
