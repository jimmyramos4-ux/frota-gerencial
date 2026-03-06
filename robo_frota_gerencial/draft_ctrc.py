import time
import os
import datetime
import calendar
from playwright.sync_api import sync_playwright

def get_all_frames(page):
    frames = []
    def extract_frames(frame):
        frames.append(frame)
        for child in frame.child_frames:
            extract_frames(child)
    extract_frames(page.main_frame)
    return frames

def explore():
    print("Iniciando explorador...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context()
        page = context.new_page()
        
        page.goto("https://bottan.atua.com.br/adm/")
        page.locator("input[type='text']").first.focus()
        page.locator("input[type='text']").first.fill("Jimmy")
        page.locator("input[type='password']").first.focus()
        page.locator("input[type='password']").first.fill("Jimmy01")
        page.locator("form").locator("input[type='submit'], input[type='image'], button, img").first.click()
        page.wait_for_load_state("networkidle")
        time.sleep(3)
        
        for frame in page.frames:
            try:
                loc = frame.locator("text='Emissão Doc.'")
                if loc.count() > 0:
                    loc.first.hover()
                    time.sleep(1)
                    sub = frame.locator("text='Relatório'")
                    if sub.count() > 0:
                        sub.locator("visible=true").first.hover()
                        time.sleep(2)
                        sub2 = frame.locator("text='CTRC Detalhado'")
                        if sub2.count() > 0:
                            print("Clicando em CTRC Detalhado e Aguardando nova guia do relatório...")
                            sub2.locator("visible=true").first.click(force=True)
                            
                            time.sleep(5)
                            print(f"Páginas abertas no contexto: {len(context.pages)}")
                            
                            relatorio_frame = None
                            page_atual = None
                            for p in context.pages:
                                print(f"Checando iframes na página: {p.title()}")
                                all_frames = get_all_frames(p)
                                for f in all_frames:
                                    if f.name == "relatorio":
                                        relatorio_frame = f
                                        page_atual = p
                                        break
                                if relatorio_frame:
                                    break
                                    
                            if relatorio_frame:
                                print("Frame 'relatorio' encontrado. Inserindo filtros...")
                                
                                # Filtro: Dt. Doc. >= 01/01/2025
                                relatorio_frame.locator("input[name='f_dt_inicio_1']").fill("01/01/2025")
                                
                                # Filtro: Dt. Doc. <= ultimo dia do mes atual
                                hoje = datetime.date.today()
                                ultimo_dia = calendar.monthrange(hoje.year, hoje.month)[1]
                                data_final = f"{hoje.year}-{hoje.month:02d}-{ultimo_dia:02d}" # Input date default browser format YYYY-MM-DD
                                relatorio_frame.locator("input[name='f_dt_final_1']").fill(data_final)
                                
                                # Como é tipo text no HTML o JS trata formatacao local, entao forcaremos DD/MM/YYYY tbm
                                data_final_br = f"{ultimo_dia:02d}/{hoje.month:02d}/{hoje.year}"
                                relatorio_frame.locator("input[name='f_dt_final_1']").fill(data_final_br)
                                
                                # Filtro: Tipo Analítico
                                relatorio_frame.locator("select[name='f_id_tipo_relatorio']").select_option(label="Analítico")
                                
                                # Filtro: Formato xls
                                relatorio_frame.locator("select[name='f_id_formato']").select_option(label="XLS")
                                
                                print("Baixando relatório CTRC Detalhado...")
                                with new_page.expect_download(timeout=60000) as download_info:
                                    relatorio_frame.locator("input[id='submete']").click()
                                
                                download = download_info.value
                                file_name = "ctrc_teste_download.xls"
                                download_path = os.path.join(os.getcwd(), file_name)
                                download.save_as(download_path)
                                print(f"Download concluído com sucesso: {download_path}")
                                new_page.screenshot(path="ctrc_final_sucesso.png")
                            else:
                                print("Frame 'relatorio' não encontrado na nova guia.")
                                new_page.screenshot(path="ctrc_erro_frame.png")

                            new_page.close()
                            break
            except Exception as e:
                # print(e)
                pass
        browser.close()

if __name__ == "__main__":
    explore()
