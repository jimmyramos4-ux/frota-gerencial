import time
import schedule
import subprocess
import os

def run_bot(target="all"):
    print(f"\n[{time.strftime('%Y-%m-%d %H:%M:%S')}] Iniciando extração do ERP (Alvo: {target})...")
    try:
        # Usa o mesmo ambiente do python atual para rodar o script bot_erp
        script_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "bot_erp.py")
        result = subprocess.run(["python", script_path, target], capture_output=True, text=True)
        
        print(result.stdout)
        if result.stderr:
            print(f"Erros:\n{result.stderr}")
            
    except Exception as e:
        print(f"Erro ao disparar o robô ({target}): {e}")

# Agendar para rodar o DRE a cada 30 minutos
schedule.every(30).minutes.do(run_bot, target="dre")

# Agendar para rodar Média de Consumo e CTRC a cada 24 horas
schedule.every(24).hours.do(run_bot, target="consumo")
schedule.every(24).hours.do(run_bot, target="ctrc")

print("Gerenciador iniciado com os seguintes agendamentos:")
print("- Relatório 'Dem. Res. Frota' (DRE) rodará a cada 30 minutos.")
print("- Relatórios 'Média de Consumo' e 'CTRC Detalhado' rodarão a cada 24 horas.")
print("Mantenha esta janela aberta (minimize-a) para continuar executando as rotinas.")
print("Pressione Ctrl+C para encerrar.")

# Executa todos a primeira vez imediatamente
run_bot(target="dre")
run_bot(target="consumo")
run_bot(target="ctrc")

while True:
    schedule.run_pending()
    time.sleep(1)
