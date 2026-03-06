from bs4 import BeautifulSoup
import os

print("Buscando possivel form_ctrc e outros htmls...")
htmls = [f for f in os.listdir('.') if f.endswith('.html')]
for fname in htmls:
    print(f"\\n--- Arquivo: {fname} ---")
    try:
        content = open(fname, 'r', encoding='utf-8').read()
        if "CTRC" in content or "Relatório" in content or "Emissão" in content:
            soup = BeautifulSoup(content, 'html.parser')
            for tag in soup.find_all(['input', 'select', 'button', 'form']):
                print(f"{tag.name} name={tag.get('name', 'N/A')} id={tag.get('id', 'N/A')}")
    except Exception as e:
         print(f"Erro ao ler: {e}")
