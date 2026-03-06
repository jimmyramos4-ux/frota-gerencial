import time
import os
from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
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
        
        print("Procurando o menu Frota...")
        for frame in page.frames:
            try:
                # Filtrar apenas links que contenham Frota exatamente ou algo bem próximo
                loc = frame.locator("a", has_text="Frota")
                if loc.count() > 0:
                    try:
                        loc.first.hover()
                        time.sleep(2)
                    except Exception as he:
                        print(f"Erro no hover de Frota: {he}")
                        continue
                    
                    # Submenu Relatorio (apenas links)
                    sub = frame.locator("a", has_text="Relatório")
                    if sub.count() > 0:
                        try:
                            # A palavra Relatório repete muito, vamos pegar a última ou a que ficar visível após o hover de Frota
                            sub.locator("visible=true").first.hover()
                            time.sleep(2)
                        except Exception as he2:
                            print(f"Erro no hover de Relatorio: {he2}")
                            
                        # Submenu Media de consumo
                        sub2 = frame.locator("a", has_text="Média")
                        if sub2.count() > 0:
                            try:
                                sub2.locator("visible=true").first.click()
                                print("Clicou no relatorio Média de Consumo!")
                                break
                            except Exception as ce:
                                print(f"Erro ao clicar em Média de Consumo: {ce}")
                        else:
                            print("Falhou em achar o link de Média de Consumo após hover.")
                    else:
                        print("Não achou o submenu Relatório link após hover em Frota.")
            except Exception as e:
                print(f"Exception fatal no frame: {e}")
        
        page.wait_for_load_state("networkidle")
        time.sleep(5) 
        
        page.screenshot(path="screenshot_consumo.png", full_page=True)
        print("Tirou screenshot da página de filtros de consumo")
        
        # Encontrar frame dos filtros
        report_frame = None
        for f in page.frames:
            if f.name == "conteudo" or "Média" in f.url or "consumo" in f.url:
                if "Dt. Doc. >=" in f.content():
                    report_frame = f
                    break
                    
        # Se não achou ainda, tenta frame principal
        if not report_frame:
             for f in page.frames:
                  if "Relatório de Consumo" in f.content() or "f_id_tipo" in f.content():
                      report_frame = f
                      break

        if not report_frame:
            print("ERRO: Nao achou o frame do relatorio de consumo!")
            browser.close()
            return
            
        try:
            print(f"Encontrei frame: {report_frame.name} url: {report_frame.url}")
            print("Extraindo todos os inputs e selects do frame...")
            elements = report_frame.evaluate('''() => {
                const inputs = Array.from(document.querySelectorAll('input')).map(i => ({name: i.name, id: i.id, type: i.type, value: i.value}));
                const selects = Array.from(document.querySelectorAll('select')).map(s => ({name: s.name, id: s.id}));
                const forms = Array.from(document.querySelectorAll('form')).map(f => ({name: f.name, id: f.id, action: f.action}));
                const buttons = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"]')).map(b => ({name: b.name, id: b.id, text: b.textContent || b.value, onclick: b.getAttribute('onclick')}));
                return {inputs, selects, forms, buttons};
            }''')
            
            with open("out_consumo.txt", "w", encoding="utf-8") as f:
                import json
                f.write(json.dumps(elements, indent=2))
                
            print("Elementos salvos em out_consumo.txt de forma detalhada!")

        except Exception as e:
            print(f"Erro ao extrair: {e}")

        # Mantém a janela aberta por um momento
        time.sleep(3)
        browser.close()

if __name__ == "__main__":
    run()
