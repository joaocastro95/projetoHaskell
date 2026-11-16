// PerdaZero — front em JavaScript puro, conversando com a API Haskell (Servant) via fetch.

// ---------- Utilidades ----------
const $ = (sel) => document.querySelector(sel);
const brl = (v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const INTEIRAS = ["un", "cx", "pct", "dz", "g", "mL"];
const qtd = (v, u) => `${v.toLocaleString("pt-BR", { maximumFractionDigits: INTEIRAS.includes(u) ? 0 : 2 })} ${u}`;
const dataBR = (iso) => iso.split("-").reverse().join("/");
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/** Lê números no padrão brasileiro: "1.234,56", "R$ 89,90", "1,5". */
function lerNumero(s) {
  s = String(s ?? "").replace(/R\$|\s/g, "");
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  return s === "" ? NaN : Number(s);
}

function hojeISO() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
function somarDias(iso, n) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

const NIVEL = {
  vencido: { rotulo: "Vencido", cor: "#dc2626", fundo: "#dc2626", texto: "#fff" },
  hoje: { rotulo: "Vence hoje", cor: "#ef4444", fundo: "#fee2e2", texto: "#991b1b" },
  "3dias": { rotulo: "Até 3 dias", cor: "#f59e0b", fundo: "#fef3c7", texto: "#92400e" },
  "7dias": { rotulo: "Até 7 dias", cor: "#facc15", fundo: "#fef9c3", texto: "#854d0e" },
  ok: { rotulo: "No prazo", cor: "#10b981", fundo: "#ecfdf5", texto: "#065f46" },
};
const MOTIVOS = { vencido: "Vencido", estragado: "Estragado", sobra: "Sobra" };
const DESTINOS = { uso_normal: "Uso normal", prato_do_dia: "Prato do dia", promocao: "Promoção", doacao: "Doação" };

function textoDias(d) {
  if (d < 0) return `venceu há ${-d} dia${d === -1 ? "" : "s"}`;
  if (d === 0) return "vence hoje";
  if (d === 1) return "vence amanhã";
  return `vence em ${d} dias`;
}

// ---------- Sessão (token guardado no navegador) ----------
const sessao = {
  get token() { try { return localStorage.getItem("pz_token"); } catch { return null; } },
  get restaurante() { try { return localStorage.getItem("pz_restaurante") || ""; } catch { return ""; } },
  salvar(s) { try { localStorage.setItem("pz_token", s.token); localStorage.setItem("pz_restaurante", s.restaurante); } catch { /* sem storage */ } },
  limpar() { try { localStorage.removeItem("pz_token"); localStorage.removeItem("pz_restaurante"); } catch { /* sem storage */ } },
};

// ---------- Chamadas à API ----------
async function api(metodo, url, corpo) {
  const headers = {};
  if (corpo) headers["Content-Type"] = "application/json";
  if (sessao.token) headers["Authorization"] = `Bearer ${sessao.token}`;
  const r = await fetch(url, { method: metodo, headers, body: corpo ? JSON.stringify(corpo) : undefined });
  if (r.status === 204) return null;
  const texto = await r.text();
  let json = null;
  try { json = texto ? JSON.parse(texto) : null; } catch { /* resposta não-JSON */ }
  // Sessão inválida ou expirada: volta para a tela de login
  if (r.status === 401 && url !== "/login" && url !== "/cadastro") {
    sessao.limpar();
    mostrarLogin(json?.erro);
    throw new Error(json?.erro || "Faça login para continuar.");
  }
  if (!r.ok) throw new Error(json?.erro || texto || `Erro ${r.status}`);
  return json;
}

// ---------- Login / cadastro ----------
let modoCadastro = false;
function mostrarLogin(msg) {
  document.body.classList.add("deslogado");
  document.querySelectorAll(".tela").forEach((t) => (t.hidden = t.id !== "tela-login"));
  if (msg) avisar(msg, "erro");
}
function ajustarModoLogin() {
  $("#l-restaurante").hidden = !modoCadastro;
  $("#l-restaurante input").required = modoCadastro;
  $("#l-titulo").textContent = modoCadastro ? "Criar conta" : "Acesse sua cozinha";
  $("#l-enviar").textContent = modoCadastro ? "Criar conta" : "Entrar";
  $("#l-alternar").textContent = modoCadastro ? "Já tenho conta: entrar" : "Primeira vez? Criar conta grátis";
}
$("#l-alternar").addEventListener("click", () => { modoCadastro = !modoCadastro; ajustarModoLogin(); });
$("#form-login").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.target;
  const botao = $("#l-enviar");
  botao.disabled = true;
  try {
    const s = await api("POST", modoCadastro ? "/cadastro" : "/login", {
      email: f.email.value,
      senha: f.senha.value,
      restaurante: modoCadastro ? f.restaurante.value : null,
    });
    sessao.salvar(s);
    f.reset();
    $("#aviso").hidden = true;
    if (location.hash !== "#painel") location.hash = "#painel";
    else rotear();
  } catch (err) {
    avisar(err.message, "erro");
  } finally {
    botao.disabled = false;
  }
});
$("#sair").addEventListener("click", async () => {
  try { await api("POST", "/logout"); } catch { /* sessão já inválida */ }
  sessao.limpar();
  mostrarLogin();
});

function avisar(msg, tipo = "ok") {
  const el = $("#aviso");
  el.textContent = msg;
  el.className = `aviso ${tipo}`;
  el.hidden = false;
  window.scrollTo({ top: 0, behavior: "smooth" });
  clearTimeout(avisar.t);
  avisar.t = setTimeout(() => (el.hidden = true), 5000);
}

// ---------- Cartão de lote ----------
function cartaoLote(l) {
  const n = NIVEL[l.nivel];
  const vencido = l.diasParaVencer < 0;
  return `
    <li class="lote" style="--faixa:${n.cor}">
      <div class="info">
        <div class="nome">${esc(l.produto)}<span class="selo" style="background:${n.fundo};color:${n.texto}">${l.nivel === "ok" ? textoDias(l.diasParaVencer) : n.rotulo}</span></div>
        <div class="meta">${qtd(l.quantidade, l.unidade)} · <b>${brl(l.quantidade * l.custoUnitario)}</b></div>
        <div class="meta">Validade ${dataBR(l.validade)}${l.nivel !== "ok" ? " · " + textoDias(l.diasParaVencer) : ""}${l.codigo ? " · lote " + esc(l.codigo) : ""}</div>
      </div>
      <div class="acoes">
        ${vencido ? "" : `<button class="btn btn-secundario" data-acao="uso" data-id="${l.id}">Usar</button>`}
        <button class="btn ${vencido ? "btn-perigo" : "btn-secundario"}" data-acao="descarte" data-id="${l.id}">Descartar</button>
        <button class="btn btn-secundario" data-acao="editar" data-id="${l.id}" aria-label="Editar">✎</button>
      </div>
    </li>`;
}

let lotesCache = [];

// ---------- Painel ----------
async function carregarPainel() {
  const [alertas, rel] = await Promise.all([api("GET", "/lotes/alertas"), api("GET", "/relatorio")]);
  lotesCache = alertas;
  const emRisco = alertas.filter((l) => l.diasParaVencer >= 0);
  const valor = (ls) => ls.reduce((s, l) => s + l.quantidade * l.custoUnitario, 0);
  const hoje = emRisco.filter((l) => l.nivel === "hoje");
  const vencidos = alertas.filter((l) => l.nivel === "vencido");

  $("#p-risco").textContent = brl(valor(emRisco));
  $("#p-risco-sub").textContent =
    `${emRisco.length} lote(s) · ${hoje.length ? brl(valor(hoje)) + " vence hoje" : "nada vence hoje"}` +
    (vencidos.length ? ` · + ${brl(valor(vencidos))} já vencido` : "");
  $("#p-perdido").textContent = brl(rel.perdido);
  $("#p-salvo").textContent = `Salvo antes de vencer: ${brl(rel.salvo)}`;

  const grupos = [
    ["vencido", "Vencidos — não use nem doe, registre o descarte"],
    ["hoje", "Vencem hoje — prato do dia ou promoção agora"],
    ["3dias", "Próximos 3 dias — planeje o prato do dia ou doe com folga"],
    ["7dias", "Até 7 dias — use primeiro"],
  ];
  $("#p-contadores").innerHTML = grupos
    .map(([k]) => {
      const qt = alertas.filter((l) => l.nivel === k).length;
      return `<div class="contador"><b style="color:${qt ? NIVEL[k].cor : "#d6d3d1"}">${qt}</b><span>${NIVEL[k].rotulo}</span></div>`;
    })
    .join("");

  $("#p-lista").innerHTML = alertas.length
    ? grupos
        .map(([k, titulo]) => {
          const itens = alertas.filter((l) => l.nivel === k);
          return itens.length
            ? `<p class="grupo-titulo" style="color:${NIVEL[k].cor}">${titulo}</p><ul class="lista">${itens.map(cartaoLote).join("")}</ul>`
            : "";
        })
        .join("")
    : `<p class="vazio">Tudo em dia: nada vence nos próximos 7 dias. <a href="#entrada"><b>Cadastrar entrada</b></a></p>`;
}

// ---------- Estoque ----------
let filtroEstoque = "todos";
async function carregarEstoque() {
  lotesCache = await api("GET", "/lotes");
  desenharEstoque();
  $("#produtos").innerHTML = [...new Set(lotesCache.map((l) => l.produto))].map((p) => `<option value="${esc(p)}">`).join("");
}
function desenharEstoque() {
  const busca = $("#e-busca").value.trim().toLowerCase();
  const lista = lotesCache.filter((l) => {
    if (busca && !l.produto.toLowerCase().includes(busca)) return false;
    if (filtroEstoque === "vencido") return l.diasParaVencer < 0;
    if (filtroEstoque === "3dias") return l.diasParaVencer >= 0 && l.diasParaVencer <= 3;
    if (filtroEstoque === "7dias") return l.diasParaVencer >= 0 && l.diasParaVencer <= 7;
    return true;
  });
  const total = lista.reduce((s, l) => s + l.quantidade * l.custoUnitario, 0);
  $("#e-resumo").textContent = `${lista.length} lote(s) · ${brl(total)}`;
  $("#e-lista").innerHTML = lista.length ? lista.map(cartaoLote).join("") : `<li class="vazio">Nada encontrado.</li>`;
}

// ---------- Entrada ----------
function prepararEntrada() {
  const f = $("#form-entrada");
  if (!f.recebidoEm.value) f.recebidoEm.value = hojeISO();
  $("#prazos").innerHTML = [1, 3, 5, 7, 15, 30]
    .map((d) => `<button type="button" class="chip" data-dias="${d}">+${d} dia${d > 1 ? "s" : ""}</button>`)
    .join("");
}

$("#prazos").addEventListener("click", (e) => {
  const d = e.target.dataset.dias;
  if (!d) return;
  const f = $("#form-entrada");
  f.validade.value = somarDias(f.recebidoEm.value || hojeISO(), Number(d));
  document.querySelectorAll("#prazos .chip").forEach((c) => c.classList.toggle("ativo", c === e.target));
});

$("#form-entrada").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.target;
  const botao = f.querySelector("button[type=submit]");
  botao.disabled = true;
  try {
    const lote = await api("POST", "/lote", {
      produto: f.produto.value,
      codigo: f.codigo.value.trim() || null,
      unidade: f.unidade.value,
      quantidade: lerNumero(f.quantidade.value),
      custoTotal: lerNumero(f.custoTotal.value),
      validade: f.validade.value,
      recebidoEm: f.recebidoEm.value || null,
    });
    avisar(`${lote.produto} cadastrado.`);
    f.reset();
    prepararEntrada();
    f.produto.focus();
  } catch (err) {
    avisar(err.message, "erro");
  } finally {
    botao.disabled = false;
  }
});

// ---------- Perdas (relatório) ----------
async function carregarPerdas() {
  const mes = $("#r-mes").value || hojeISO().slice(0, 7);
  $("#r-mes").value = mes;
  const r = await api("GET", `/relatorio?mes=${mes}`);
  $("#r-perdido").textContent = brl(r.perdido);
  $("#r-salvo").textContent = brl(r.salvo);
  $("#r-aprov").textContent = r.aproveitamento == null ? "—" : `${Math.round(r.aproveitamento * 100)}%`;

  const maxMotivo = Math.max(1, ...r.porMotivo.map(([, v]) => v));
  $("#r-motivos").innerHTML = r.porMotivo
    .map(([m, v]) => `<div class="linha entre"><span>${MOTIVOS[m]}</span><b>${brl(v)}</b></div><div class="barra"><span style="width:${(v / maxMotivo) * 100}%"></span></div>`)
    .join("");

  const maxRank = Math.max(1, ...r.ranking.map((i) => i.valor));
  $("#r-ranking").innerHTML = r.ranking.length
    ? r.ranking
        .map((i) => `<div class="linha entre"><span>${esc(i.produto)}</span><b>${brl(i.valor)} · ${i.vezes}x</b></div><div class="barra"><span style="width:${(i.valor / maxRank) * 100}%"></span></div>`)
        .join("")
    : `<p class="vazio">Nenhum descarte neste mês.</p>`;

  $("#r-movs").innerHTML = r.movimentacoes.length
    ? r.movimentacoes
        .map((m) => `<li><span><b>${esc(m.produto)}</b><br><small class="sub">${dataBR(m.data)} · ${qtd(m.quantidade, m.unidade)} · ${m.tipo === "descarte" ? "Descarte (" + MOTIVOS[m.motivo] + ")" : DESTINOS[m.destino]}</small></span><b class="${m.tipo === "descarte" ? "vermelho" : ""}">${m.tipo === "descarte" ? "−" : ""}${brl(m.valor)}</b></li>`)
        .join("")
    : `<li class="vazio">Nada registrado neste mês.</li>`;
}
$("#r-mes").addEventListener("change", () => carregarPerdas().catch((e) => avisar(e.message, "erro")));

// ---------- Janela: usar / descartar / editar ----------
function opcoes(nome, mapa, marcado, bloqueado = []) {
  return `<div class="opcoes">${Object.entries(mapa)
    .map(([v, r]) => `<label class="opcao"><input type="radio" name="${nome}" value="${v}" ${v === marcado ? "checked" : ""} ${bloqueado.includes(v) ? "disabled" : ""} required> <span>${r}${bloqueado.includes(v) ? "<small>a validade ainda não passou</small>" : ""}</span></label>`)
    .join("")}</div>`;
}

async function abrirJanela(acao, id) {
  const l = lotesCache.find((x) => x.id === id) || (await api("GET", `/lote/${id}`));
  const form = $("#form-janela");
  const vencido = l.diasParaVencer < 0;
  const passo = INTEIRAS.includes(l.unidade) ? "numeric" : "decimal";

  if (acao === "editar") {
    form.innerHTML = `
      <h2 class="titulo" style="font-size:20px">Editar ${esc(l.produto)}</h2>
      <label>Validade <input name="validade" type="date" class="campo" value="${l.validade}" required></label>
      <p class="sub">Para mudar quantidade, unidade ou custo, use o PUT (só funciona se o lote ainda não teve uso ou descarte).</p>
      <div class="linha">
        <button class="btn btn-secundario cresce" value="cancelar" formnovalidate>Cancelar</button>
        <button class="btn btn-perigo" value="excluir" formnovalidate>Excluir</button>
        <button class="btn btn-primario cresce" value="salvar">Salvar</button>
      </div>`;
  } else {
    const ehDescarte = acao === "descarte";
    form.innerHTML = `
      <h2 class="titulo" style="font-size:20px">${ehDescarte ? "Descartar" : "Usar"} ${esc(l.produto)}</h2>
      <p class="sub">Saldo ${qtd(l.quantidade, l.unidade)} · ${brl(l.custoUnitario)}/${l.unidade} · validade ${dataBR(l.validade)}</p>
      <label>Quantidade (${l.unidade}) <input name="quantidade" class="campo" inputmode="${passo}" value="${l.quantidade.toLocaleString("pt-BR", { maximumFractionDigits: 3, useGrouping: false })}" required></label>
      ${ehDescarte
        ? `<span class="rotulo-form">Motivo</span>${opcoes("motivo", MOTIVOS, vencido ? "vencido" : "estragado", vencido ? [] : ["vencido"])}`
        : `<span class="rotulo-form">Para onde vai?</span>${opcoes("destino", DESTINOS, l.diasParaVencer <= 3 ? "prato_do_dia" : "uso_normal")}`}
      <div class="linha">
        <button class="btn btn-secundario cresce" value="cancelar" formnovalidate>Cancelar</button>
        <button class="btn ${ehDescarte ? "btn-perigo" : "btn-primario"} cresce" value="salvar">${ehDescarte ? "Registrar descarte" : "Registrar uso"}</button>
      </div>`;
  }
  form.dataset.modo = acao;
  form.dataset.lote = id;
  $("#janela").showModal();
}

// Tratamos o envio no "submit" (síncrono e confiável), em vez do evento "close" do <dialog>.
$("#form-janela").addEventListener("submit", async (e) => {
  e.preventDefault();
  const dlg = $("#janela");
  const form = $("#form-janela");
  const escolha = e.submitter?.value;
  dlg.close();
  if (escolha !== "salvar" && escolha !== "excluir") return;
  const { modo: acao, lote: id } = form.dataset;
  try {
    if (escolha === "excluir") {
      if (!confirm("Excluir este lote e todo o histórico dele? Não dá para desfazer.")) return;
      await api("DELETE", `/lote/${id}`);
      avisar("Lote excluído.");
    } else if (acao === "editar") {
      await api("PATCH", `/lote/${id}/validade`, { validade: form.validade.value });
      avisar("Validade atualizada.");
    } else {
      const corpo = {
        tipo: acao,
        quantidade: lerNumero(form.quantidade.value),
        motivo: acao === "descarte" ? form.motivo.value : null,
        destino: acao === "uso" ? form.destino.value : null,
      };
      await api("POST", `/lote/${id}/movimentacao`, corpo);
      avisar(acao === "descarte" ? "Descarte registrado." : "Uso registrado.");
    }
    rotear();
  } catch (err) {
    avisar(err.message, "erro");
  }
});

document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-acao]");
  if (b) abrirJanela(b.dataset.acao, Number(b.dataset.id)).catch((err) => avisar(err.message, "erro"));
  const f = e.target.closest("#e-filtros .chip");
  if (f) {
    filtroEstoque = f.dataset.f;
    document.querySelectorAll("#e-filtros .chip").forEach((c) => c.classList.toggle("ativo", c === f));
    desenharEstoque();
  }
});
$("#e-busca").addEventListener("input", desenharEstoque);

// ---------- Navegação por abas (#painel, #estoque, #entrada, #perdas) ----------
const TELAS = { painel: carregarPainel, estoque: carregarEstoque, entrada: async () => prepararEntrada(), perdas: carregarPerdas };

function rotear() {
  if (!sessao.token) return mostrarLogin();
  document.body.classList.remove("deslogado");
  $("#nome-restaurante").textContent = sessao.restaurante;
  const aba = location.hash.slice(1) || "painel";
  const nome = TELAS[aba] ? aba : "painel";
  document.querySelectorAll(".tela").forEach((t) => (t.hidden = t.id !== `tela-${nome}`));
  document.querySelectorAll("[data-aba]").forEach((a) => a.classList.toggle("ativa", a.dataset.aba === nome));
  TELAS[nome]().catch((err) => avisar(`Não foi possível falar com a API: ${err.message}`, "erro"));
}
window.addEventListener("hashchange", rotear);
ajustarModoLogin();
rotear();
