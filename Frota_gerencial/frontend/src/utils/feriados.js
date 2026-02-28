/**
 * feriados.js — Utilitário de feriados brasileiros e cálculo de dias úteis
 * Regras: Seg-Sex = 1 dia, Sáb = 0.5 dia, Dom = 0, Feriado nacional = 0
 */

/** Calcula a data da Páscoa pelo algoritmo de Butcher */
function calcEaster(year) {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day);
}

/**
 * Retorna mapa de feriados nacionais brasileiros para o ano.
 * Chave: "YYYY-MM-DD" → nome do feriado
 */
export function getFeriadosNacionais(year) {
    const f = {};
    const add = (month, day, nome) => {
        const key = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        f[key] = nome;
    };

    // Feriados fixos
    add(1, 1, 'Confraternização');
    add(4, 21, 'Tiradentes');
    add(5, 1, 'Dia do Trabalho');
    add(9, 7, 'Independência');
    add(10, 12, 'N. Sra. Aparecida');
    add(11, 2, 'Finados');
    add(11, 15, 'Proclamação da República');
    add(11, 20, 'Consciência Negra');
    add(12, 25, 'Natal');

    // Feriados móveis (base: Páscoa)
    const easter = calcEaster(year);

    const addOffset = (offsetDays, nome) => {
        const d = new Date(easter);
        d.setDate(d.getDate() + offsetDays);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        f[key] = nome;
    };

    addOffset(-48, 'Carnaval (seg)');
    addOffset(-47, 'Carnaval (ter)');
    addOffset(-2, 'Sexta-feira Santa');
    addOffset(0, 'Páscoa');
    addOffset(60, 'Corpus Christi');

    return f;
}

/**
 * Retorna o mapa de feriados de um mês específico.
 * Chave: número do dia (int) → nome do feriado
 */
export function getFeriadosMes(ano, mes) {
    const todos = getFeriadosNacionais(ano);
    const mesStr = String(mes).padStart(2, '0');
    const result = {};
    for (const [key, nome] of Object.entries(todos)) {
        const [y, m, d] = key.split('-');
        if (parseInt(y) === ano && parseInt(m) === mes) {
            result[parseInt(d)] = nome;
        }
    }
    return result;
}

/**
 * Calcula dias úteis do mês considerando:
 *   - Seg–Sex = 1.0
 *   - Sáb = 0.5
 *   - Dom = 0
 *   - Feriado nacional = 0 (independente do dia da semana)
 *
 * @param {number} ano
 * @param {number} mes  (1-12)
 * @returns {{ total: number, detalhes: Array<{dia,dow,feriado,peso}> }}
 */
export function calcDiasUteisAuto(ano, mes) {
    const feriados = getFeriadosMes(ano, mes);
    const totalDias = new Date(ano, mes, 0).getDate();
    const detalhes = [];
    let total = 0;

    for (let dia = 1; dia <= totalDias; dia++) {
        const dt = new Date(ano, mes - 1, dia);
        const dow = dt.getDay(); // 0=Dom, 6=Sáb

        let peso = 0;
        const ehFeriado = !!feriados[dia];

        if (!ehFeriado) {
            if (dow === 0) peso = 0;       // Domingo
            else if (dow === 6) peso = 0.5; // Sábado
            else peso = 1;                  // Seg–Sex
        }
        // Feriado = 0 (já está 0 por padrão)

        total += peso;
        detalhes.push({ dia, dow, feriado: feriados[dia] || null, peso });
    }

    return { total, detalhes };
}

/**
 * Calcula quantos dias úteis já se passaram no mês,
 * somando os pesos dos dias que têm receita > 0 no daily_data.
 * (Considera apenas dias até hoje — ou todos se mês já passou)
 */
export function calcDiasUteisPassados(ano, mes, dailyData) {
    const feriados = getFeriadosMes(ano, mes);
    let passados = 0;

    for (const d of dailyData) {
        if (!d.day_int || (d.receita || 0) <= 0) continue;
        const dia = d.day_int;
        const dt = new Date(ano, mes - 1, dia);
        const dow = dt.getDay();
        const ehFeriado = !!feriados[dia];

        let peso = 0;
        if (!ehFeriado) {
            if (dow === 0) peso = 0;
            else if (dow === 6) peso = 0.5;
            else peso = 1;
        }
        passados += peso;
    }

    return passados;
}
