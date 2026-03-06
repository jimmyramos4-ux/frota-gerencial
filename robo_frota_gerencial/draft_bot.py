import time
from playwright.sync_api import sync_playwright

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
        
        print("Clicando acessar...")
        page.locator("form").locator("input[type='submit'], input[type='image'], button, img").first.click()
        
        page.wait_for_load_state("networkidle")
        time.sleep(5)
        
        print("URL apos login: ", page.url)
        page.screenshot(path="pos_login.png")

        # Navegar para Gerencial -> dem. res. - frota
        try:
            print("Procurando o menu nos frames...")
            for frame in page.frames:
                try:
                    loc = frame.locator("text=Gerencial")
                    if loc.count() > 0:
                        print("Encontrei menu em: ", frame.url)
                        loc.first.hover()
                        time.sleep(1)
                        # Buscar o submenu
                        sub = frame.locator("text=Dem. Res. - Frota")
                        if sub.count() > 0:
                            sub.first.click()
                            print("Clicou no relatorio!")
                            break
                except Exception as e:
                    print("Erro no frame:", e)
            
            page.wait_for_load_state("networkidle")
            time.sleep(5) 
            page.screenshot(path="screenshot_filtros.png")

            # Agora vamos achar o frame principal do relatorio
            for idx, f in enumerate(page.frames):
                if f.locator("text=Formato").count() > 0 or f.locator("text=Mês >=").count() > 0:
                    print("Frame do relatorio encontrado: ", f.url)
                    with open("relatorio_frame_source.html", "w", encoding="utf-8") as file:
                        file.write(f.content())
                    
            print("Processo concluido.")
            
            html_main = page.content()
            with open("page_source_main.html", "w", encoding="utf-8") as f:
                f.write(html_main)
                
            for i, frame in enumerate(frames):
                try:
                    frame_html = frame.content()
                    with open(f"page_source_frame_{i}.html", "w", encoding="utf-8") as f:
                        f.write(frame_html)
                except Exception:
                     pass

            page.screenshot(path="screenshot_filtros.png")
            print("HTML e screenshot salvos.")
        except Exception as e:
            print(f"Erro na navegação: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    run()
