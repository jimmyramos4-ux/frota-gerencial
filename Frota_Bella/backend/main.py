import os
import shutil
import math
from pathlib import Path
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, Query
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

app = FastAPI(title="Frota Bella API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path(__file__).parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

app.mount("/api/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")


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
            tipo_uso="Interna",
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
            tipo_uso="Interna",
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
def lookup_tipos_servico(search: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.TipoServicoCad).filter(models.TipoServicoCad.ativo == True)
    if search:
        query = query.filter(models.TipoServicoCad.nome.ilike(f"%{search}%"))
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
    query = db.query(models.Veiculo)
    if search:
        query = query.filter(
            or_(
                models.Veiculo.placa.ilike(f"%{search}%"),
                models.Veiculo.descricao.ilike(f"%{search}%"),
            )
        )
    return query.order_by(models.Veiculo.placa).all()


@app.post("/api/veiculos", response_model=schemas.VeiculoOut, status_code=201)
def create_veiculo(data: schemas.VeiculoCreate, db: Session = Depends(get_db)):
    existing = db.query(models.Veiculo).filter(models.Veiculo.placa == data.placa).first()
    if existing:
        raise HTTPException(status_code=400, detail="Placa já cadastrada")
    veiculo = models.Veiculo(**data.model_dump())
    db.add(veiculo)
    db.commit()
    db.refresh(veiculo)
    return veiculo


@app.get("/api/veiculos/{veiculo_id}", response_model=schemas.VeiculoOut)
def get_veiculo(veiculo_id: int, db: Session = Depends(get_db)):
    veiculo = db.query(models.Veiculo).filter(models.Veiculo.id == veiculo_id).first()
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
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(veiculo, field, value)
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


# ── Motoristas ────────────────────────────────────────────────────────────────

@app.get("/api/motoristas", response_model=list[schemas.MotoristaOut])
def list_motoristas(search: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.Motorista)
    if search:
        query = query.filter(
            or_(
                models.Motorista.codigo.ilike(f"%{search}%"),
                models.Motorista.nome.ilike(f"%{search}%"),
            )
        )
    return query.order_by(models.Motorista.nome).all()


@app.post("/api/motoristas", response_model=schemas.MotoristaOut, status_code=201)
def create_motorista(data: schemas.MotoristaCreate, db: Session = Depends(get_db)):
    existing = db.query(models.Motorista).filter(models.Motorista.codigo == data.codigo).first()
    if existing:
        raise HTTPException(status_code=400, detail="Código de motorista já cadastrado")
    motorista = models.Motorista(**data.model_dump())
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


# ── Manutencoes ───────────────────────────────────────────────────────────────

@app.get("/api/manutencoes", response_model=schemas.PaginatedManutencoes)
def list_manutencoes(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    status: Optional[str] = None,
    tipo: Optional[str] = None,
    prioridade: Optional[str] = None,
    veiculo: Optional[str] = None,
    motorista: Optional[str] = None,
    dt_inicio_gte: Optional[str] = None,
    dt_inicio_lte: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = (
        db.query(models.Manutencao)
        .options(joinedload(models.Manutencao.veiculo), joinedload(models.Manutencao.motorista))
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
    veiculo = db.query(models.Veiculo).filter(models.Veiculo.id == data.veiculo_id).first()
    if not veiculo:
        raise HTTPException(status_code=404, detail="Veículo não encontrado")
    man = models.Manutencao(**data.model_dump())
    db.add(man)
    db.commit()
    db.refresh(man)
    return db.query(models.Manutencao).options(
        joinedload(models.Manutencao.veiculo),
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
    file: UploadFile = File(...),
    descricao: Optional[str] = Form(None),
    usuario: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    man = db.query(models.Manutencao).filter(models.Manutencao.id == manutencao_id).first()
    if not man:
        raise HTTPException(status_code=404, detail="Manutenção não encontrada")

    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S%f")
    safe_name = f"{timestamp}_{file.filename}"
    file_path = UPLOAD_DIR / safe_name

    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    arquivo = models.ArquivoManutencao(
        manutencao_id=manutencao_id,
        nome_arquivo=file.filename,
        caminho=safe_name,
        descricao=descricao,
        usuario=usuario or "Sistema",
    )
    db.add(arquivo)
    db.commit()
    db.refresh(arquivo)
    return arquivo


@app.delete("/api/arquivos/{arquivo_id}", status_code=204)
def delete_arquivo(arquivo_id: int, db: Session = Depends(get_db)):
    arquivo = db.query(models.ArquivoManutencao).filter(models.ArquivoManutencao.id == arquivo_id).first()
    if not arquivo:
        raise HTTPException(status_code=404, detail="Arquivo não encontrado")
    file_path = UPLOAD_DIR / arquivo.caminho
    if file_path.exists():
        file_path.unlink()
    db.delete(arquivo)
    db.commit()


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
    return {"status": "ok", "app": "Frota Bella"}
