"""
Script para criar dados iniciais de autenticação.
Execute uma vez no ambiente desejado:
    python seed_auth.py

Usa a variável DATABASE_URL do ambiente (ou sqlite local por padrão).
"""
import os
from dotenv import load_dotenv
load_dotenv()

from database import SessionLocal, engine
import models
from auth import hash_password

models.Base.metadata.create_all(bind=engine)

db = SessionLocal()

FILIAIS = [
    {"nome": "Bello Alimentos", "cidade": ""},
    {"nome": "Bello Transportes", "cidade": ""},
    {"nome": "Bello Logística", "cidade": ""},
    {"nome": "Bello Frigorífico", "cidade": ""},
    {"nome": "Bello Distribuição", "cidade": ""},
]

ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "Admin@2026"
ADMIN_NOME = "Administrador"

try:
    # Criar filiais
    for f_data in FILIAIS:
        existe = db.query(models.Filial).filter(models.Filial.nome == f_data["nome"]).first()
        if not existe:
            f = models.Filial(nome=f_data["nome"], cidade=f_data["cidade"] or None)
            db.add(f)
            print(f"  [+] Filial criada: {f_data['nome']}")
        else:
            print(f"  [=] Filial já existe: {f_data['nome']}")
    db.commit()

    # Criar admin
    admin = db.query(models.Usuario).filter(models.Usuario.username == ADMIN_USERNAME).first()
    if not admin:
        admin = models.Usuario(
            nome=ADMIN_NOME,
            username=ADMIN_USERNAME,
            password_hash=hash_password(ADMIN_PASSWORD),
            perfil=models.PerfilUsuario.admin,
            filial_id=None,
        )
        db.add(admin)
        db.commit()
        print(f"  [+] Admin criado: {ADMIN_USERNAME} / {ADMIN_PASSWORD}")
    else:
        print(f"  [=] Admin já existe: {ADMIN_USERNAME}")

    print("\nSeed concluído.")
finally:
    db.close()
