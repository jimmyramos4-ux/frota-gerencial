from sqlalchemy import Column, Integer, String, Text, DateTime, Date, Numeric, Boolean, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base
import enum


class StatusManutencao(str, enum.Enum):
    em_andamento = "Em Andamento"
    finalizada = "Finalizada"
    cancelada = "Cancelada"


class PrioridadeManutencao(str, enum.Enum):
    alta = "Alta"
    media = "Média"
    baixa = "Baixa"


class TipoManutencao(str, enum.Enum):
    corretiva = "Corretiva"
    preventiva = "Preventiva"


class StatusServico(str, enum.Enum):
    em_andamento = "Em Andamento"
    finalizado = "Finalizado"
    cancelado = "Cancelado"


class TipoUso(str, enum.Enum):
    corretiva = "Corretiva"
    preventiva = "Preventiva"


class Veiculo(Base):
    __tablename__ = "veiculos"

    id = Column(Integer, primary_key=True, index=True)
    placa = Column(String(20), unique=True, nullable=False, index=True)
    marca = Column(String(100), nullable=True)
    modelo = Column(String(100), nullable=True)
    descricao = Column(String(200), nullable=True)
    tipo = Column(String(100))
    grupo = Column(String(100))
    ano = Column(Integer)
    chassi = Column(String(50))
    capacidade = Column(String(100), nullable=True)
    centro_custo = Column(String(100), nullable=True)
    vinculo = Column(String(50), nullable=True)
    ultimo_km = Column(Integer, nullable=True)
    ultimo_km_data = Column(DateTime, nullable=True)
    motorista_id = Column(Integer, ForeignKey("motoristas.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    manutencoes = relationship("Manutencao", back_populates="veiculo")
    motorista = relationship("Motorista")
    arquivos = relationship("ArquivoVeiculo", back_populates="veiculo", cascade="all, delete-orphan")


class Motorista(Base):
    __tablename__ = "motoristas"

    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String(50), unique=True, nullable=False, index=True)
    nome = Column(String(200), nullable=False)
    cpf = Column(String(20), nullable=True)
    nr_registro_cnh = Column(String(30), nullable=True)
    validade_cnh = Column(String(10), nullable=True)
    categoria_cnh = Column(String(10), nullable=True)
    telefone = Column(String(30), nullable=True)
    email = Column(String(200), nullable=True)
    cidade_emissao_cnh = Column(String(100), nullable=True)
    dt_exame_toxicologico = Column(String(10), nullable=True)
    tipo = Column(String(50), nullable=True)
    dt_nascimento = Column(String(10), nullable=True)
    ativo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    manutencoes = relationship("Manutencao", back_populates="motorista")
    arquivos = relationship("ArquivoMotorista", back_populates="motorista", cascade="all, delete-orphan")


class Ativo(Base):
    __tablename__ = "ativos"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(200), nullable=False)
    tipo = Column(String(100), nullable=True)
    codigo = Column(String(50), nullable=True)
    localizacao = Column(String(200), nullable=True)
    descricao = Column(Text, nullable=True)
    observacao = Column(Text, nullable=True)
    ativo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    manutencoes = relationship("Manutencao", back_populates="ativo")


class Manutencao(Base):
    __tablename__ = "manutencoes"

    id = Column(Integer, primary_key=True, index=True)
    veiculo_id = Column(Integer, ForeignKey("veiculos.id"), nullable=True)
    ativo_id = Column(Integer, ForeignKey("ativos.id"), nullable=True)
    motorista_id = Column(Integer, ForeignKey("motoristas.id"), nullable=True)
    km_entrada = Column(Integer)
    horimetro_entrada = Column(Numeric(10, 2))
    dt_inicio = Column(DateTime)
    dt_previsao = Column(DateTime)
    dt_termino = Column(DateTime)
    responsavel_manutencao = Column(String(200))
    requisitante = Column(String(200))
    status = Column(
        SAEnum(StatusManutencao, values_callable=lambda x: [e.value for e in x]),
        default=StatusManutencao.em_andamento,
        nullable=False
    )
    prioridade = Column(
        SAEnum(PrioridadeManutencao, values_callable=lambda x: [e.value for e in x]),
        nullable=True
    )
    tipo = Column(
        SAEnum(TipoManutencao, values_callable=lambda x: [e.value for e in x]),
        nullable=True
    )
    servicos_solicitados = Column(Text)
    observacao = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    veiculo = relationship("Veiculo", back_populates="manutencoes")
    ativo = relationship("Ativo", back_populates="manutencoes")
    motorista = relationship("Motorista", back_populates="manutencoes")
    servicos = relationship("ServicoVeiculo", back_populates="manutencao", cascade="all, delete-orphan")
    arquivos = relationship("ArquivoManutencao", back_populates="manutencao", cascade="all, delete-orphan")


class ServicoVeiculo(Base):
    __tablename__ = "servicos_veiculo"

    id = Column(Integer, primary_key=True, index=True)
    manutencao_id = Column(Integer, ForeignKey("manutencoes.id"), nullable=False)
    status = Column(
        SAEnum(StatusServico, values_callable=lambda x: [e.value for e in x]),
        default=StatusServico.em_andamento
    )
    parte_veiculo = Column(String(200))
    servico = Column(String(200))
    tipo_servico = Column(String(200), nullable=True)
    tipo_uso = Column(
        SAEnum(TipoUso, values_callable=lambda x: [e.value for e in x]),
        nullable=True
    )
    dt_servico = Column(Date)
    proxima_dt_validade = Column(Date, nullable=True)
    proximo_km_validade = Column(Integer, nullable=True)
    pessoa_responsavel = Column(String(200))
    descricao = Column(Text)
    valor = Column(Numeric(12, 2))
    horas_trabalhadas = Column(String(20))
    created_at = Column(DateTime, default=datetime.utcnow)

    manutencao = relationship("Manutencao", back_populates="servicos")


class ParteVeiculo(Base):
    __tablename__ = "partes_veiculo"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(200), unique=True, nullable=False)
    email_notificacao = Column(String(300), nullable=True)
    ativo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class TipoServicoCad(Base):
    __tablename__ = "tipos_servico"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(200), unique=True, nullable=False)
    parte_veiculo = Column(String(200), nullable=True)
    uso = Column(String(100), nullable=True)
    descricao = Column(Text, nullable=True)
    nr_dias_validade = Column(Integer, nullable=True)
    nr_dias_notificacao = Column(Integer, nullable=True)
    hodometro_km_validade = Column(Integer, nullable=True)
    hodometro_km_notificacao = Column(Integer, nullable=True)
    categoria_servico = Column(String(100), nullable=True)
    valor_sugerido = Column(Numeric(10, 2), nullable=True)
    bloqueia_no_periodo = Column(Boolean, default=False)
    bloqueia_depois_vencimento = Column(Boolean, default=False)
    alerta_servico_realizado = Column(String(100), nullable=True)
    tempo_execucao = Column(String(100), nullable=True)
    nr_dias_alerta_servico = Column(Integer, nullable=True)
    ativo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class OficinaPrestador(Base):
    __tablename__ = "oficinas_prestadores"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(200), unique=True, nullable=False)
    cnpj_cpf = Column(String(20), nullable=True)
    telefone = Column(String(50), nullable=True)
    email = Column(String(200), nullable=True)
    endereco = Column(String(300), nullable=True)
    cidade = Column(String(100), nullable=True)
    especialidade = Column(String(200), nullable=True)
    observacao = Column(Text, nullable=True)
    ativo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Solicitacao(Base):
    __tablename__ = "solicitacoes"

    id = Column(Integer, primary_key=True, index=True)
    veiculo_id = Column(Integer, ForeignKey("veiculos.id"), nullable=True)
    ativo_id = Column(Integer, ForeignKey("ativos.id"), nullable=True)
    manutencao_id = Column(Integer, ForeignKey("manutencoes.id"), nullable=True)
    solicitante = Column(String(200), nullable=False)
    parte_veiculo = Column(String(200), nullable=True)
    descricao = Column(Text, nullable=False)
    prioridade = Column(String(20), nullable=False, default="Média")
    status = Column(String(30), nullable=False, default="Aberta")
    observacao = Column(Text, nullable=True)
    imagens = Column(Text, nullable=True)  # JSON array of base64 data URLs
    acao = Column(Text, nullable=True)
    prazo_acao = Column(String(10), nullable=True)
    dt_solicitacao = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    veiculo = relationship("Veiculo")
    ativo = relationship("Ativo")
    manutencao = relationship("Manutencao", foreign_keys=[manutencao_id])


class ArquivoMotorista(Base):
    __tablename__ = "arquivos_motorista"

    id = Column(Integer, primary_key=True, index=True)
    motorista_id = Column(Integer, ForeignKey("motoristas.id"), nullable=False)
    nome_arquivo = Column(String(300), nullable=False)
    caminho = Column(String(500), nullable=False)
    descricao = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    motorista = relationship("Motorista", back_populates="arquivos")


class ArquivoVeiculo(Base):
    __tablename__ = "arquivos_veiculo"

    id = Column(Integer, primary_key=True, index=True)
    veiculo_id = Column(Integer, ForeignKey("veiculos.id"), nullable=False)
    nome_arquivo = Column(String(300), nullable=False)
    caminho = Column(String(500), nullable=False)
    descricao = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    veiculo = relationship("Veiculo", back_populates="arquivos")


class ArquivoManutencao(Base):
    __tablename__ = "arquivos_manutencao"

    id = Column(Integer, primary_key=True, index=True)
    manutencao_id = Column(Integer, ForeignKey("manutencoes.id"), nullable=False)
    nome_arquivo = Column(String(300), nullable=False)
    caminho = Column(String(500), nullable=True)
    conteudo = Column(Text, nullable=True)  # base64 data URL
    descricao = Column(Text)
    usuario = Column(String(200))
    created_at = Column(DateTime, default=datetime.utcnow)

    manutencao = relationship("Manutencao", back_populates="arquivos")


class AcaoVencimento(Base):
    __tablename__ = "acoes_vencimento"

    id = Column(Integer, primary_key=True, index=True)
    row_key = Column(String(100), unique=True, nullable=False, index=True)
    acao = Column(Text, nullable=True)
    prazo = Column(String(10), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
