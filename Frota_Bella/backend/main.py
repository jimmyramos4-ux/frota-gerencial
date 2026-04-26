import os
import shutil
import math
import smtplib
import io
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from pathlib import Path
from datetime import datetime
from typing import Optional

from dotenv import load_dotenv
load_dotenv()

# ── Configuração de E-mail ────────────────────────────────────────────────────
EMAIL_REMETENTE = "jimmyramos4@gmail.com"
EMAIL_SENHA_APP = "gvyvopdn pizufsqb".replace(" ", "")

from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, Query
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_, func

import models
import schemas
from database import engine, get_db, Base

# ── App setup ─────────────────────────────────────────────────────────────────

Base.metadata.create_all(bind=engine)

# Migration: adiciona colunas novas se não existirem (SQLite e PostgreSQL)
def _add_column_if_missing(engine, table, col_def):
    from sqlalchemy import text, inspect
    insp = inspect(engine)
    cols = [c["name"] for c in insp.get_columns(table)]
    if col_def[0] not in cols:
        with engine.connect() as conn:
            dialect = engine.dialect.name
            if dialect == "postgresql":
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {col_def[0]} {col_def[1]}"))
            else:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col_def[0]} {col_def[1]}"))
            conn.commit()

_add_column_if_missing(engine, "veiculos", ("ultimo_km", "INTEGER"))
_add_column_if_missing(engine, "veiculos", ("ultimo_km_data", "DATETIME"))
_add_column_if_missing(engine, "veiculos", ("capacidade", "VARCHAR(100)"))
_add_column_if_missing(engine, "veiculos", ("vinculo", "VARCHAR(50)"))
_add_column_if_missing(engine, "veiculos", ("centro_custo", "VARCHAR(100)"))
_add_column_if_missing(engine, "veiculos", ("motorista_id", "INTEGER REFERENCES motoristas(id)"))
_add_column_if_missing(engine, "motoristas", ("cpf", "VARCHAR(20)"))
_add_column_if_missing(engine, "motoristas", ("nr_registro_cnh", "VARCHAR(30)"))
_add_column_if_missing(engine, "motoristas", ("validade_cnh", "VARCHAR(10)"))
_add_column_if_missing(engine, "motoristas", ("categoria_cnh", "VARCHAR(10)"))
_add_column_if_missing(engine, "motoristas", ("telefone", "VARCHAR(30)"))
_add_column_if_missing(engine, "motoristas", ("cidade_emissao_cnh", "VARCHAR(100)"))
_add_column_if_missing(engine, "motoristas", ("dt_exame_toxicologico", "VARCHAR(10)"))
_add_column_if_missing(engine, "motoristas", ("tipo", "VARCHAR(50)"))
_add_column_if_missing(engine, "motoristas", ("dt_nascimento", "VARCHAR(10)"))
_add_column_if_missing(engine, "motoristas", ("ativo", "BOOLEAN DEFAULT 1"))
_add_column_if_missing(engine, "motoristas", ("email", "VARCHAR(200)"))

# Cria tabela oficinas_prestadores se não existir (nova funcionalidade)
try:
    from sqlalchemy import text as _text, inspect as _inspect
    _insp = _inspect(engine)
    if "oficinas_prestadores" not in _insp.get_table_names():
        models.OficinaPrestador.__table__.create(bind=engine)
except Exception:
    pass

# Migração: cria tabela ativos e adiciona ativo_id em manutencoes (+ torna veiculo_id nullable)
def _migrate_ativos(engine):
    from sqlalchemy import text, inspect
    insp = inspect(engine)
    tables = insp.get_table_names()

    if "ativos" not in tables:
        models.Ativo.__table__.create(bind=engine)

    cols = [c["name"] for c in insp.get_columns("manutencoes")]
    if "ativo_id" not in cols:
        # Recria manutencoes com veiculo_id nullable e ativo_id
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE manutencoes RENAME TO manutencoes_old"))
            conn.commit()
        models.Manutencao.__table__.create(bind=engine)
        with engine.connect() as conn:
            conn.execute(text("""
                INSERT INTO manutencoes
                    (id, veiculo_id, ativo_id, motorista_id, km_entrada, horimetro_entrada,
                     dt_inicio, dt_previsao, dt_termino, responsavel_manutencao, requisitante,
                     status, prioridade, tipo, servicos_solicitados, observacao, created_at, updated_at)
                SELECT id, veiculo_id, NULL, motorista_id, km_entrada, horimetro_entrada,
                     dt_inicio, dt_previsao, dt_termino, responsavel_manutencao, requisitante,
                     status, prioridade, tipo, servicos_solicitados, observacao, created_at, updated_at
                FROM manutencoes_old
            """))
            conn.commit()
            conn.execute(text("DROP TABLE manutencoes_old"))
            conn.commit()

try:
    _migrate_ativos(engine)
except Exception as _e:
    print(f"[migration] ativos: {_e}")

_add_column_if_missing(engine, "solicitacoes", ("ativo_id", "INTEGER REFERENCES ativos(id)"))
_add_column_if_missing(engine, "solicitacoes", ("parte_veiculo", "VARCHAR(200)"))
_add_column_if_missing(engine, "solicitacoes", ("acao", "TEXT"))
_add_column_if_missing(engine, "solicitacoes", ("prazo_acao", "VARCHAR(10)"))
_add_column_if_missing(engine, "arquivos_manutencao", ("conteudo", "TEXT"))
_add_column_if_missing(engine, "arquivos_motorista", ("conteudo", "TEXT"))
_add_column_if_missing(engine, "arquivos_veiculo", ("conteudo", "TEXT"))


def _make_column_nullable(engine, table, column):
    from sqlalchemy import text, inspect
    if engine.dialect.name != "postgresql":
        return
    insp = inspect(engine)
    cols = {c["name"]: c for c in insp.get_columns(table)}
    if column in cols and not cols[column]["nullable"]:
        with engine.connect() as conn:
            conn.execute(text(f"ALTER TABLE {table} ALTER COLUMN {column} DROP NOT NULL"))
            conn.commit()

_make_column_nullable(engine, "arquivos_veiculo", "caminho")
_make_column_nullable(engine, "arquivos_motorista", "caminho")
_make_column_nullable(engine, "arquivos_manutencao", "caminho")

app = FastAPI(title="Frota Bello API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path(__file__).parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

@app.get("/health")
def health():
    return {"status": "ok"}

app.mount("/api/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# ── Frontend static files ──────────────────────────────────────────────────────
FRONTEND_DIST = Path(__file__).parent.parent / "frontend" / "dist"


# ── Seed data ─────────────────────────────────────────────────────────────────

def seed_data(db: Session):
    if db.query(models.Veiculo).count() > 0:
        # seed lookup tables if empty
        if db.query(models.ParteVeiculo).count() == 0:
            partes = ["Motor", "Freios", "Suspensão", "Elétrica", "Câmbio", "Embreagem",
                      "Pneus", "Lataria", "Filtros", "Radiador", "Escapamento", "Direção"]
            db.add_all([models.ParteVeiculo(nome=p) for p in partes])
            db.commit()
        if db.query(models.TipoServicoCad).count() == 0:
            tipos = ["Preventivo", "Corretivo", "Revisão", "Inspeção", "Troca", "Reparo", "Calibração"]
            db.add_all([models.TipoServicoCad(nome=t) for t in tipos])
            db.commit()
        return

    veiculos = [
        models.Veiculo(placa="ABC-1234", descricao="Volkswagen Gol 2020", tipo="Passeio", grupo="Leve", ano=2020, chassi="9BWZZZ377VT004251"),
        models.Veiculo(placa="DEF-5678", descricao="Ford Ranger XLS 2019", tipo="Utilitário", grupo="Médio", ano=2019, chassi="9BFZZZ6K5KBH12345"),
        models.Veiculo(placa="GHI-9012", descricao="Mercedes Actros 2022", tipo="Caminhão", grupo="Pesado", ano=2022, chassi="WDB9634031L456789"),
        models.Veiculo(placa="JKL-3456", descricao="Iveco Daily 2021", tipo="Van", grupo="Médio", ano=2021, chassi="ZCFC35A00M1234567"),
        models.Veiculo(placa="MNO-7890", descricao="Toyota Hilux 2023", tipo="Utilitário", grupo="Médio", ano=2023, chassi="MR0EX32G102345678"),
    ]
    db.add_all(veiculos)

    motoristas = [
        models.Motorista(codigo="MOT001", nome="João Silva"),
        models.Motorista(codigo="MOT002", nome="Maria Santos"),
        models.Motorista(codigo="MOT003", nome="Carlos Oliveira"),
        models.Motorista(codigo="MOT004", nome="Ana Costa"),
        models.Motorista(codigo="MOT005", nome="Pedro Lima"),
    ]
    db.add_all(motoristas)
    db.flush()

    manutencoes = [
        models.Manutencao(
            veiculo_id=veiculos[0].id,
            motorista_id=motoristas[0].id,
            km_entrada=45230,
            dt_inicio=datetime(2026, 2, 10, 8, 0),
            dt_previsao=datetime(2026, 2, 12, 17, 0),
            dt_termino=datetime(2026, 2, 11, 15, 30),
            responsavel_manutencao="Carlos Mecânico",
            requisitante="Gerência",
            status="Em Andamento",
            prioridade="Alta",
            tipo="Corretiva",
            servicos_solicitados="Troca de óleo e filtros",
        ),
        models.Manutencao(
            veiculo_id=veiculos[1].id,
            motorista_id=motoristas[1].id,
            km_entrada=78500,
            dt_inicio=datetime(2026, 2, 15, 9, 0),
            dt_previsao=datetime(2026, 2, 18, 17, 0),
            dt_termino=None,
            responsavel_manutencao="José Técnico",
            requisitante="Logística",
            status="Em Andamento",
            prioridade="Média",
            tipo="Corretiva",
            servicos_solicitados="Revisão de freios e suspensão",
        ),
        models.Manutencao(
            veiculo_id=veiculos[2].id,
            motorista_id=motoristas[2].id,
            km_entrada=120000,
            dt_inicio=datetime(2026, 1, 20, 7, 0),
            dt_previsao=datetime(2026, 1, 25, 17, 0),
            dt_termino=datetime(2026, 1, 24, 14, 0),
            responsavel_manutencao="André Especialista",
            requisitante="Operações",
            status="Finalizada",
            prioridade="Baixa",
            tipo="Preventiva",
            servicos_solicitados="Manutenção preventiva completa",
        ),
        models.Manutencao(
            veiculo_id=veiculos[3].id,
            motorista_id=None,
            km_entrada=35000,
            dt_inicio=datetime(2026, 3, 1, 10, 0),
            dt_previsao=datetime(2026, 3, 3, 17, 0),
            dt_termino=None,
            responsavel_manutencao="Marcos Mecânico",
            requisitante="Administração",
            status="Cancelada",
            prioridade=None,
            tipo="Corretiva",
            servicos_solicitados="Reparo na lataria",
        ),
        models.Manutencao(
            veiculo_id=veiculos[4].id,
            motorista_id=motoristas[4].id,
            km_entrada=15000,
            dt_inicio=datetime(2026, 3, 5, 8, 30),
            dt_previsao=datetime(2026, 3, 7, 17, 0),
            dt_termino=None,
            responsavel_manutencao="Paulo Técnico",
            requisitante="Comercial",
            status="Em Andamento",
            prioridade="Alta",
            tipo="Preventiva",
            servicos_solicitados="Revisão dos 15.000 km",
        ),
    ]
    db.add_all(manutencoes)
    db.flush()

    servicos = [
        models.ServicoVeiculo(
            manutencao_id=manutencoes[0].id,
            status="Em Andamento",
            parte_veiculo="Motor",
            servico="Troca de Óleo",
            tipo_servico="Preventivo",
            tipo_uso="Preventiva",
            dt_servico=datetime(2026, 2, 10).date(),
            pessoa_responsavel="Carlos Mecânico",
            descricao="Troca óleo 10W40 sintético",
            valor=250.00,
            horas_trabalhadas="2:00",
        ),
        models.ServicoVeiculo(
            manutencao_id=manutencoes[0].id,
            status="Finalizado",
            parte_veiculo="Filtros",
            servico="Troca Filtro de Ar",
            tipo_servico="Preventivo",
            tipo_uso="Preventiva",
            dt_servico=datetime(2026, 2, 10).date(),
            pessoa_responsavel="Carlos Mecânico",
            descricao="Filtro de ar K&N",
            valor=120.00,
            horas_trabalhadas="0:30",
        ),
    ]
    db.add_all(servicos)
    db.commit()


@app.on_event("startup")
def on_startup():
    db = next(get_db())
    try:
        seed_data(db)
    finally:
        db.close()

    import threading, time, urllib.request
    def _keep_alive():
        # auto-ping a cada 4 minutos para evitar sleep no Render free tier
        time.sleep(60)
        while True:
            try:
                urllib.request.urlopen("http://localhost:8000/health", timeout=10)
            except Exception:
                pass
            time.sleep(240)
    t = threading.Thread(target=_keep_alive, daemon=True)
    t.start()


# ── Partes Veiculo ────────────────────────────────────────────────────────────

@app.get("/api/partes-veiculo", response_model=schemas.PaginatedPartesVeiculo)
def list_partes_veiculo(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=200),
    search: Optional[str] = None,
    ativo: Optional[str] = None,
    all: Optional[bool] = False,
    db: Session = Depends(get_db),
):
    query = db.query(models.ParteVeiculo)
    if search:
        query = query.filter(models.ParteVeiculo.nome.ilike(f"%{search}%"))
    if ativo is not None and ativo != '':
        query = query.filter(models.ParteVeiculo.ativo == (ativo.lower() in ('true', '1', 'sim')))
    query = query.order_by(models.ParteVeiculo.nome)
    if all:
        items = query.all()
        return {"items": items, "total": len(items), "page": 1, "per_page": len(items) or 1, "total_pages": 1}
    total = query.count()
    total_pages = max(1, math.ceil(total / per_page))
    items = query.offset((page - 1) * per_page).limit(per_page).all()
    return {"items": items, "total": total, "page": page, "per_page": per_page, "total_pages": total_pages}

@app.get("/api/partes-veiculo/lookup", response_model=list[schemas.ParteVeiculoOut])
def lookup_partes_veiculo(search: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.ParteVeiculo).filter(models.ParteVeiculo.ativo == True)
    if search:
        query = query.filter(models.ParteVeiculo.nome.ilike(f"%{search}%"))
    return query.order_by(models.ParteVeiculo.nome).limit(50).all()

@app.post("/api/partes-veiculo", response_model=schemas.ParteVeiculoOut, status_code=201)
def create_parte_veiculo(data: schemas.ParteVeiculoCreate, db: Session = Depends(get_db)):
    existing = db.query(models.ParteVeiculo).filter(models.ParteVeiculo.nome == data.nome).first()
    if existing:
        raise HTTPException(status_code=400, detail="Parte já cadastrada")
    item = models.ParteVeiculo(**data.dict())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@app.get("/api/partes-veiculo/{item_id}", response_model=schemas.ParteVeiculoOut)
def get_parte_veiculo(item_id: int, db: Session = Depends(get_db)):
    item = db.query(models.ParteVeiculo).filter(models.ParteVeiculo.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Não encontrado")
    return item

@app.put("/api/partes-veiculo/{item_id}", response_model=schemas.ParteVeiculoOut)
def update_parte_veiculo(item_id: int, data: schemas.ParteVeiculoCreate, db: Session = Depends(get_db)):
    item = db.query(models.ParteVeiculo).filter(models.ParteVeiculo.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Não encontrado")
    for k, v in data.dict().items():
        setattr(item, k, v)
    db.commit()
    db.refresh(item)
    return item

@app.delete("/api/partes-veiculo/{item_id}", status_code=204)
def delete_parte_veiculo(item_id: int, db: Session = Depends(get_db)):
    item = db.query(models.ParteVeiculo).filter(models.ParteVeiculo.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Não encontrado")
    db.delete(item)
    db.commit()


# ── Oficinas / Prestadores ────────────────────────────────────────────────────

@app.get("/api/oficinas-prestadores", response_model=schemas.PaginatedOficinasPrestadores)
def list_oficinas_prestadores(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=200),
    search: Optional[str] = None,
    cidade: Optional[str] = None,
    especialidade: Optional[str] = None,
    ativo: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.OficinaPrestador)
    if search:
        query = query.filter(
            or_(
                models.OficinaPrestador.nome.ilike(f"%{search}%"),
                models.OficinaPrestador.cnpj_cpf.ilike(f"%{search}%"),
                models.OficinaPrestador.telefone.ilike(f"%{search}%"),
            )
        )
    if cidade:
        query = query.filter(models.OficinaPrestador.cidade.ilike(f"%{cidade}%"))
    if especialidade:
        query = query.filter(models.OficinaPrestador.especialidade.ilike(f"%{especialidade}%"))
    if ativo is not None:
        query = query.filter(models.OficinaPrestador.ativo == (ativo.lower() == 'true'))
    total = query.count()
    total_pages = max(1, math.ceil(total / per_page))
    items = query.order_by(models.OficinaPrestador.nome).offset((page - 1) * per_page).limit(per_page).all()
    return {"items": items, "total": total, "page": page, "per_page": per_page, "total_pages": total_pages}


@app.get("/api/oficinas-prestadores/lookup", response_model=list[schemas.OficinaPrestadorOut])
def lookup_oficinas_prestadores(search: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.OficinaPrestador).filter(models.OficinaPrestador.ativo == True)
    if search:
        query = query.filter(models.OficinaPrestador.nome.ilike(f"%{search}%"))
    return query.order_by(models.OficinaPrestador.nome).limit(50).all()


@app.post("/api/oficinas-prestadores", response_model=schemas.OficinaPrestadorOut, status_code=201)
def create_oficina_prestador(data: schemas.OficinaPrestadorCreate, db: Session = Depends(get_db)):
    existing = db.query(models.OficinaPrestador).filter(models.OficinaPrestador.nome == data.nome).first()
    if existing:
        raise HTTPException(status_code=400, detail="Oficina/Prestador já cadastrado com esse nome")
    item = models.OficinaPrestador(**data.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@app.get("/api/oficinas-prestadores/{item_id}", response_model=schemas.OficinaPrestadorOut)
def get_oficina_prestador(item_id: int, db: Session = Depends(get_db)):
    item = db.query(models.OficinaPrestador).filter(models.OficinaPrestador.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Não encontrado")
    return item


@app.put("/api/oficinas-prestadores/{item_id}", response_model=schemas.OficinaPrestadorOut)
def update_oficina_prestador(item_id: int, data: schemas.OficinaPrestadorUpdate, db: Session = Depends(get_db)):
    item = db.query(models.OficinaPrestador).filter(models.OficinaPrestador.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Não encontrado")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


@app.delete("/api/oficinas-prestadores/{item_id}", status_code=204)
def delete_oficina_prestador(item_id: int, db: Session = Depends(get_db)):
    item = db.query(models.OficinaPrestador).filter(models.OficinaPrestador.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Não encontrado")
    db.delete(item)
    db.commit()


# ── Tipos Servico ─────────────────────────────────────────────────────────────

@app.get("/api/tipos-servico", response_model=schemas.PaginatedTiposServico)
def list_tipos_servico(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=200),
    search: Optional[str] = None,
    parte_veiculo: Optional[str] = None,
    descricao: Optional[str] = None,
    uso: Optional[str] = None,
    ativo: Optional[str] = None,
    all: Optional[bool] = False,
    db: Session = Depends(get_db),
):
    query = db.query(models.TipoServicoCad)
    if search:
        query = query.filter(models.TipoServicoCad.nome.ilike(f"%{search}%"))
    if parte_veiculo:
        query = query.filter(models.TipoServicoCad.parte_veiculo.ilike(f"%{parte_veiculo}%"))
    if descricao:
        query = query.filter(models.TipoServicoCad.descricao.ilike(f"%{descricao}%"))
    if uso:
        query = query.filter(models.TipoServicoCad.uso == uso)
    if ativo is not None and ativo != '':
        query = query.filter(models.TipoServicoCad.ativo == (ativo.lower() in ('true', '1', 'sim')))
    query = query.order_by(models.TipoServicoCad.nome)
    if all:
        items = query.all()
        return {"items": items, "total": len(items), "page": 1, "per_page": len(items) or 1, "total_pages": 1}
    total = query.count()
    total_pages = max(1, math.ceil(total / per_page))
    items = query.offset((page - 1) * per_page).limit(per_page).all()
    return {"items": items, "total": total, "page": page, "per_page": per_page, "total_pages": total_pages}

@app.get("/api/tipos-servico/lookup", response_model=list[schemas.TipoServicoCadOut])
def lookup_tipos_servico(search: Optional[str] = None, parte_veiculo: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.TipoServicoCad).filter(models.TipoServicoCad.ativo == True)
    if search:
        query = query.filter(models.TipoServicoCad.nome.ilike(f"%{search}%"))
    if parte_veiculo:
        query = query.filter(models.TipoServicoCad.parte_veiculo.ilike(f"%{parte_veiculo}%"))
    return query.order_by(models.TipoServicoCad.nome).limit(50).all()

@app.post("/api/tipos-servico", response_model=schemas.TipoServicoCadOut, status_code=201)
def create_tipo_servico(data: schemas.TipoServicoCadCreate, db: Session = Depends(get_db)):
    existing = db.query(models.TipoServicoCad).filter(models.TipoServicoCad.nome == data.nome).first()
    if existing:
        raise HTTPException(status_code=400, detail="Tipo já cadastrado")
    item = models.TipoServicoCad(**data.dict())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@app.get("/api/tipos-servico/{item_id}", response_model=schemas.TipoServicoCadOut)
def get_tipo_servico(item_id: int, db: Session = Depends(get_db)):
    item = db.query(models.TipoServicoCad).filter(models.TipoServicoCad.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Não encontrado")
    return item

@app.put("/api/tipos-servico/{item_id}", response_model=schemas.TipoServicoCadOut)
def update_tipo_servico(item_id: int, data: schemas.TipoServicoCadCreate, db: Session = Depends(get_db)):
    item = db.query(models.TipoServicoCad).filter(models.TipoServicoCad.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Não encontrado")
    for k, v in data.dict().items():
        setattr(item, k, v)
    db.commit()
    db.refresh(item)
    return item

@app.delete("/api/tipos-servico/{item_id}", status_code=204)
def delete_tipo_servico(item_id: int, db: Session = Depends(get_db)):
    item = db.query(models.TipoServicoCad).filter(models.TipoServicoCad.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Não encontrado")
    db.delete(item)
    db.commit()


# ── Veiculos ──────────────────────────────────────────────────────────────────

@app.get("/api/veiculos", response_model=list[schemas.VeiculoOut])
def list_veiculos(search: Optional[str] = None, db: Session = Depends(get_db)):
    from sqlalchemy.orm import joinedload as jlv
    query = db.query(models.Veiculo).options(
        joinedload(models.Veiculo.motorista),
        jlv(models.Veiculo.arquivos),
    )
    if search:
        query = query.filter(
            or_(
                models.Veiculo.placa.ilike(f"%{search}%"),
                models.Veiculo.descricao.ilike(f"%{search}%"),
            )
        )
    veiculos = query.order_by(models.Veiculo.placa).all()
    result = []
    for v in veiculos:
        d = schemas.VeiculoOut.model_validate(v)
        d.arquivos_count = len(v.arquivos)
        result.append(d)
    return result


@app.post("/api/veiculos", response_model=schemas.VeiculoOut, status_code=201)
def create_veiculo(data: schemas.VeiculoCreate, db: Session = Depends(get_db)):
    existing = db.query(models.Veiculo).filter(models.Veiculo.placa == data.placa).first()
    if existing:
        raise HTTPException(status_code=400, detail="Placa já cadastrada")
    dump = data.model_dump()
    dump['descricao'] = " ".join(filter(None, [dump.get('marca'), dump.get('modelo')])) or dump.get('descricao') or ''
    veiculo = models.Veiculo(**dump)
    db.add(veiculo)
    db.commit()
    db.refresh(veiculo)
    return veiculo


# ── Ultimo Sync KM ────────────────────────────────────────────────────────────

_last_sync_dt: str | None = None

@app.get("/api/veiculos/ultimo-sync")
def ultimo_sync_km(db: Session = Depends(get_db)):
    from sqlalchemy import func
    total = db.query(func.count(models.Veiculo.id)).filter(models.Veiculo.ultimo_km != None).scalar()
    return {"ultima_sync": _last_sync_dt, "veiculos_com_km": total}


# ── Sync KM Excel ─────────────────────────────────────────────────────────────

@app.post("/api/veiculos/sync-km")
def sync_km(file: UploadFile = File(...), db: Session = Depends(get_db)):
    global _last_sync_dt
    import openpyxl
    import io
    from datetime import datetime as dt
    try:
        contents = file.file.read()
        wb = openpyxl.load_workbook(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro ao abrir Excel: {e}")

    ws = wb.active
    # Agrupa pelo KM mais recente por placa (col 0=placa, col 2=data, col 4=km)
    placas: dict = {}
    for row in ws.iter_rows(min_row=4, values_only=True):
        placa = row[0]
        km = row[4]
        data = row[2]
        if not placa or not isinstance(km, (int, float)) or km <= 0:
            continue
        if not hasattr(data, 'year'):
            continue
        placa = str(placa).strip().upper()
        if placa not in placas or data > placas[placa][0]:
            placas[placa] = (data, int(km))

    atualizados = []
    nao_encontrados = []
    for placa, (data, km) in placas.items():
        v = db.query(models.Veiculo).filter(models.Veiculo.placa == placa).first()
        if v:
            v.ultimo_km = km
            v.ultimo_km_data = data
            atualizados.append({"placa": placa, "km": km})
        else:
            nao_encontrados.append(placa)

    db.commit()
    from datetime import datetime as dt
    _last_sync_dt = dt.now().isoformat()
    return {
        "atualizados": len(atualizados),
        "nao_encontrados": nao_encontrados,
        "detalhes": atualizados,
    }


@app.get("/api/veiculos/{veiculo_id}", response_model=schemas.VeiculoOut)
def get_veiculo(veiculo_id: int, db: Session = Depends(get_db)):
    veiculo = db.query(models.Veiculo).options(joinedload(models.Veiculo.motorista)).filter(models.Veiculo.id == veiculo_id).first()
    if not veiculo:
        raise HTTPException(status_code=404, detail="Veículo não encontrado")
    return veiculo


@app.put("/api/veiculos/{veiculo_id}", response_model=schemas.VeiculoOut)
def update_veiculo(veiculo_id: int, data: schemas.VeiculoUpdate, db: Session = Depends(get_db)):
    veiculo = db.query(models.Veiculo).filter(models.Veiculo.id == veiculo_id).first()
    if not veiculo:
        raise HTTPException(status_code=404, detail="Veículo não encontrado")
    if data.placa and data.placa != veiculo.placa:
        existing = db.query(models.Veiculo).filter(models.Veiculo.placa == data.placa).first()
        if existing:
            raise HTTPException(status_code=400, detail="Placa já cadastrada")
    updates = data.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(veiculo, field, value)
    veiculo.descricao = " ".join(filter(None, [veiculo.marca, veiculo.modelo])) or veiculo.descricao or ''
    db.commit()
    db.refresh(veiculo)
    return veiculo


@app.delete("/api/veiculos/{veiculo_id}", status_code=204)
def delete_veiculo(veiculo_id: int, db: Session = Depends(get_db)):
    veiculo = db.query(models.Veiculo).filter(models.Veiculo.id == veiculo_id).first()
    if not veiculo:
        raise HTTPException(status_code=404, detail="Veículo não encontrado")
    db.delete(veiculo)
    db.commit()


@app.get("/api/veiculos/{veiculo_id}/historico")
def historico_veiculo(veiculo_id: int, db: Session = Depends(get_db)):
    from sqlalchemy.orm import joinedload as jl
    from collections import defaultdict

    veiculo = db.query(models.Veiculo).filter(models.Veiculo.id == veiculo_id).first()
    if not veiculo:
        raise HTTPException(status_code=404, detail="Veículo não encontrado")

    manutencoes = (
        db.query(models.Manutencao)
        .options(jl(models.Manutencao.servicos), jl(models.Manutencao.motorista), jl(models.Manutencao.arquivos))
        .filter(models.Manutencao.veiculo_id == veiculo_id)
        .order_by(models.Manutencao.dt_inicio.desc())
        .all()
    )

    def ev(v):
        return v.value if hasattr(v, "value") else (str(v) if v else None)

    def fmt_val(v):
        try:
            return float(v) if v is not None else 0.0
        except Exception:
            return 0.0

    # KPIs
    total_custo = 0.0
    total_servicos = 0
    custo_por_tipo = defaultdict(float)   # Corretiva / Preventiva
    custo_por_parte = defaultdict(float)  # parte_veiculo
    custo_por_mes = defaultdict(float)    # "YYYY-MM"
    status_count = defaultdict(int)

    for m in manutencoes:
        status_count[ev(m.status) or "Sem status"] += 1
        for s in m.servicos:
            v = fmt_val(s.valor)
            total_custo += v
            total_servicos += 1
            tipo = ev(s.tipo_uso) or "Sem tipo"
            custo_por_tipo[tipo] += v
            parte = s.parte_veiculo or "Outros"
            custo_por_parte[parte] += v
            ref_dt = s.dt_servico or (m.dt_inicio.date() if m.dt_inicio else None)
            if ref_dt:
                mes = ref_dt.strftime("%Y-%m")
                custo_por_mes[mes] += v

    # Últimos 12 meses ordenados
    from datetime import date as dt_date
    hoje = dt_date.today()
    meses = []
    for i in range(11, -1, -1):
        ano = hoje.year - ((hoje.month - 1 - i) // 12 + (1 if (hoje.month - 1 - i) < 0 else 0))
        mes_num = ((hoje.month - 1 - i) % 12) + 1
        key = f"{ano}-{mes_num:02d}"
        label = f"{mes_num:02d}/{ano}"
        meses.append({"key": key, "label": label, "valor": round(custo_por_mes.get(key, 0.0), 2)})

    # Top 5 partes por custo
    top_partes = sorted(
        [{"parte": k, "valor": round(v, 2)} for k, v in custo_por_parte.items()],
        key=lambda x: x["valor"], reverse=True
    )[:5]

    # Serializa manutenções
    mans_out = []
    for m in manutencoes:
        mans_out.append({
            "id": m.id,
            "status": ev(m.status),
            "tipo": ev(m.tipo),
            "prioridade": ev(m.prioridade),
            "km_entrada": m.km_entrada,
            "dt_inicio": m.dt_inicio.isoformat() if m.dt_inicio else None,
            "dt_previsao": m.dt_previsao.isoformat() if m.dt_previsao else None,
            "dt_termino": m.dt_termino.isoformat() if m.dt_termino else None,
            "responsavel_manutencao": m.responsavel_manutencao,
            "requisitante": m.requisitante,
            "servicos_solicitados": m.servicos_solicitados,
            "observacao": m.observacao,
            "motorista_nome": m.motorista.nome if m.motorista else None,
            "arquivos_count": len(m.arquivos),
            "total_custo": round(sum(fmt_val(s.valor) for s in m.servicos), 2),
            "servicos": [
                {
                    "id": s.id,
                    "status": ev(s.status),
                    "parte_veiculo": s.parte_veiculo,
                    "servico": s.servico,
                    "tipo_uso": ev(s.tipo_uso),
                    "dt_servico": s.dt_servico.isoformat() if s.dt_servico else None,
                    "proxima_dt_validade": s.proxima_dt_validade.isoformat() if s.proxima_dt_validade else None,
                    "proximo_km_validade": s.proximo_km_validade,
                    "pessoa_responsavel": s.pessoa_responsavel,
                    "descricao": s.descricao,
                    "valor": fmt_val(s.valor),
                    "horas_trabalhadas": s.horas_trabalhadas,
                }
                for s in m.servicos
            ],
        })

    return {
        "veiculo": {
            "id": veiculo.id,
            "placa": veiculo.placa,
            "marca": veiculo.marca,
            "modelo": veiculo.modelo,
            "descricao": veiculo.descricao,
            "tipo": veiculo.tipo,
            "grupo": veiculo.grupo,
            "ano": veiculo.ano,
            "chassi": veiculo.chassi,
            "capacidade": veiculo.capacidade,
            "vinculo": veiculo.vinculo,
            "ultimo_km": veiculo.ultimo_km,
            "ultimo_km_data": veiculo.ultimo_km_data.isoformat() if veiculo.ultimo_km_data else None,
        },
        "kpis": {
            "total_manutencoes": len(manutencoes),
            "total_custo": round(total_custo, 2),
            "total_servicos": total_servicos,
            "status_count": dict(status_count),
            "custo_por_tipo": {k: round(v, 2) for k, v in custo_por_tipo.items()},
        },
        "custo_por_mes": meses,
        "top_partes": top_partes,
        "manutencoes": mans_out,
    }


# ── Vencimentos ───────────────────────────────────────────────────────────────

@app.get("/api/vencimentos")
def list_vencimentos(db: Session = Depends(get_db)):
    from datetime import date as dt_date
    servicos = (
        db.query(models.ServicoVeiculo, models.Manutencao, models.Veiculo)
        .join(models.Manutencao, models.ServicoVeiculo.manutencao_id == models.Manutencao.id)
        .join(models.Veiculo, models.Manutencao.veiculo_id == models.Veiculo.id)
        .filter(
            or_(
                models.ServicoVeiculo.proximo_km_validade != None,
                models.ServicoVeiculo.proxima_dt_validade != None,
            )
        )
        .all()
    )
    today = dt_date.today()

    # Carregar todos os tipos de serviço cadastrados para usar seus thresholds de notificação
    tipos_map: dict = {}
    for ts in db.query(models.TipoServicoCad).all():
        tipos_map[(ts.nome or '').strip().lower()] = ts

    # KM efetivo por veículo = max(ultimo_km, maior km_entrada das manutenções)
    from sqlalchemy import func as sqlfunc
    km_max_por_veiculo: dict = {}
    rows = (
        db.query(models.Manutencao.veiculo_id, sqlfunc.max(models.Manutencao.km_entrada))
        .filter(models.Manutencao.km_entrada != None)
        .group_by(models.Manutencao.veiculo_id)
        .all()
    )
    for vid, max_km in rows:
        km_max_por_veiculo[vid] = max_km

    STATUS_ORDER = {"Vencido": 0, "Próximo": 1, "Ok": 2}

    # Agrupar por (veiculo_id, servico) e manter apenas o registro mais recente
    latest: dict = {}
    for sv, m, v in servicos:
        key = (v.id, (sv.servico or '').strip().lower())
        km_val = sv.proximo_km_validade or 0
        dt_val = sv.proxima_dt_validade or dt_date.min
        existing = latest.get(key)
        if existing is None:
            latest[key] = (sv, m, v)
        else:
            esv, _, _ = existing
            ex_km = esv.proximo_km_validade or 0
            ex_dt = esv.proxima_dt_validade or dt_date.min
            if (km_val, dt_val) > (ex_km, ex_dt):
                latest[key] = (sv, m, v)

    result = []
    for sv, m, v in latest.values():
        km_restante = None
        status_km = None
        dt_restante = None
        status_dt = None

        # Buscar tipo de serviço cadastrado para usar thresholds configurados
        ts_key = (sv.servico or '').strip().lower()
        tipo = tipos_map.get(ts_key)
        km_notificacao = (tipo.hodometro_km_notificacao if tipo and tipo.hodometro_km_notificacao else None) or 5000
        dias_notificacao = (tipo.nr_dias_notificacao if tipo and tipo.nr_dias_notificacao else None) or 30
        # Parte do veículo: preferir o registrado no serviço, fallback para o do tipo cadastrado
        parte_veiculo = sv.parte_veiculo or (tipo.parte_veiculo if tipo else None)

        km_efetivo = max(
            v.ultimo_km or 0,
            km_max_por_veiculo.get(v.id) or 0,
        ) or None
        if sv.proximo_km_validade is not None and km_efetivo:
            km_restante = sv.proximo_km_validade - km_efetivo
            if km_restante <= 0:
                status_km = "Vencido"
            elif km_restante <= km_notificacao:
                status_km = "Próximo"
            else:
                status_km = "Ok"
        if sv.proxima_dt_validade is not None:
            dt_restante = (sv.proxima_dt_validade - today).days
            if dt_restante < 0:
                status_dt = "Vencido"
            elif dt_restante <= dias_notificacao:
                status_dt = "Próximo"
            else:
                status_dt = "Ok"
        overall = min(
            STATUS_ORDER.get(status_km or '', 3),
            STATUS_ORDER.get(status_dt or '', 3)
        )
        overall_label = ["Vencido", "Próximo", "Ok", None][overall]
        result.append({
            "row_key": f"sv_{sv.id}",
            "tipo_vencimento": "Serviço",
            "servico_id": sv.id,
            "manutencao_id": m.id,
            "veiculo_id": v.id,
            "veiculo_placa": v.placa,
            "veiculo_descricao": v.descricao,
            "ultimo_km": km_efetivo,
            "servico": sv.servico,
            "parte_veiculo": parte_veiculo,
            "proximo_km_validade": sv.proximo_km_validade,
            "proxima_dt_validade": sv.proxima_dt_validade.isoformat() if sv.proxima_dt_validade else None,
            "km_restante": km_restante,
            "dt_restante_dias": dt_restante,
            "status_km": status_km,
            "status_dt": status_dt,
            "status": overall_label,
            "motorista_id": None,
            "motorista_nome": None,
            "motorista_codigo": None,
        })

    # ── CNH e Exame Toxicológico dos motoristas ────────────────────────────────
    DIAS_NOTIF_MOTORISTA = 30
    from datetime import date as _d
    motoristas_all = db.query(models.Motorista).filter(models.Motorista.ativo != False).all()
    for mot in motoristas_all:
        for tipo_venc, campo, label in [
            ("CNH", mot.validade_cnh, "Validade CNH"),
            ("Toxicológico", mot.dt_exame_toxicologico, "Exame Toxicológico"),
        ]:
            if not campo:
                continue
            try:
                dt_campo = _d.fromisoformat(campo)
            except Exception:
                continue
            dias = (dt_campo - today).days
            if dias < 0:
                status = "Vencido"
            elif dias <= DIAS_NOTIF_MOTORISTA:
                status = "Próximo"
            else:
                status = "Ok"
            result.append({
                "row_key": f"{tipo_venc.lower()}_{mot.id}",
                "tipo_vencimento": tipo_venc,
                "servico_id": None,
                "manutencao_id": None,
                "veiculo_id": None,
                "veiculo_placa": None,
                "veiculo_descricao": None,
                "ultimo_km": None,
                "servico": label,
                "parte_veiculo": None,
                "proximo_km_validade": None,
                "proxima_dt_validade": dt_campo.isoformat(),
                "km_restante": None,
                "dt_restante_dias": dias,
                "status_km": None,
                "status_dt": status,
                "status": status,
                "motorista_id": mot.id,
                "motorista_nome": mot.nome,
                "motorista_codigo": mot.codigo,
            })

    # Enriquecer com ações cadastradas
    keys = [r["row_key"] for r in result]
    acoes = {a.row_key: a for a in db.query(models.AcaoVencimento).filter(models.AcaoVencimento.row_key.in_(keys)).all()}
    for r in result:
        a = acoes.get(r["row_key"])
        r["acao"] = a.acao if a else None
        r["prazo_acao"] = a.prazo if a else None

    result.sort(key=lambda x: STATUS_ORDER.get(x["status"] or '', 3))
    return result


# ── Ações Vencimento ──────────────────────────────────────────────────────────

@app.put("/api/acoes-vencimento/{row_key:path}", status_code=200)
def upsert_acao_vencimento(row_key: str, data: dict, db: Session = Depends(get_db)):
    from datetime import datetime as _dt
    acao = db.query(models.AcaoVencimento).filter(models.AcaoVencimento.row_key == row_key).first()
    if acao:
        acao.acao = data.get("acao")
        acao.prazo = data.get("prazo")
        acao.updated_at = _dt.utcnow()
    else:
        acao = models.AcaoVencimento(row_key=row_key, acao=data.get("acao"), prazo=data.get("prazo"))
        db.add(acao)
    db.commit()
    db.refresh(acao)
    return acao


# ── Modelos base64 compartilhados ────────────────────────────────────────────

class ArquivoBase64Create(BaseModel):
    nome_arquivo: str
    conteudo: str  # base64 data URL
    descricao: Optional[str] = None
    usuario: Optional[str] = None

class ArquivoConteudoUpdate(BaseModel):
    conteudo: str


# ── Arquivos Veiculo ─────────────────────────────────────────────────────────

@app.get("/api/veiculos/{veiculo_id}/arquivos")
def list_arquivos_veiculo(veiculo_id: int, db: Session = Depends(get_db)):
    return db.query(models.ArquivoVeiculo).filter(models.ArquivoVeiculo.veiculo_id == veiculo_id).order_by(models.ArquivoVeiculo.created_at.desc()).all()


@app.post("/api/veiculos/{veiculo_id}/arquivos", status_code=201, response_model=schemas.ArquivoVeiculoOut)
async def upload_arquivo_veiculo(veiculo_id: int, data: ArquivoBase64Create, db: Session = Depends(get_db)):
    veiculo = db.query(models.Veiculo).filter(models.Veiculo.id == veiculo_id).first()
    if not veiculo:
        raise HTTPException(status_code=404, detail="Veículo não encontrado")
    try:
        arquivo = models.ArquivoVeiculo(
            veiculo_id=veiculo_id,
            nome_arquivo=data.nome_arquivo,
            caminho=None,
            conteudo=data.conteudo,
            descricao=data.descricao,
        )
        db.add(arquivo)
        db.commit()
        db.refresh(arquivo)
        return arquivo
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao salvar arquivo: {str(e)}")


@app.patch("/api/veiculos/arquivos/{arquivo_id}/conteudo", response_model=schemas.ArquivoVeiculoOut)
def patch_veiculo_arquivo_conteudo(arquivo_id: int, data: ArquivoConteudoUpdate, db: Session = Depends(get_db)):
    arq = db.query(models.ArquivoVeiculo).filter(models.ArquivoVeiculo.id == arquivo_id).first()
    if not arq:
        raise HTTPException(status_code=404, detail="Arquivo não encontrado")
    arq.conteudo = data.conteudo
    db.commit()
    db.refresh(arq)
    return arq


@app.delete("/api/veiculos/arquivos/{arquivo_id}", status_code=204)
def delete_arquivo_veiculo(arquivo_id: int, db: Session = Depends(get_db)):
    arq = db.query(models.ArquivoVeiculo).filter(models.ArquivoVeiculo.id == arquivo_id).first()
    if not arq:
        raise HTTPException(status_code=404, detail="Arquivo não encontrado")
    if arq.caminho:
        file_path = UPLOAD_DIR / arq.caminho
        if file_path.exists():
            file_path.unlink()
    db.delete(arq)
    db.commit()


# ── Motoristas ────────────────────────────────────────────────────────────────

@app.get("/api/motoristas", response_model=list[schemas.MotoristaOut])
def list_motoristas(search: Optional[str] = None, db: Session = Depends(get_db)):
    from sqlalchemy.orm import joinedload as jl2
    query = db.query(models.Motorista).options(jl2(models.Motorista.arquivos))
    if search:
        query = query.filter(
            or_(
                models.Motorista.nome.ilike(f"%{search}%"),
                models.Motorista.tipo.ilike(f"%{search}%"),
            )
        )
    motoristas = query.order_by(models.Motorista.nome).all()
    result = []
    for m in motoristas:
        d = schemas.MotoristaOut.model_validate(m)
        d.arquivos_count = len(m.arquivos)
        result.append(d)
    return result


@app.post("/api/motoristas", response_model=schemas.MotoristaOut, status_code=201)
def create_motorista(data: schemas.MotoristaCreate, db: Session = Depends(get_db)):
    # Auto-gera código se não informado
    codigo = data.codigo
    if not codigo:
        last = db.query(models.Motorista).order_by(models.Motorista.id.desc()).first()
        next_num = (last.id + 1) if last else 1
        codigo = f"MOT{next_num:03d}"
        # Garante unicidade
        while db.query(models.Motorista).filter(models.Motorista.codigo == codigo).first():
            next_num += 1
            codigo = f"MOT{next_num:03d}"
    else:
        existing = db.query(models.Motorista).filter(models.Motorista.codigo == codigo).first()
        if existing:
            raise HTTPException(status_code=400, detail="Código de motorista já cadastrado")
    payload = data.model_dump()
    payload['codigo'] = codigo
    motorista = models.Motorista(**payload)
    db.add(motorista)
    db.commit()
    db.refresh(motorista)
    return motorista


@app.put("/api/motoristas/{motorista_id}", response_model=schemas.MotoristaOut)
def update_motorista(motorista_id: int, data: schemas.MotoristaUpdate, db: Session = Depends(get_db)):
    motorista = db.query(models.Motorista).filter(models.Motorista.id == motorista_id).first()
    if not motorista:
        raise HTTPException(status_code=404, detail="Motorista não encontrado")
    if data.codigo and data.codigo != motorista.codigo:
        existing = db.query(models.Motorista).filter(models.Motorista.codigo == data.codigo).first()
        if existing:
            raise HTTPException(status_code=400, detail="Código de motorista já cadastrado")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(motorista, field, value)
    db.commit()
    db.refresh(motorista)
    return motorista


@app.delete("/api/motoristas/{motorista_id}", status_code=204)
def delete_motorista(motorista_id: int, db: Session = Depends(get_db)):
    motorista = db.query(models.Motorista).filter(models.Motorista.id == motorista_id).first()
    if not motorista:
        raise HTTPException(status_code=404, detail="Motorista não encontrado")
    db.delete(motorista)
    db.commit()


@app.get("/api/motoristas/{motorista_id}/arquivos")
def list_arquivos_motorista(motorista_id: int, db: Session = Depends(get_db)):
    return db.query(models.ArquivoMotorista).filter(models.ArquivoMotorista.motorista_id == motorista_id).order_by(models.ArquivoMotorista.created_at.desc()).all()


@app.post("/api/motoristas/{motorista_id}/arquivos", status_code=201, response_model=schemas.ArquivoMotoristaOut)
async def upload_arquivo_motorista(motorista_id: int, data: ArquivoBase64Create, db: Session = Depends(get_db)):
    mot = db.query(models.Motorista).filter(models.Motorista.id == motorista_id).first()
    if not mot:
        raise HTTPException(status_code=404, detail="Motorista não encontrado")
    try:
        arquivo = models.ArquivoMotorista(
            motorista_id=motorista_id,
            nome_arquivo=data.nome_arquivo,
            caminho=None,
            conteudo=data.conteudo,
            descricao=data.descricao,
        )
        db.add(arquivo)
        db.commit()
        db.refresh(arquivo)
        return arquivo
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao salvar arquivo: {str(e)}")


@app.patch("/api/motoristas/arquivos/{arquivo_id}/conteudo", response_model=schemas.ArquivoMotoristaOut)
def patch_motorista_arquivo_conteudo(arquivo_id: int, data: ArquivoConteudoUpdate, db: Session = Depends(get_db)):
    arq = db.query(models.ArquivoMotorista).filter(models.ArquivoMotorista.id == arquivo_id).first()
    if not arq:
        raise HTTPException(status_code=404, detail="Arquivo não encontrado")
    arq.conteudo = data.conteudo
    db.commit()
    db.refresh(arq)
    return arq


@app.delete("/api/motoristas/arquivos/{arquivo_id}", status_code=204)
def delete_arquivo_motorista(arquivo_id: int, db: Session = Depends(get_db)):
    arq = db.query(models.ArquivoMotorista).filter(models.ArquivoMotorista.id == arquivo_id).first()
    if not arq:
        raise HTTPException(status_code=404, detail="Arquivo não encontrado")
    if arq.caminho:
        file_path = UPLOAD_DIR / arq.caminho
        if file_path.exists():
            file_path.unlink()
    db.delete(arq)
    db.commit()


# ── Ativos ───────────────────────────────────────────────────────────────────

@app.get("/api/ativos/lookup")
def lookup_ativos(q: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.Ativo).filter(models.Ativo.ativo == True)
    if q:
        query = query.filter(
            or_(models.Ativo.nome.ilike(f"%{q}%"), models.Ativo.codigo.ilike(f"%{q}%"))
        )
    items = query.order_by(models.Ativo.nome).limit(30).all()
    return [{"id": a.id, "label": a.nome, "sublabel": a.tipo or ""} for a in items]


@app.get("/api/ativos", response_model=schemas.PaginatedAtivos)
def list_ativos(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=200),
    search: Optional[str] = None,
    ativo: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(models.Ativo)
    if search:
        query = query.filter(
            or_(models.Ativo.nome.ilike(f"%{search}%"), models.Ativo.codigo.ilike(f"%{search}%"),
                models.Ativo.localizacao.ilike(f"%{search}%"))
        )
    if ativo == "true":
        query = query.filter(models.Ativo.ativo == True)
    elif ativo == "false":
        query = query.filter(models.Ativo.ativo == False)
    total = query.count()
    total_pages = max(1, math.ceil(total / per_page))
    items = query.order_by(models.Ativo.nome).offset((page - 1) * per_page).limit(per_page).all()
    return schemas.PaginatedAtivos(items=items, total=total, page=page, per_page=per_page, total_pages=total_pages)


@app.post("/api/ativos", response_model=schemas.AtivoOut, status_code=201)
def create_ativo(data: schemas.AtivoCreate, db: Session = Depends(get_db)):
    ativo = models.Ativo(**data.model_dump())
    db.add(ativo)
    db.commit()
    db.refresh(ativo)
    return ativo


@app.get("/api/ativos/{ativo_id}", response_model=schemas.AtivoOut)
def get_ativo(ativo_id: int, db: Session = Depends(get_db)):
    a = db.query(models.Ativo).filter(models.Ativo.id == ativo_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Ativo não encontrado")
    return a


@app.put("/api/ativos/{ativo_id}", response_model=schemas.AtivoOut)
def update_ativo(ativo_id: int, data: schemas.AtivoUpdate, db: Session = Depends(get_db)):
    a = db.query(models.Ativo).filter(models.Ativo.id == ativo_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Ativo não encontrado")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(a, field, value)
    db.commit()
    db.refresh(a)
    return a


@app.delete("/api/ativos/{ativo_id}", status_code=204)
def delete_ativo(ativo_id: int, db: Session = Depends(get_db)):
    a = db.query(models.Ativo).filter(models.Ativo.id == ativo_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Ativo não encontrado")
    db.delete(a)
    db.commit()


# ── Manutencoes ───────────────────────────────────────────────────────────────

@app.get("/api/manutencoes", response_model=schemas.PaginatedManutencoes)
def list_manutencoes(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=10000),
    status: Optional[str] = None,
    tipo: Optional[str] = None,
    prioridade: Optional[str] = None,
    veiculo: Optional[str] = None,
    motorista: Optional[str] = None,
    dt_inicio_gte: Optional[str] = None,
    dt_inicio_lte: Optional[str] = None,
    dt_termino_gte: Optional[str] = None,
    dt_termino_lte: Optional[str] = None,
    dt_previsao_gte: Optional[str] = None,
    dt_previsao_lte: Optional[str] = None,
    km_gte: Optional[str] = None,
    km_lte: Optional[str] = None,
    resp_manutencao: Optional[str] = None,
    servicos_solicitados: Optional[str] = None,
    manutencao: Optional[str] = None,
    anexo: Optional[str] = None,
    tipo_servico: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = (
        db.query(models.Manutencao)
        .options(
            joinedload(models.Manutencao.veiculo),
            joinedload(models.Manutencao.motorista),
            joinedload(models.Manutencao.ativo),
        )
    )

    if status:
        query = query.filter(models.Manutencao.status == status)
    if tipo:
        query = query.filter(models.Manutencao.tipo == tipo)
    if prioridade:
        query = query.filter(models.Manutencao.prioridade == prioridade)
    if veiculo:
        query = query.join(models.Veiculo).filter(
            or_(
                models.Veiculo.placa.ilike(f"%{veiculo}%"),
                models.Veiculo.descricao.ilike(f"%{veiculo}%"),
            )
        )
    if motorista:
        query = query.join(models.Motorista, isouter=True).filter(
            or_(
                models.Motorista.nome.ilike(f"%{motorista}%"),
                models.Motorista.codigo.ilike(f"%{motorista}%"),
            )
        )
    if manutencao:
        try:
            query = query.filter(models.Manutencao.id == int(manutencao))
        except ValueError:
            pass
    if resp_manutencao:
        query = query.filter(models.Manutencao.responsavel_manutencao.ilike(f"%{resp_manutencao}%"))
    if servicos_solicitados:
        query = query.filter(models.Manutencao.servicos_solicitados.ilike(f"%{servicos_solicitados}%"))
    if km_gte:
        try:
            query = query.filter(models.Manutencao.km_entrada >= int(km_gte))
        except ValueError:
            pass
    if km_lte:
        try:
            query = query.filter(models.Manutencao.km_entrada <= int(km_lte))
        except ValueError:
            pass
    if dt_inicio_gte:
        try:
            query = query.filter(models.Manutencao.dt_inicio >= datetime.fromisoformat(dt_inicio_gte))
        except ValueError:
            pass
    if dt_inicio_lte:
        try:
            query = query.filter(models.Manutencao.dt_inicio <= datetime.fromisoformat(dt_inicio_lte))
        except ValueError:
            pass
    if dt_termino_gte:
        try:
            query = query.filter(models.Manutencao.dt_termino >= datetime.fromisoformat(dt_termino_gte))
        except ValueError:
            pass
    if dt_termino_lte:
        try:
            query = query.filter(models.Manutencao.dt_termino <= datetime.fromisoformat(dt_termino_lte))
        except ValueError:
            pass
    if dt_previsao_gte:
        try:
            query = query.filter(models.Manutencao.dt_previsao >= datetime.fromisoformat(dt_previsao_gte))
        except ValueError:
            pass
    if dt_previsao_lte:
        try:
            query = query.filter(models.Manutencao.dt_previsao <= datetime.fromisoformat(dt_previsao_lte))
        except ValueError:
            pass
    if anexo == 'sim':
        ids_com_arquivo = db.query(models.ArquivoManutencao.manutencao_id).distinct().subquery()
        query = query.filter(models.Manutencao.id.in_(ids_com_arquivo))
    elif anexo == 'nao':
        ids_com_arquivo = db.query(models.ArquivoManutencao.manutencao_id).distinct().subquery()
        query = query.filter(~models.Manutencao.id.in_(ids_com_arquivo))
    if tipo_servico:
        ids_com_servico = (
            db.query(models.ServicoVeiculo.manutencao_id)
            .filter(models.ServicoVeiculo.servico.ilike(f"%{tipo_servico}%"))
            .distinct()
            .subquery()
        )
        query = query.filter(models.Manutencao.id.in_(ids_com_servico))
    if search:
        query = query.filter(
            or_(
                models.Manutencao.responsavel_manutencao.ilike(f"%{search}%"),
                models.Manutencao.servicos_solicitados.ilike(f"%{search}%"),
                models.Manutencao.observacao.ilike(f"%{search}%"),
            )
        )

    total = query.count()
    total_pages = max(1, math.ceil(total / per_page))
    items_raw = (
        query.order_by(models.Manutencao.id.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )

    items = []
    for m in items_raw:
        items.append(
            schemas.ManutencaoListItem(
                id=m.id,
                veiculo_placa=m.veiculo.placa if m.veiculo else None,
                veiculo_descricao=m.veiculo.descricao if m.veiculo else None,
                ativo_nome=m.ativo.nome if m.ativo else None,
                ativo_tipo=m.ativo.tipo if m.ativo else None,
                motorista_nome=m.motorista.nome if m.motorista else None,
                motorista_codigo=m.motorista.codigo if m.motorista else None,
                responsavel_manutencao=m.responsavel_manutencao,
                km_entrada=m.km_entrada,
                dt_inicio=m.dt_inicio,
                dt_previsao=m.dt_previsao,
                dt_termino=m.dt_termino,
                prioridade=m.prioridade,
                tipo=m.tipo,
                status=m.status,
                created_at=m.created_at,
                arquivos_count=len(m.arquivos),
            )
        )

    return schemas.PaginatedManutencoes(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages,
    )


@app.post("/api/manutencoes", response_model=schemas.ManutencaoOut, status_code=201)
def create_manutencao(data: schemas.ManutencaoCreate, db: Session = Depends(get_db)):
    if not data.veiculo_id and not data.ativo_id:
        raise HTTPException(status_code=400, detail="Informe um Veículo ou Ativo")
    if data.veiculo_id:
        if not db.query(models.Veiculo).filter(models.Veiculo.id == data.veiculo_id).first():
            raise HTTPException(status_code=404, detail="Veículo não encontrado")
    if data.ativo_id:
        if not db.query(models.Ativo).filter(models.Ativo.id == data.ativo_id).first():
            raise HTTPException(status_code=404, detail="Ativo não encontrado")
    man = models.Manutencao(**data.model_dump())
    db.add(man)
    db.commit()
    db.refresh(man)
    return db.query(models.Manutencao).options(
        joinedload(models.Manutencao.veiculo),
        joinedload(models.Manutencao.ativo),
        joinedload(models.Manutencao.motorista),
        joinedload(models.Manutencao.servicos),
        joinedload(models.Manutencao.arquivos),
    ).filter(models.Manutencao.id == man.id).first()


@app.get("/api/manutencoes/{manutencao_id}", response_model=schemas.ManutencaoOut)
def get_manutencao(manutencao_id: int, db: Session = Depends(get_db)):
    man = (
        db.query(models.Manutencao)
        .options(
            joinedload(models.Manutencao.veiculo),
            joinedload(models.Manutencao.ativo),
            joinedload(models.Manutencao.motorista),
            joinedload(models.Manutencao.servicos),
            joinedload(models.Manutencao.arquivos),
        )
        .filter(models.Manutencao.id == manutencao_id)
        .first()
    )
    if not man:
        raise HTTPException(status_code=404, detail="Manutenção não encontrada")
    return man


@app.post("/api/manutencoes/{manutencao_id}/enviar-email")
def enviar_email_manutencao(manutencao_id: int, payload: dict, db: Session = Depends(get_db)):
    destinatario = (payload.get("email") or "").strip()
    if not destinatario:
        raise HTTPException(status_code=400, detail="E-mail destino é obrigatório")

    man = (
        db.query(models.Manutencao)
        .options(
            joinedload(models.Manutencao.veiculo),
            joinedload(models.Manutencao.motorista),
            joinedload(models.Manutencao.servicos),
            joinedload(models.Manutencao.arquivos),
        )
        .filter(models.Manutencao.id == manutencao_id)
        .first()
    )
    if not man:
        raise HTTPException(status_code=404, detail="Manutenção não encontrada")

    def fmt_dt(dt):
        if not dt: return "-"
        try: return dt.strftime("%d/%m/%Y %H:%M")
        except: return str(dt)

    def fmt_val(v):
        if not v: return "-"
        return f"R$ {float(v):,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")

    def ev(v):
        """Extrai o valor legível de um enum ou string."""
        if v is None: return "-"
        return v.value if hasattr(v, 'value') else str(v)

    # Monta HTML do e-mail
    servicos_rows = ""
    total_valor = 0.0
    for s in man.servicos:
        total_valor += float(s.valor or 0)
        servicos_rows += f"""
        <tr>
          <td>{s.parte_veiculo or '-'}</td>
          <td>{s.servico or '-'}</td>
          <td>{ev(s.tipo_uso)}</td>
          <td>{s.pessoa_responsavel or '-'}</td>
          <td>{s.descricao or '-'}</td>
          <td>{ev(s.status)}</td>
          <td style="text-align:right">{fmt_val(s.valor)}</td>
        </tr>"""

    placa = man.veiculo.placa if man.veiculo else (man.ativo.nome if man.ativo else "-")
    veiculo_desc = man.veiculo.descricao if man.veiculo else (man.ativo.tipo or "" if man.ativo else "-")
    motorista = man.motorista.nome if man.motorista else "-"
    status_str = ev(man.status)
    tipo_str = ev(man.tipo)
    prior_str = ev(man.prioridade)

    html = f"""
    <html><body style="font-family:Arial,sans-serif;font-size:13px;color:#222">
    <div style="background:#1e40af;color:white;padding:16px 20px;border-radius:8px 8px 0 0">
      <h2 style="margin:0;font-size:16px">Manutenção #{man.id} — {placa}</h2>
      <p style="margin:4px 0 0;opacity:.8;font-size:12px">{veiculo_desc}</p>
    </div>
    <div style="border:1px solid #ddd;border-top:none;padding:16px 20px;border-radius:0 0 8px 8px">
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
        <tr><td style="padding:4px 8px;color:#666;width:140px">Status</td><td style="padding:4px 8px;font-weight:bold">{status_str}</td>
            <td style="padding:4px 8px;color:#666;width:140px">Tipo</td><td style="padding:4px 8px">{tipo_str}</td></tr>
        <tr><td style="padding:4px 8px;color:#666">Oficina/Prestador</td><td style="padding:4px 8px">{man.responsavel_manutencao or '-'}</td>
            <td style="padding:4px 8px;color:#666">Motorista</td><td style="padding:4px 8px">{motorista}</td></tr>
        <tr><td style="padding:4px 8px;color:#666">Dt. Início</td><td style="padding:4px 8px">{fmt_dt(man.dt_inicio)}</td>
            <td style="padding:4px 8px;color:#666">Dt. Término</td><td style="padding:4px 8px">{fmt_dt(man.dt_termino)}</td></tr>
        <tr><td style="padding:4px 8px;color:#666">KM Entrada</td><td style="padding:4px 8px">{f"{man.km_entrada:,}".replace(",",".") if man.km_entrada else '-'}</td>
            <td style="padding:4px 8px;color:#666">Prioridade</td><td style="padding:4px 8px">{prior_str}</td></tr>
        {"<tr><td style='padding:4px 8px;color:#666'>Observação</td><td colspan='3' style='padding:4px 8px'>" + (man.observacao or '') + "</td></tr>" if man.observacao else ""}
      </table>

      <h3 style="font-size:13px;margin:0 0 8px;color:#1e40af">Serviços Realizados</h3>
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead>
          <tr style="background:#eff6ff;color:#1e40af">
            <th style="padding:6px 8px;text-align:left;border:1px solid #bfdbfe">Parte do Veículo</th>
            <th style="padding:6px 8px;text-align:left;border:1px solid #bfdbfe">Serviço</th>
            <th style="padding:6px 8px;text-align:left;border:1px solid #bfdbfe">Tipo</th>
            <th style="padding:6px 8px;text-align:left;border:1px solid #bfdbfe">Responsável</th>
            <th style="padding:6px 8px;text-align:left;border:1px solid #bfdbfe">Descrição</th>
            <th style="padding:6px 8px;text-align:left;border:1px solid #bfdbfe">Status</th>
            <th style="padding:6px 8px;text-align:right;border:1px solid #bfdbfe">Valor</th>
          </tr>
        </thead>
        <tbody>{servicos_rows if servicos_rows else '<tr><td colspan="7" style="padding:8px;text-align:center;color:#999">Nenhum serviço registrado</td></tr>'}</tbody>
        {"<tfoot><tr style='background:#eff6ff;font-weight:bold'><td colspan='6' style='padding:6px 8px;text-align:right;border:1px solid #bfdbfe'>Total:</td><td style='padding:6px 8px;text-align:right;border:1px solid #bfdbfe'>" + fmt_val(total_valor) + "</td></tr></tfoot>" if man.servicos else ""}
      </table>

      <p style="margin-top:20px;font-size:11px;color:#999">
        Enviado pelo sistema Frota Bello · {datetime.now().strftime("%d/%m/%Y %H:%M")}
      </p>
    </div>
    </body></html>"""

    # Gera PDF com reportlab
    def gerar_pdf():
        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.lib.units import mm
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.enums import TA_CENTER, TA_RIGHT

        buf = io.BytesIO()
        doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=15*mm, rightMargin=15*mm, topMargin=15*mm, bottomMargin=15*mm)
        styles = getSampleStyleSheet()
        azul = colors.HexColor("#1e40af")
        azul_claro = colors.HexColor("#eff6ff")
        cinza = colors.HexColor("#6b7280")
        verde = colors.HexColor("#16a34a")
        vermelho = colors.HexColor("#dc2626")

        titulo_style = ParagraphStyle("titulo", parent=styles["Heading1"], fontSize=14, textColor=colors.white, spaceAfter=2)
        sub_style = ParagraphStyle("sub", parent=styles["Normal"], fontSize=9, textColor=colors.white)
        label_style = ParagraphStyle("lbl", parent=styles["Normal"], fontSize=8, textColor=cinza)
        valor_style = ParagraphStyle("val", parent=styles["Normal"], fontSize=9, textColor=colors.black)
        rodape_style = ParagraphStyle("rod", parent=styles["Normal"], fontSize=7, textColor=cinza, alignment=TA_CENTER)

        elements = []

        # Cabeçalho azul
        header_data = [[
            Paragraph(f"<b>Manutenção #{man.id} — {placa}</b>", titulo_style),
            Paragraph(f"<b>Status: {status_str}</b>", ParagraphStyle("st", parent=styles["Normal"], fontSize=10, textColor=colors.white, alignment=TA_RIGHT)),
        ]]
        header_tbl = Table(header_data, colWidths=["70%", "30%"])
        header_tbl.setStyle(TableStyle([
            ("BACKGROUND", (0,0), (-1,-1), azul),
            ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
            ("TOPPADDING", (0,0), (-1,-1), 8),
            ("BOTTOMPADDING", (0,0), (-1,-1), 4),
            ("LEFTPADDING", (0,0), (0,-1), 8),
            ("RIGHTPADDING", (-1,0), (-1,-1), 8),
            ("ROWBACKGROUNDS", (0,0), (-1,-1), [azul]),
        ]))
        elements.append(header_tbl)
        if veiculo_desc and veiculo_desc != "-":
            sub_tbl = Table([[Paragraph(veiculo_desc, sub_style)]])
            sub_tbl.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,-1),azul),("TOPPADDING",(0,0),(-1,-1),0),("BOTTOMPADDING",(0,0),(-1,-1),6),("LEFTPADDING",(0,0),(-1,-1),8)]))
            elements.append(sub_tbl)
        elements.append(Spacer(1, 4*mm))

        # Dados da manutenção
        def cell(lbl, val):
            return [Paragraph(lbl, label_style), Paragraph(str(val), valor_style)]

        km_str = f"{man.km_entrada:,}".replace(",", ".") if man.km_entrada else "-"
        info = [
            cell("Tipo", tipo_str) + cell("Prioridade", prior_str),
            cell("Oficina / Prestador", man.responsavel_manutencao or "-") + cell("Motorista", motorista),
            cell("Dt. Início", fmt_dt(man.dt_inicio)) + cell("Dt. Término", fmt_dt(man.dt_termino)),
            cell("KM Entrada", km_str) + cell("Requisitante", man.requisitante or "-"),
        ]
        if man.observacao:
            info.append(cell("Observação", man.observacao) + ["", ""])

        info_tbl = Table(info, colWidths=["18%", "32%", "18%", "32%"])
        info_tbl.setStyle(TableStyle([
            ("GRID", (0,0), (-1,-1), 0.3, colors.HexColor("#e5e7eb")),
            ("BACKGROUND", (0,0), (0,-1), azul_claro),
            ("BACKGROUND", (2,0), (2,-1), azul_claro),
            ("TOPPADDING", (0,0), (-1,-1), 3), ("BOTTOMPADDING", (0,0), (-1,-1), 3),
            ("LEFTPADDING", (0,0), (-1,-1), 5), ("RIGHTPADDING", (0,0), (-1,-1), 5),
        ]))
        elements.append(info_tbl)
        elements.append(Spacer(1, 4*mm))

        # Tabela de serviços
        elements.append(Paragraph("<b>Serviços Realizados</b>", ParagraphStyle("h2", parent=styles["Normal"], fontSize=10, textColor=azul, spaceAfter=3)))
        srv_header = ["Parte do Veículo", "Serviço", "Tipo", "Responsável", "Status", "Valor R$"]
        srv_rows = [srv_header]
        for s in man.servicos:
            srv_rows.append([
                s.parte_veiculo or "-", s.servico or "-", ev(s.tipo_uso),
                s.pessoa_responsavel or "-", ev(s.status),
                fmt_val(s.valor) if s.valor else "-",
            ])

        if len(srv_rows) == 1:
            srv_rows.append(["Nenhum serviço registrado", "", "", "", "", ""])

        # Linha de total
        srv_rows.append(["", "", "", "", "Total:", fmt_val(total_valor)])

        srv_tbl = Table(srv_rows, colWidths=["18%", "22%", "12%", "18%", "14%", "16%"])
        srv_style = TableStyle([
            ("BACKGROUND", (0,0), (-1,0), azul), ("TEXTCOLOR", (0,0), (-1,0), colors.white),
            ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"), ("FONTSIZE", (0,0), (-1,-1), 8),
            ("GRID", (0,0), (-1,-2), 0.3, colors.HexColor("#bfdbfe")),
            ("ROWBACKGROUNDS", (0,1), (-1,-2), [colors.white, azul_claro]),
            ("ALIGN", (-1,0), (-1,-1), "RIGHT"),
            ("FONTNAME", (0,-1), (-1,-1), "Helvetica-Bold"),
            ("BACKGROUND", (0,-1), (-1,-1), azul_claro),
            ("LINEABOVE", (0,-1), (-1,-1), 0.8, azul),
            ("TOPPADDING", (0,0), (-1,-1), 3), ("BOTTOMPADDING", (0,0), (-1,-1), 3),
            ("LEFTPADDING", (0,0), (-1,-1), 4), ("RIGHTPADDING", (0,0), (-1,-1), 4),
        ])
        srv_tbl.setStyle(srv_style)
        elements.append(srv_tbl)
        elements.append(Spacer(1, 6*mm))
        elements.append(Paragraph(f"Gerado em {datetime.now().strftime('%d/%m/%Y %H:%M')} · Sistema Frota Bello", rodape_style))

        doc.build(elements)
        buf.seek(0)
        return buf.read()

    try:
        msg = MIMEMultipart("mixed")
        msg["Subject"] = f"Manutenção #{man.id} — {placa} ({man.status})"
        msg["From"] = f"Frota Bello <{EMAIL_REMETENTE}>"
        msg["To"] = destinatario
        msg.attach(MIMEText(html, "html"))

        # Anexa os arquivos já vinculados à manutenção
        for arq in man.arquivos:
            filepath = UPLOAD_DIR / arq.caminho
            if filepath.exists():
                with open(filepath, "rb") as f:
                    file_data = f.read()
                ext = arq.caminho.rsplit(".", 1)[-1].lower()
                subtype = "pdf" if ext == "pdf" else ("jpeg" if ext in ("jpg", "jpeg") else ext)
                file_part = MIMEApplication(file_data, _subtype=subtype)
                file_part.add_header("Content-Disposition", "attachment", filename=arq.nome_arquivo)
                msg.attach(file_part)

        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.starttls()
            server.login(EMAIL_REMETENTE, EMAIL_SENHA_APP)
            server.sendmail(EMAIL_REMETENTE, destinatario, msg.as_string())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao enviar e-mail: {str(e)}")

    return {"ok": True, "mensagem": f"E-mail enviado para {destinatario}"}


@app.put("/api/manutencoes/{manutencao_id}", response_model=schemas.ManutencaoOut)
def update_manutencao(manutencao_id: int, data: schemas.ManutencaoUpdate, db: Session = Depends(get_db)):
    man = db.query(models.Manutencao).filter(models.Manutencao.id == manutencao_id).first()
    if not man:
        raise HTTPException(status_code=404, detail="Manutenção não encontrada")
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(man, field, value)
    man.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(man)
    return db.query(models.Manutencao).options(
        joinedload(models.Manutencao.veiculo),
        joinedload(models.Manutencao.ativo),
        joinedload(models.Manutencao.motorista),
        joinedload(models.Manutencao.servicos),
        joinedload(models.Manutencao.arquivos),
    ).filter(models.Manutencao.id == manutencao_id).first()


@app.delete("/api/manutencoes/{manutencao_id}", status_code=204)
def delete_manutencao(manutencao_id: int, db: Session = Depends(get_db)):
    man = db.query(models.Manutencao).filter(models.Manutencao.id == manutencao_id).first()
    if not man:
        raise HTTPException(status_code=404, detail="Manutenção não encontrada")
    db.delete(man)
    db.commit()


# ── Servicos Veiculo ──────────────────────────────────────────────────────────

@app.get("/api/manutencoes/{manutencao_id}/servicos", response_model=list[schemas.ServicoVeiculoOut])
def list_servicos(manutencao_id: int, db: Session = Depends(get_db)):
    return (
        db.query(models.ServicoVeiculo)
        .filter(models.ServicoVeiculo.manutencao_id == manutencao_id)
        .all()
    )


@app.post("/api/manutencoes/{manutencao_id}/servicos", response_model=schemas.ServicoVeiculoOut, status_code=201)
def create_servico(manutencao_id: int, data: schemas.ServicoVeiculoCreate, db: Session = Depends(get_db)):
    man = db.query(models.Manutencao).filter(models.Manutencao.id == manutencao_id).first()
    if not man:
        raise HTTPException(status_code=404, detail="Manutenção não encontrada")
    servico = models.ServicoVeiculo(manutencao_id=manutencao_id, **data.model_dump())
    db.add(servico)
    db.commit()
    db.refresh(servico)
    return servico


@app.put("/api/servicos/{servico_id}", response_model=schemas.ServicoVeiculoOut)
def update_servico(servico_id: int, data: schemas.ServicoVeiculoUpdate, db: Session = Depends(get_db)):
    servico = db.query(models.ServicoVeiculo).filter(models.ServicoVeiculo.id == servico_id).first()
    if not servico:
        raise HTTPException(status_code=404, detail="Serviço não encontrado")
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(servico, field, value)
    db.commit()
    db.refresh(servico)
    return servico


@app.delete("/api/servicos/{servico_id}", status_code=204)
def delete_servico(servico_id: int, db: Session = Depends(get_db)):
    servico = db.query(models.ServicoVeiculo).filter(models.ServicoVeiculo.id == servico_id).first()
    if not servico:
        raise HTTPException(status_code=404, detail="Serviço não encontrado")
    db.delete(servico)
    db.commit()


# ── Arquivos ──────────────────────────────────────────────────────────────────

@app.get("/api/manutencoes/{manutencao_id}/arquivos", response_model=list[schemas.ArquivoManutencaoOut])
def list_arquivos(manutencao_id: int, db: Session = Depends(get_db)):
    return (
        db.query(models.ArquivoManutencao)
        .filter(models.ArquivoManutencao.manutencao_id == manutencao_id)
        .all()
    )


@app.post("/api/manutencoes/{manutencao_id}/arquivos", response_model=schemas.ArquivoManutencaoOut, status_code=201)
async def upload_arquivo(
    manutencao_id: int,
    data: ArquivoBase64Create,
    db: Session = Depends(get_db),
):
    man = db.query(models.Manutencao).filter(models.Manutencao.id == manutencao_id).first()
    if not man:
        raise HTTPException(status_code=404, detail="Manutenção não encontrada")

    arquivo = models.ArquivoManutencao(
        manutencao_id=manutencao_id,
        nome_arquivo=data.nome_arquivo,
        caminho=None,
        conteudo=data.conteudo,
        descricao=data.descricao,
        usuario=data.usuario or "Sistema",
    )
    db.add(arquivo)
    db.commit()
    db.refresh(arquivo)
    return arquivo


@app.patch("/api/arquivos/{arquivo_id}/conteudo", response_model=schemas.ArquivoManutencaoOut)
def patch_arquivo_conteudo(arquivo_id: int, data: ArquivoConteudoUpdate, db: Session = Depends(get_db)):
    arquivo = db.query(models.ArquivoManutencao).filter(models.ArquivoManutencao.id == arquivo_id).first()
    if not arquivo:
        raise HTTPException(status_code=404, detail="Arquivo não encontrado")
    arquivo.conteudo = data.conteudo
    db.commit()
    db.refresh(arquivo)
    return arquivo


@app.delete("/api/arquivos/{arquivo_id}", status_code=204)
def delete_arquivo(arquivo_id: int, db: Session = Depends(get_db)):
    arquivo = db.query(models.ArquivoManutencao).filter(models.ArquivoManutencao.id == arquivo_id).first()
    if not arquivo:
        raise HTTPException(status_code=404, detail="Arquivo não encontrado")
    if arquivo.caminho:
        file_path = UPLOAD_DIR / arquivo.caminho
        if file_path.exists():
            file_path.unlink()
    db.delete(arquivo)
    db.commit()


# ── Dashboard Stats ───────────────────────────────────────────────────────────

@app.get("/api/dashboard-stats")
def dashboard_stats(
    dt_inicio: Optional[str] = None,
    dt_fim: Optional[str] = None,
    db: Session = Depends(get_db)
):
    from datetime import date as dt_date, timedelta
    from sqlalchemy import text
    import calendar
    from database import DATABASE_URL

    is_pg = DATABASE_URL.startswith("postgresql")
    today = dt_date.today()

    # Resolve range de datas
    if dt_inicio and dt_fim:
        d_ini = dt_date.fromisoformat(dt_inicio)
        d_fim = dt_date.fromisoformat(dt_fim)
    else:
        # padrão: últimos 12 meses
        d_fim = today
        d_ini = dt_date(today.year - 1, today.month, 1)

    dt_ini_str = d_ini.isoformat()
    dt_fim_str = d_fim.isoformat()

    # 1. Manutenções por mês no período
    if is_pg:
        mes_expr = "TO_CHAR(dt_inicio, 'YYYY-MM')"
    else:
        mes_expr = "strftime('%Y-%m', dt_inicio)"
    meses_raw = db.execute(text(f"""
        SELECT {mes_expr} as mes, tipo, COUNT(*) as total
        FROM manutencoes
        WHERE dt_inicio >= :di AND dt_inicio <= :df AND dt_inicio IS NOT NULL
        GROUP BY {mes_expr}, tipo
        ORDER BY mes
    """), {"di": dt_ini_str, "df": dt_fim_str}).fetchall()

    meses_dict: dict = {}
    for mes, tipo, total in meses_raw:
        if mes not in meses_dict:
            meses_dict[mes] = {"corretiva": 0, "preventiva": 0, "outros": 0}
        if tipo == "Corretiva":
            meses_dict[mes]["corretiva"] = total
        elif tipo == "Preventiva":
            meses_dict[mes]["preventiva"] = total
        else:
            meses_dict[mes]["outros"] += total

    # Gera lista de meses no range
    MESES_PT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"]
    manutencoes_por_mes = []
    cur = dt_date(d_ini.year, d_ini.month, 1)
    end_month = dt_date(d_fim.year, d_fim.month, 1)
    while cur <= end_month:
        mes_key = cur.strftime("%Y-%m")
        label = f"{MESES_PT[cur.month-1]}/{str(cur.year)[2:]}"
        d = meses_dict.get(mes_key, {"corretiva": 0, "preventiva": 0, "outros": 0})
        manutencoes_por_mes.append({
            "mes": mes_key,
            "label": label,
            "corretiva": d["corretiva"],
            "preventiva": d["preventiva"],
            "total": d["corretiva"] + d["preventiva"] + d["outros"],
        })
        # avança 1 mês
        if cur.month == 12:
            cur = dt_date(cur.year + 1, 1, 1)
        else:
            cur = dt_date(cur.year, cur.month + 1, 1)

    # 2. Custo total por veículo no período (top 10)
    custo_raw = db.execute(text("""
        SELECT v.id, v.placa, v.descricao,
               COUNT(DISTINCT m.id) as total_manutencoes,
               COALESCE(SUM(CAST(sv.valor AS REAL)), 0) as total_custo
        FROM veiculos v
        LEFT JOIN manutencoes m ON m.veiculo_id = v.id AND m.dt_inicio >= :di AND m.dt_inicio <= :df
        LEFT JOIN servicos_veiculo sv ON sv.manutencao_id = m.id AND sv.valor IS NOT NULL
        GROUP BY v.id, v.placa, v.descricao
        HAVING COUNT(DISTINCT m.id) > 0
        ORDER BY total_custo DESC
        LIMIT 10
    """), {"di": dt_ini_str, "df": dt_fim_str}).fetchall()

    custo_por_veiculo = [
        {"veiculo_id": r[0], "placa": r[1], "descricao": r[2],
         "total_manutencoes": r[3], "total_custo": float(r[4])}
        for r in custo_raw
    ]

    # 3. Ranking de veículos com mais manutenções no período (top 10)
    ranking_raw = db.execute(text("""
        SELECT v.id, v.placa, v.descricao, COUNT(m.id) as total
        FROM veiculos v
        JOIN manutencoes m ON m.veiculo_id = v.id AND m.dt_inicio >= :di AND m.dt_inicio <= :df
        GROUP BY v.id, v.placa, v.descricao
        ORDER BY total DESC
        LIMIT 10
    """), {"di": dt_ini_str, "df": dt_fim_str}).fetchall()

    ranking_manutencoes = [
        {"veiculo_id": r[0], "placa": r[1], "descricao": r[2], "total": r[3]}
        for r in ranking_raw
    ]

    return {
        "manutencoes_por_mes": manutencoes_por_mes,
        "custo_por_veiculo": custo_por_veiculo,
        "ranking_manutencoes": ranking_manutencoes,
        "dt_inicio": dt_ini_str,
        "dt_fim": dt_fim_str,
    }


# ── Stats ─────────────────────────────────────────────────────────────────────

@app.get("/api/stats")
def get_stats(db: Session = Depends(get_db)):
    total_man = db.query(models.Manutencao).count()
    em_andamento = db.query(models.Manutencao).filter(models.Manutencao.status == "Em Andamento").count()
    finalizadas = db.query(models.Manutencao).filter(models.Manutencao.status == "Finalizada").count()
    canceladas = db.query(models.Manutencao).filter(models.Manutencao.status == "Cancelada").count()
    total_veiculos = db.query(models.Veiculo).count()
    total_motoristas = db.query(models.Motorista).count()
    return {
        "total_manutencoes": total_man,
        "em_andamento": em_andamento,
        "finalizadas": finalizadas,
        "canceladas": canceladas,
        "total_veiculos": total_veiculos,
        "total_motoristas": total_motoristas,
    }


# ── Frota Status ──────────────────────────────────────────────────────────────

@app.get("/api/frota-status")
def frota_status(db: Session = Depends(get_db)):
    veiculos = db.query(models.Veiculo).order_by(models.Veiculo.placa).all()
    result = []
    for v in veiculos:
        man = (
            db.query(models.Manutencao)
            .options(
                joinedload(models.Manutencao.servicos),
                joinedload(models.Manutencao.motorista),
            )
            .filter(
                models.Manutencao.veiculo_id == v.id,
                models.Manutencao.status == "Em Andamento",
            )
            .order_by(models.Manutencao.dt_inicio.desc())
            .first()
        )
        result.append({
            "id": v.id,
            "placa": v.placa,
            "descricao": v.descricao,
            "tipo": v.tipo,
            "grupo": v.grupo,
            "ano": v.ano,
            "em_manutencao": man is not None,
            "manutencao": {
                "id": man.id,
                "dt_inicio": man.dt_inicio.isoformat() if man.dt_inicio else None,
                "dt_previsao": man.dt_previsao.isoformat() if man.dt_previsao else None,
                "responsavel": man.responsavel_manutencao,
                "tipo": man.tipo,
                "prioridade": man.prioridade,
                "servicos_solicitados": man.servicos_solicitados,
                "motorista": man.motorista.nome if man.motorista else None,
                "km_entrada": man.km_entrada,
                "servicos": [
                    {
                        "parte_veiculo": s.parte_veiculo,
                        "servico": s.servico,
                        "tipo_uso": s.tipo_uso,
                        "status": s.status,
                        "valor": float(s.valor) if s.valor else None,
                        "pessoa_responsavel": s.pessoa_responsavel,
                        "descricao": s.descricao,
                    }
                    for s in man.servicos
                ],
            } if man else None,
        })
    return result


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/api/health")
def health():
    return {"status": "ok", "app": "Frota Bello"}


# ── Solicitações ──────────────────────────────────────────────────────────────

@app.get("/api/solicitacoes", response_model=schemas.PaginatedSolicitacoes)
def list_solicitacoes(
    page: int = 1, per_page: int = 50,
    status: Optional[str] = None,
    prioridade: Optional[str] = None,
    search: Optional[str] = None,
    veiculo_id: Optional[int] = None,
    ativo_id: Optional[int] = None,
    manutencao_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    q = db.query(models.Solicitacao).options(
        joinedload(models.Solicitacao.veiculo),
        joinedload(models.Solicitacao.ativo),
    )
    if veiculo_id:
        q = q.filter(models.Solicitacao.veiculo_id == veiculo_id)
    if ativo_id:
        q = q.filter(models.Solicitacao.ativo_id == ativo_id)
    if manutencao_id:
        q = q.filter(models.Solicitacao.manutencao_id == manutencao_id)
    if status:
        q = q.filter(models.Solicitacao.status == status)
    if prioridade:
        q = q.filter(models.Solicitacao.prioridade == prioridade)
    if search:
        q = q.filter(
            models.Solicitacao.descricao.ilike(f"%{search}%") |
            models.Solicitacao.solicitante.ilike(f"%{search}%")
        )
    total = q.count()
    items = q.order_by(models.Solicitacao.dt_solicitacao.desc()).offset((page - 1) * per_page).limit(per_page).all()
    return {"items": items, "total": total, "page": page, "per_page": per_page, "total_pages": max(1, -(-total // per_page))}


@app.post("/api/solicitacoes", response_model=schemas.SolicitacaoOut, status_code=201)
def create_solicitacao(data: schemas.SolicitacaoCreate, db: Session = Depends(get_db)):
    sol = models.Solicitacao(**data.model_dump())
    db.add(sol)
    db.commit()
    db.refresh(sol)
    return sol


@app.put("/api/solicitacoes/{sol_id}", response_model=schemas.SolicitacaoOut)
def update_solicitacao(sol_id: int, data: schemas.SolicitacaoUpdate, db: Session = Depends(get_db)):
    sol = db.query(models.Solicitacao).filter(models.Solicitacao.id == sol_id).first()
    if not sol:
        raise HTTPException(status_code=404, detail="Solicitação não encontrada")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(sol, k, v)
    db.commit()
    db.refresh(sol)
    return sol


@app.delete("/api/solicitacoes/{sol_id}", status_code=204)
def delete_solicitacao(sol_id: int, db: Session = Depends(get_db)):
    sol = db.query(models.Solicitacao).filter(models.Solicitacao.id == sol_id).first()
    if not sol:
        raise HTTPException(status_code=404, detail="Solicitação não encontrada")
    db.delete(sol)
    db.commit()


# ── Backup ────────────────────────────────────────────────────────────────────

DB_PATH = Path(__file__).parent / "frota_bello.db"
BACKUP_LOCAL = Path(__file__).parent.parent.parent / "backups_frota"
BACKUP_ONEDRIVE = Path(r"C:\Users\jimmy.ramos\OneDrive - Bello Alimentos LTDA\Bello\backups_frota")


@app.post("/api/backup")
def fazer_backup():
    db_url = os.environ.get("DATABASE_URL", "")
    if "postgresql" in db_url or "postgres" in db_url:
        return {"arquivo": None, "destinos": [], "avisos": ["Backup não disponível no ambiente cloud (PostgreSQL). Use o painel do Render para fazer backup."], "tamanho_kb": 0, "cloud": True}
    if not DB_PATH.exists():
        raise HTTPException(status_code=404, detail="Banco de dados não encontrado")

    ts = datetime.now().strftime("%Y-%m-%d_%H%M%S")
    nome = f"frota_bello_{ts}.db"
    destinos = []
    erros = []

    for pasta in [BACKUP_LOCAL, BACKUP_ONEDRIVE]:
        try:
            pasta.mkdir(parents=True, exist_ok=True)
            shutil.copy2(str(DB_PATH), str(pasta / nome))
            destinos.append(str(pasta / nome))
        except Exception as e:
            erros.append(f"{pasta.name}: {e}")

    if not destinos:
        raise HTTPException(status_code=500, detail="Falha ao salvar backup: " + "; ".join(erros))

    return {
        "arquivo": nome,
        "destinos": destinos,
        "avisos": erros,
        "tamanho_kb": round(DB_PATH.stat().st_size / 1024, 1),
        "timestamp": ts,
    }


@app.get("/api/backups")
def listar_backups():
    resultado = []
    for pasta in [BACKUP_LOCAL, BACKUP_ONEDRIVE]:
        if pasta.exists():
            for f in sorted(pasta.glob("frota_bello_*.db"), reverse=True)[:20]:
                resultado.append({
                    "nome": f.name,
                    "pasta": str(pasta),
                    "tamanho_kb": round(f.stat().st_size / 1024, 1),
                    "data": f.stat().st_mtime,
                })
    resultado.sort(key=lambda x: x["data"], reverse=True)
    return resultado


# ── Serve React frontend (deve ficar por último) ───────────────────────────────
if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="static-assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_frontend(full_path: str):
        index = FRONTEND_DIST / "index.html"
        return FileResponse(str(index))
