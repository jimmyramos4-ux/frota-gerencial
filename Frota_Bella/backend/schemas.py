from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal


# ── ParteVeiculo ─────────────────────────────────────────────────────────────

class ParteVeiculoCreate(BaseModel):
    nome: str
    email_notificacao: Optional[str] = None
    ativo: bool = True

class ParteVeiculoOut(ParteVeiculoCreate):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True

class PaginatedPartesVeiculo(BaseModel):
    items: List[ParteVeiculoOut]
    total: int
    page: int
    per_page: int
    total_pages: int


# ── TipoServicoCad ────────────────────────────────────────────────────────────

class TipoServicoCadCreate(BaseModel):
    nome: str
    parte_veiculo: Optional[str] = None
    uso: Optional[str] = None
    descricao: Optional[str] = None
    nr_dias_validade: Optional[int] = None
    nr_dias_notificacao: Optional[int] = None
    hodometro_km_validade: Optional[int] = None
    hodometro_km_notificacao: Optional[int] = None
    categoria_servico: Optional[str] = None
    valor_sugerido: Optional[Decimal] = None
    bloqueia_no_periodo: bool = False
    bloqueia_depois_vencimento: bool = False
    alerta_servico_realizado: Optional[str] = None
    tempo_execucao: Optional[str] = None
    nr_dias_alerta_servico: Optional[int] = None
    ativo: bool = True

class TipoServicoCadOut(TipoServicoCadCreate):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True


# ── Ativo ────────────────────────────────────────────────────────────────────

class AtivoCreate(BaseModel):
    nome: str
    tipo: Optional[str] = None
    codigo: Optional[str] = None
    localizacao: Optional[str] = None
    descricao: Optional[str] = None
    observacao: Optional[str] = None
    ativo: bool = True

class AtivoUpdate(BaseModel):
    nome: Optional[str] = None
    tipo: Optional[str] = None
    codigo: Optional[str] = None
    localizacao: Optional[str] = None
    descricao: Optional[str] = None
    observacao: Optional[str] = None
    ativo: Optional[bool] = None

class AtivoOut(AtivoCreate):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True

class PaginatedAtivos(BaseModel):
    items: List[AtivoOut]
    total: int
    page: int
    per_page: int
    total_pages: int


# ── OficinaPrestador ─────────────────────────────────────────────────────────

class OficinaPrestadorCreate(BaseModel):
    nome: str
    cnpj_cpf: Optional[str] = None
    telefone: Optional[str] = None
    email: Optional[str] = None
    endereco: Optional[str] = None
    cidade: Optional[str] = None
    especialidade: Optional[str] = None
    observacao: Optional[str] = None
    ativo: bool = True

class OficinaPrestadorUpdate(BaseModel):
    nome: Optional[str] = None
    cnpj_cpf: Optional[str] = None
    telefone: Optional[str] = None
    email: Optional[str] = None
    endereco: Optional[str] = None
    cidade: Optional[str] = None
    especialidade: Optional[str] = None
    observacao: Optional[str] = None
    ativo: Optional[bool] = None

class OficinaPrestadorOut(OficinaPrestadorCreate):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True

class PaginatedOficinasPrestadores(BaseModel):
    items: List[OficinaPrestadorOut]
    total: int
    page: int
    per_page: int
    total_pages: int


# ── ArquivoVeiculo ───────────────────────────────────────────────────────────

class ArquivoVeiculoOut(BaseModel):
    id: int
    veiculo_id: int
    nome_arquivo: str
    caminho: Optional[str] = None
    conteudo: Optional[str] = None
    descricao: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ArquivoMotoristaOut(BaseModel):
    id: int
    motorista_id: int
    nome_arquivo: str
    caminho: Optional[str] = None
    conteudo: Optional[str] = None
    descricao: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ── Veiculo ──────────────────────────────────────────────────────────────────

class VeiculoBase(BaseModel):
    placa: str
    marca: Optional[str] = None
    modelo: Optional[str] = None
    descricao: Optional[str] = None
    tipo: Optional[str] = None
    grupo: Optional[str] = None
    ano: Optional[int] = None
    chassi: Optional[str] = None
    capacidade: Optional[str] = None
    centro_custo: Optional[str] = None
    vinculo: Optional[str] = None
    motorista_id: Optional[int] = None


class VeiculoCreate(VeiculoBase):
    descricao: Optional[str] = None


class VeiculoUpdate(BaseModel):
    placa: Optional[str] = None
    marca: Optional[str] = None
    modelo: Optional[str] = None
    descricao: Optional[str] = None
    tipo: Optional[str] = None
    grupo: Optional[str] = None
    ano: Optional[int] = None
    chassi: Optional[str] = None
    capacidade: Optional[str] = None
    centro_custo: Optional[str] = None
    vinculo: Optional[str] = None
    motorista_id: Optional[int] = None
    ultimo_km: Optional[int] = None
    ultimo_km_data: Optional[datetime] = None


class VeiculoOut(VeiculoBase):
    id: int
    ultimo_km: Optional[int] = None
    ultimo_km_data: Optional[datetime] = None
    created_at: datetime
    motorista: Optional['MotoristaOut'] = None
    arquivos_count: Optional[int] = 0

    class Config:
        from_attributes = True


# ── Motorista ─────────────────────────────────────────────────────────────────

class MotoristaBase(BaseModel):
    codigo: Optional[str] = None
    nome: str
    cpf: Optional[str] = None
    nr_registro_cnh: Optional[str] = None
    validade_cnh: Optional[str] = None
    categoria_cnh: Optional[str] = None
    telefone: Optional[str] = None
    email: Optional[str] = None
    cidade_emissao_cnh: Optional[str] = None
    dt_exame_toxicologico: Optional[str] = None
    tipo: Optional[str] = None
    dt_nascimento: Optional[str] = None
    ativo: Optional[bool] = True


class MotoristaCreate(MotoristaBase):
    pass


class MotoristaUpdate(BaseModel):
    codigo: Optional[str] = None
    nome: Optional[str] = None
    cpf: Optional[str] = None
    nr_registro_cnh: Optional[str] = None
    validade_cnh: Optional[str] = None
    categoria_cnh: Optional[str] = None
    telefone: Optional[str] = None
    email: Optional[str] = None
    cidade_emissao_cnh: Optional[str] = None
    dt_exame_toxicologico: Optional[str] = None
    tipo: Optional[str] = None
    dt_nascimento: Optional[str] = None
    ativo: Optional[bool] = True


class MotoristaOut(MotoristaBase):
    id: int
    created_at: datetime
    arquivos_count: Optional[int] = 0

    class Config:
        from_attributes = True


# ── ServicoVeiculo ────────────────────────────────────────────────────────────

class ServicoVeiculoBase(BaseModel):
    status: Optional[str] = "Em Andamento"
    parte_veiculo: Optional[str] = None
    servico: Optional[str] = None
    tipo_servico: Optional[str] = None
    tipo_uso: Optional[str] = None
    dt_servico: Optional[date] = None
    proxima_dt_validade: Optional[date] = None
    proximo_km_validade: Optional[int] = None
    pessoa_responsavel: Optional[str] = None
    descricao: Optional[str] = None
    valor: Optional[Decimal] = None
    horas_trabalhadas: Optional[str] = None


class ServicoVeiculoCreate(ServicoVeiculoBase):
    pass


class ServicoVeiculoUpdate(ServicoVeiculoBase):
    pass


class ServicoVeiculoOut(ServicoVeiculoBase):
    id: int
    manutencao_id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ── ArquivoManutencao ─────────────────────────────────────────────────────────

class ArquivoManutencaoOut(BaseModel):
    id: int
    manutencao_id: int
    nome_arquivo: str
    caminho: Optional[str] = None
    conteudo: Optional[str] = None
    descricao: Optional[str] = None
    usuario: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ── Manutencao ────────────────────────────────────────────────────────────────

class ManutencaoBase(BaseModel):
    veiculo_id: Optional[int] = None
    ativo_id: Optional[int] = None
    motorista_id: Optional[int] = None
    km_entrada: Optional[int] = None
    horimetro_entrada: Optional[Decimal] = None
    dt_inicio: Optional[datetime] = None
    dt_previsao: Optional[datetime] = None
    dt_termino: Optional[datetime] = None
    responsavel_manutencao: Optional[str] = None
    requisitante: Optional[str] = None
    status: Optional[str] = "Em Andamento"
    prioridade: Optional[str] = None
    tipo: Optional[str] = None
    servicos_solicitados: Optional[str] = None
    observacao: Optional[str] = None


class ManutencaoCreate(ManutencaoBase):
    pass


class ManutencaoUpdate(ManutencaoBase):
    veiculo_id: Optional[int] = None


class ManutencaoListItem(BaseModel):
    id: int
    veiculo_placa: Optional[str] = None
    veiculo_descricao: Optional[str] = None
    ativo_nome: Optional[str] = None
    ativo_tipo: Optional[str] = None
    motorista_nome: Optional[str] = None
    motorista_codigo: Optional[str] = None
    responsavel_manutencao: Optional[str] = None
    km_entrada: Optional[int] = None
    dt_inicio: Optional[datetime] = None
    dt_previsao: Optional[datetime] = None
    dt_termino: Optional[datetime] = None
    prioridade: Optional[str] = None
    tipo: Optional[str] = None
    status: Optional[str] = None
    created_at: datetime
    arquivos_count: int = 0

    class Config:
        from_attributes = True


class ManutencaoOut(ManutencaoBase):
    id: int
    created_at: datetime
    updated_at: datetime
    veiculo: Optional[VeiculoOut] = None
    ativo: Optional[AtivoOut] = None
    motorista: Optional[MotoristaOut] = None
    servicos: List[ServicoVeiculoOut] = []
    arquivos: List[ArquivoManutencaoOut] = []

    class Config:
        from_attributes = True


class PaginatedManutencoes(BaseModel):
    items: List[ManutencaoListItem]
    total: int
    page: int
    per_page: int
    total_pages: int


class PaginatedTiposServico(BaseModel):
    items: List[TipoServicoCadOut]
    total: int
    page: int
    per_page: int
    total_pages: int


# ── Solicitacao ───────────────────────────────────────────────────────────────

class SolicitacaoCreate(BaseModel):
    veiculo_id: Optional[int] = None
    ativo_id: Optional[int] = None
    solicitante: str
    parte_veiculo: Optional[str] = None
    descricao: str
    prioridade: str = "Média"
    status: str = "Aberta"
    observacao: Optional[str] = None
    imagens: Optional[str] = None
    acao: Optional[str] = None
    prazo_acao: Optional[str] = None
    dt_solicitacao: Optional[datetime] = None

class SolicitacaoUpdate(BaseModel):
    veiculo_id: Optional[int] = None
    ativo_id: Optional[int] = None
    manutencao_id: Optional[int] = None
    solicitante: Optional[str] = None
    parte_veiculo: Optional[str] = None
    descricao: Optional[str] = None
    prioridade: Optional[str] = None
    status: Optional[str] = None
    observacao: Optional[str] = None
    imagens: Optional[str] = None
    acao: Optional[str] = None
    prazo_acao: Optional[str] = None
    dt_solicitacao: Optional[datetime] = None

class SolicitacaoOut(SolicitacaoCreate):
    id: int
    manutencao_id: Optional[int] = None
    dt_solicitacao: datetime
    updated_at: datetime
    veiculo: Optional[VeiculoOut] = None
    ativo: Optional[AtivoOut] = None

    class Config:
        from_attributes = True

class PaginatedSolicitacoes(BaseModel):
    items: List[SolicitacaoOut]
    total: int
    page: int
    per_page: int
    total_pages: int
