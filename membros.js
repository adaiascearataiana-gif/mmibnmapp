/* ============================================================
   MM IBNM — Membros (v0.5.0)
   1) MODO ADM / MODO USUÁRIO no menu (só para quem é ADM):
      o ADM vê o app exatamente como um membro vê.
   2) Cadastro com todos os campos obrigatórios; quem estiver
      com o cadastro incompleto (ex.: entrou pelo Google) precisa
      completar antes de usar o app.
   3) Tabela de membros para o ADM: busca, filtros, editar,
      tornar ADM, WhatsApp, exportar para Excel.
============================================================ */
(function(){
'use strict';
const e = s => String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sem = s => String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const $id = id => document.getElementById(id);

/* ================= 1) MODO ADM / MODO USUÁRIO ================= */
const _ehAdminReal = (typeof ehAdmin==='function') ? ehAdmin : ()=>false;
function chaveModo(){ const u=(typeof usuarioAtual==='function')&&usuarioAtual(); return 'ibnm_modo_usuario_'+(u?u.email:''); }
window.ehAdminReal=function(){ try{ return !!_ehAdminReal(); }catch(_){ return false; } };
window.modoUsuario=function(){ return ehAdminReal() && localStorage.getItem(chaveModo())==='1'; };
window.ehAdmin=ehAdmin=function(){ return ehAdminReal() && !modoUsuario(); };
window.alternarModo=function(m){
  if(!ehAdminReal()) return;
  if(m==='usuario') localStorage.setItem(chaveModo(),'1'); else localStorage.removeItem(chaveModo());
  if(typeof toggleMenu==='function') toggleMenu(false);
  montaMenu(); marcaTopo();
  toast(m==='usuario'?'👤 Modo usuário: você vê o app como um membro.':'🛡️ Modo ADM ativado.');
  try{ if(window.cantorRedesenhar) window.cantorRedesenhar(); }catch(_){}
  const pag=(window.__navStack&&window.__navStack().slice(-1)[0])||'go|inicio|';
  const p=pag.split('|');
  if(p[0]==='go' && (p[1]==='admin'||p[1]==='membros') && m==='usuario') go('inicio');
  else if(typeof _viewAtual==='function'){ const y=scrollY; try{ _viewAtual(); }catch(_){} scrollTo(0,y); }
};
function marcaTopo(){
  const tb=document.querySelector('.topbar .brand-sub, .topbar small, .topbar .sub');
  let pill=$id('modoPill');
  if(modoUsuario()){
    if(!pill){ pill=document.createElement('button'); pill.id='modoPill'; pill.type='button'; pill.className='modo-pill';
      pill.onclick=()=>alternarModo('adm'); pill.setAttribute('aria-label','Voltar ao modo ADM');
      const alvo=document.querySelector('.topbar'); if(alvo) alvo.appendChild(pill); }
    pill.textContent='👤 Modo usuário · tocar p/ ADM';
  } else if(pill) pill.remove();
}
if(typeof montaMenu==='function'){
  const _mm=montaMenu;
  window.montaMenu=montaMenu=function(){
    _mm.apply(this,arguments);
    const sm=$id('sidemenu'); if(!sm) return;
    if(modoUsuario()){
      sm.querySelectorAll('.sm-item').forEach(b=>{ const oc=b.getAttribute('onclick')||''; if(/go\('(admin|membros)'\)/.test(oc)) b.remove(); });
      const rl=sm.querySelector('.sm-head .rl'); if(rl) rl.textContent='Membro • IBNM (modo usuário)';
    }
    if(ehAdminReal()){
      const nav=sm.querySelector('.sm-nav');
      if(nav && !$id('smModo')){
        const u=modoUsuario();
        nav.insertAdjacentHTML('afterbegin','<div id="smModo" class="sm-modo"><div class="lb">Você está no</div><div class="sw">'+
          '<button type="button" class="'+(!u?'on':'')+'" onclick="alternarModo(\'adm\')">🛡️ Modo ADM</button>'+
          '<button type="button" class="'+(u?'on':'')+'" onclick="alternarModo(\'usuario\')">👤 Modo usuário</button></div></div>');
      }
      if(!modoUsuario() && nav && !sm.querySelector('[data-membros]')){
        const adm=[...sm.querySelectorAll('.sm-item')].find(b=>/go\('admin'\)/.test(b.getAttribute('onclick')||''));
        const html='<button class="sm-item" data-membros onclick="go(\'membros\')"><span class="ic">👥</span>Membros (tabela)</button>';
        if(adm) adm.insertAdjacentHTML('beforebegin',html); else nav.insertAdjacentHTML('beforeend',html);
      }
    }
    marcaTopo();
  };
}
/* o selo "ADM" do perfil e o "Administrador" do menu seguem o modo */
if(typeof ROTAS!=='undefined' && ROTAS.perfil){
  const _pf=ROTAS.perfil;
  ROTAS.perfil=function(){ let h=_pf.apply(this,arguments); if(modoUsuario()) h=h.replace('<span class="admin-tag">ADM</span>','<span class="admin-tag" style="background:#dfe6e2;color:#456">MODO USUÁRIO</span>'); return h; };
}

/* ================= 2) CADASTRO OBRIGATÓRIO ================= */
const nomeCompleto = n => String(n||'').trim().split(/\s+/).filter(p=>p.length>=2).length>=2;
const telOk = t => String(t||'').replace(/\D/g,'').length>=10;
const idade = n => { if(!n) return null; const d=new Date(n+'T12:00:00'); if(isNaN(d)) return null; const h=new Date(); let a=h.getFullYear()-d.getFullYear(); if(h.getMonth()<d.getMonth()||(h.getMonth()===d.getMonth()&&h.getDate()<d.getDate())) a--; return a; };
const nascOk = n => { const a=idade(n); return a!=null && a>=3 && a<=110; };
window.camposFaltando=function(u){
  const f=[]; if(!u) return f;
  if(!nomeCompleto(u.nome)) f.push('Nome completo');
  if(!nascOk(u.nasc)) f.push('Data de nascimento');
  if(!telOk(u.tel)) f.push('Telefone');
  if(!((u.vocal||[]).length+(u.instr||[]).length)) f.push('Função no Ministério');
  return f;
};
function validar(d){
  if(!nomeCompleto(d.nome)) return 'Informe nome e sobrenome.';
  if(!d.nasc) return 'Informe a data de nascimento.';
  if(!nascOk(d.nasc)) return 'Data de nascimento inválida.';
  if(!telOk(d.tel)) return 'Telefone incompleto (DDD + número).';
  if(d.wpp!==true && d.wpp!==false) return 'Diga se o telefone é WhatsApp.';
  if(d.wpp===false && !d.sem_wpp && !telOk(d.wpp_num)) return 'Digite o número do WhatsApp (ou marque "Não tenho WhatsApp").';
  if(!(d.vocal.length+d.instr.length)) return 'Selecione ao menos uma função no Ministério.';
  return '';
}
function radiosWpp(nome,valor,claro,num){
  const c=claro?'':' style="color:var(--verde-escuro)"'; num=num||'';
  const sem = valor===false && num==='nao'; if(num==='nao') num='';
  return '<div class="wpp-q"'+c+'>Este telefone é WhatsApp? <span class="req">*</span>'+
    '<label class="check-inline"'+c+'><input type="radio" name="'+nome+'" value="1" '+(valor===true?'checked':'')+' onchange="wppMostra(\''+nome+'\')"> Sim</label>'+
    '<label class="check-inline"'+c+'><input type="radio" name="'+nome+'" value="0" '+(valor===false?'checked':'')+' onchange="wppMostra(\''+nome+'\')"> Não</label></div>'+
    '<div class="wpp-num" id="'+nome+'Box" style="'+(valor===false?'':'display:none')+'">'+
      '<label'+c+'>Número do WhatsApp <span class="req">*</span></label>'+
      '<input id="'+nome+'Num" inputmode="numeric" placeholder="( 00 ) 00000-0000" value="'+e(num)+'" oninput="maskTel(this)" '+(sem?'disabled':'')+'>'+
      '<label class="check-inline"'+c+'><input type="checkbox" id="'+nome+'Sem" '+(sem&&valor===false?'checked':'')+' onchange="wppMostra(\''+nome+'\')"> Não tenho WhatsApp</label></div>';
}
window.wppMostra=function(nome){
  const r=document.querySelector('input[name="'+nome+'"]:checked'); const box=$id(nome+'Box'); if(!box) return;
  const nao = r && r.value==='0'; box.style.display = nao? '' : 'none';
  const sem=$id(nome+'Sem'), inp=$id(nome+'Num'); if(inp && sem){ inp.disabled=sem.checked; if(sem.checked) inp.value=''; else if(nao) setTimeout(()=>inp.focus(),30); }
};
const lerWpp = nome => { const r=document.querySelector('input[name="'+nome+'"]:checked'); return r? r.value==='1' : null; };
/* lê Sim/Não + número do WhatsApp e junta no objeto d */
function comWpp(d,nome){
  d.wpp=lerWpp(nome); const sem=$id(nome+'Sem'), inp=$id(nome+'Num');
  d.sem_wpp=!!(sem&&sem.checked); d.wpp_num = d.wpp===false ? (d.sem_wpp? 'nao' : (inp? inp.value.trim() : '')) : '';
  return d;
}
/* grava no banco; se a coluna wpp_num ainda não existir, grava o resto e avisa */
async function gravaPerfil(id,d){
  const dados=Object.assign({},d); delete dados.sem_wpp;
  let r=await sb.from('perfis').update(dados).eq('id',id);
  if(r.error && /wpp_num/i.test(r.error.message||'')){ delete dados.wpp_num; r=await sb.from('perfis').update(dados).eq('id',id); if(!r.error && d.wpp_num && d.wpp_num!=='nao') toast('Número do WhatsApp não salvo: rode a seção 13 do SQL.'); }
  return r;
}
/* ---- nomes: primeira letra de cada palavra maiúscula ---- */
const capNome = s => String(s||'').replace(/(^|[\s'’\-])(\p{L})/gu,(m,a,b)=>a+b.toLocaleUpperCase('pt-BR'));
const limpaNome = s => capNome(String(s||'').replace(/\s+/g,' ').trim());
window.capNomeInput=function(el){ const p=el.selectionStart, v=capNome(el.value); if(v!==el.value){ el.value=v; try{ el.setSelectionRange(p,p); }catch(_){} } };
function ligaCap(ids){ ids.forEach(id=>{ const el=$id(id); if(el && !el.dataset.cap){ el.dataset.cap='1'; el.setAttribute('autocapitalize','words'); el.addEventListener('input',()=>capNomeInput(el)); el.addEventListener('blur',()=>{ el.value=limpaNome(el.value); }); } }); }
window.__capNome=capNome;
function marcaObrigatorios(raiz){
  (raiz||document).querySelectorAll('.field > label:first-child').forEach(l=>{ if(!l.querySelector('.req') && !/opcional/i.test(l.textContent)) l.insertAdjacentHTML('beforeend',' <span class="req">*</span>'); });
}
/* tela de cadastro: WhatsApp vira Sim/Não obrigatório e todos os campos ganham * */
if(typeof telaCadastro==='function'){
  const _tc=telaCadastro;
  window.telaCadastro=telaCadastro=function(){
    _tc.apply(this,arguments);
    const cb=$id('cWpp'); if(cb){ const lab=cb.closest('label'); if(lab){ lab.style.display='none'; lab.insertAdjacentHTML('afterend',radiosWpp('cWppR',null,true)); } }
    marcaObrigatorios($id('authScreens')); ligaCap(['cNome']);
    const sub=document.querySelector('#authScreens .sub'); if(sub) sub.textContent='Todos os campos com * são obrigatórios';
  };
}
if(typeof fazerCadastro==='function'){
  const _fc=fazerCadastro;
  window.fazerCadastro=fazerCadastro=function(){
    const ne=$id('cNome'); if(ne) ne.value=limpaNome(ne.value);
    const nome=(ne||{}).value||'', w=lerWpp('cWppR');
    if(!nomeCompleto(nome)) return erro('cadErr','Informe nome e sobrenome.');
    const n=($id('cNasc')||{}).value; if(n && !nascOk(n)) return erro('cadErr','Data de nascimento inválida.');
    if(w===null && document.querySelector('input[name="cWppR"]')) return erro('cadErr','Diga se o telefone é WhatsApp.');
    const dw=comWpp({},'cWppR');
    if(dw.wpp===false && !dw.sem_wpp && !telOk(dw.wpp_num)) return erro('cadErr','Digite o número do WhatsApp (ou marque "Não tenho WhatsApp").');
    const cb=$id('cWpp'); if(cb) cb.checked=!!w;
    /* envia o número do WhatsApp junto com o cadastro */
    let restaura=null;
    try{ if(dw.wpp_num && sb && sb.auth && sb.auth.signUp){ const orig=sb.auth.signUp; restaura=()=>{ sb.auth.signUp=orig; };
      sb.auth.signUp=function(args){ try{ args.options=args.options||{}; args.options.data=Object.assign({},args.options.data,{wpp_num:dw.wpp_num}); }catch(_){} return orig.call(sb.auth,args); }; } }catch(_){}
    const r=_fc.apply(this,arguments);
    Promise.resolve(r).finally(()=>{ if(restaura) restaura(); });
    return r;
  };
}
/* editar o próprio perfil: mesmas regras */
if(typeof modalEditarPerfil==='function'){
  const _me=modalEditarPerfil;
  window.modalEditarPerfil=modalEditarPerfil=function(){
    _me.apply(this,arguments);
    const u=usuarioAtual(); const cb=$id('ePwpp'); if(cb){ const lab=cb.closest('label'); if(lab){ lab.style.display='none'; lab.insertAdjacentHTML('afterend',radiosWpp('ePwppR',!!u.wpp,false,u.wpp_num)); } }
    ligaCap(['ePnome']);
    marcaObrigatorios($id('modalBox')); const h=document.querySelector('#modalBox h3'); if(h) h.insertAdjacentHTML('afterend','<div id="ePerr"></div>');
  };
}
window.salvarPerfil=salvarPerfil=async function(){
  const u=usuarioAtual(); if(!u) return;
  const d=comWpp({nome:limpaNome($id('ePnome').value),nasc:$id('ePnasc').value,tel:$id('ePtel').value.trim(),
    vocal:[...document.querySelectorAll('.eVocal:checked')].map(c=>c.value),instr:[...document.querySelectorAll('.eInstr:checked')].map(c=>c.value)},'ePwppR');
  if(d.wpp===null && $id('ePwpp')) d.wpp=$id('ePwpp').checked;
  const msg=validar(d); if(msg){ const b=$id('ePerr'); if(b) b.innerHTML='<div class="err-msg">'+e(msg)+'</div>'; else toast(msg); return; }
  const {error}=await gravaPerfil(u.id,d);
  if(error) return toast('Erro ao salvar: '+error.message);
  delete d.sem_wpp; Object.assign(u,d); fecharModal(); montaMenu(); toast('Perfil atualizado!'); go('perfil');
};
/* trava: cadastro incompleto precisa ser completado antes de usar o app */
function gate(){
  const u=usuarioAtual(); if(!u) return;
  const falta=camposFaltando(u);
  const velho=$id('cadGate');
  if(!falta.length){ if(velho) velho.remove(); return; }
  if(velho) return;
  const ck=(lista,cls,marc)=>lista.map(v=>'<label class="check-inline"><input type="checkbox" class="'+cls+'" value="'+e(v)+'" '+(marc.includes(v)?'checked':'')+'> '+e(v)+'</label>').join('');
  const g=document.createElement('div'); g.id='cadGate'; g.className='cad-gate';
  g.innerHTML='<div class="cg-card"><div class="cg-ic">📝</div><h2>Complete seu cadastro</h2>'+
    '<p>Para usar o app do Ministério, preencha todos os dados abaixo. Faltando: <b>'+e(falta.join(', '))+'</b>.</p><div id="cgErr"></div>'+
    '<div class="field"><label>Nome completo <span class="req">*</span></label><input id="cgNome" value="'+e(u.nome)+'" placeholder="Nome e sobrenome"></div>'+
    '<div class="field"><label>Data de nascimento <span class="req">*</span></label><input type="date" id="cgNasc" value="'+e(u.nasc||'')+'"></div>'+
    '<div class="field"><label>Telefone <span class="req">*</span></label><input id="cgTel" inputmode="numeric" value="'+e(u.tel||'')+'" placeholder="( 00 ) 00000-0000" oninput="maskTel(this)">'+radiosWpp('cgWpp',telOk(u.tel)?!!u.wpp:null,false,u.wpp_num)+'</div>'+
    '<div class="field"><label>Função no Ministério <span class="req">*</span></label><div class="cg-box"><b>🎤 Vocalista</b>'+ck(VOCAL,'cgVocal',u.vocal||[])+'<b>🎸 Instrumentista</b>'+ck(INSTR,'cgInstr',u.instr||[])+'</div></div>'+
    '<button class="btn btn-primary" id="cgOk">Salvar e continuar</button><button class="btn btn-dark" style="margin-top:8px" onclick="logout()">Sair</button></div>';
  document.body.appendChild(g); ligaCap(['cgNome']);
  $id('cgOk').onclick=async()=>{
    const d=comWpp({nome:limpaNome($id('cgNome').value),nasc:$id('cgNasc').value,tel:$id('cgTel').value.trim(),
      vocal:[...document.querySelectorAll('.cgVocal:checked')].map(c=>c.value),instr:[...document.querySelectorAll('.cgInstr:checked')].map(c=>c.value)},'cgWpp');
    const msg=validar(d); if(msg){ $id('cgErr').innerHTML='<div class="err-msg">'+e(msg)+'</div>'; g.scrollTop=0; return; }
    $id('cgOk').disabled=true; $id('cgOk').textContent='Salvando…';
    const {error}=await gravaPerfil(u.id,d);
    if(error){ $id('cgOk').disabled=false; $id('cgOk').textContent='Salvar e continuar'; $id('cgErr').innerHTML='<div class="err-msg">Erro ao salvar: '+e(error.message)+'</div>'; return; }
    delete d.sem_wpp; Object.assign(u,d); g.remove(); montaMenu(); toast('Cadastro completo. Bem-vindo(a)!');
  };
}
window.verificarCadastro=gate;
if(typeof iniciarApp==='function'){
  const _ia=iniciarApp;
  window.iniciarApp=iniciarApp=function(){ _ia.apply(this,arguments); setTimeout(gate,80); };
}
if(typeof _booted!=='undefined' && _booted) setTimeout(()=>{ try{ montaMenu(); }catch(_){} gate(); if(typeof cloudPerfis==='function') Promise.resolve(cloudPerfis()).catch(()=>{}); },60);

/* número do WhatsApp: carregar com os perfis e trazer do cadastro (metadados) */
if(typeof cloudPerfis==='function'){
  window.cloudPerfis=cloudPerfis=async function(){
    const {data}=await sb.from('perfis').select('*');
    DB.usuarios=(data||[]).map(p=>({id:p.id,email:(p.email||'').toLowerCase(),nome:p.nome||'',nasc:p.nasc||'',tel:p.tel||'',wpp:!!p.wpp,wpp_num:p.wpp_num||'',vocal:p.vocal||[],instr:p.instr||[],foto:p.foto||'',admin:!!p.admin,origem:p.origem||'local',senhaHash:''}));
  };
}
if(typeof garantirPerfil==='function'){
  const _gp=garantirPerfil;
  window.garantirPerfil=garantirPerfil=async function(user){
    await _gp.apply(this,arguments);
    try{ const md=(user&&user.user_metadata)||{};
      if(md.wpp_num){ const {data}=await sb.from('perfis').select('wpp_num').eq('id',user.id).maybeSingle(); if(data && !data.wpp_num) await sb.from('perfis').update({wpp_num:md.wpp_num}).eq('id',user.id); }
      if(md.nome){ const n=limpaNome(md.nome); if(n!==md.nome) await sb.from('perfis').update({nome:n}).eq('id',user.id).eq('nome',md.nome); }
    }catch(_){}
  };
}

/* ================= 3) TABELA DE MEMBROS (ADM) ================= */
const F={q:'',filtro:'todos',ord:'nome',asc:true};
const fmtNasc = n => { if(!n) return ''; const p=String(n).slice(0,10).split('-'); return p.length===3? p[2]+'/'+p[1]+'/'+p[0] : n; };
const soDig = t => String(t||'').replace(/\D/g,'');
const aniversMes = u => u.nasc && (+String(u.nasc).slice(5,7))===(new Date().getMonth()+1);
function lista(){
  let us=(DB.usuarios||[]).slice();
  const q=sem(F.q).trim();
  if(q) us=us.filter(u=>sem([u.nome,u.email,u.tel,(u.vocal||[]).join(' '),(u.instr||[]).join(' ')].join(' ')).includes(q));
  if(F.filtro==='incompletos') us=us.filter(u=>camposFaltando(u).length);
  else if(F.filtro==='completos') us=us.filter(u=>!camposFaltando(u).length);
  else if(F.filtro==='adm') us=us.filter(u=>u.admin);
  else if(F.filtro==='aniver') us=us.filter(aniversMes);
  else if(F.filtro.indexOf('f:')===0){ const fn=F.filtro.slice(2); us=us.filter(u=>(u.vocal||[]).includes(fn)||(u.instr||[]).includes(fn)); }
  const val=u=>{ switch(F.ord){ case 'idade': return idade(u.nasc)??999; case 'email': return u.email; case 'status': return camposFaltando(u).length; case 'aniver': return u.nasc? String(u.nasc).slice(5) : '99'; default: return sem(u.nome); } };
  us.sort((a,b)=>{ const x=val(a), y=val(b); return (x>y?1:x<y?-1:0)*(F.asc?1:-1); });
  return us;
}
window.membrosBusca=function(v){ F.q=v; redesenha(); };
window.membrosFiltro=function(v){ F.filtro=v; redesenha(); };
window.membrosOrdem=function(c){ if(F.ord===c) F.asc=!F.asc; else { F.ord=c; F.asc=true; } redesenha(); };
function redesenha(){ const box=$id('mbTabela'); if(box){ box.innerHTML=tabela(); const n=$id('mbCont'); if(n) n.textContent=lista().length+' de '+(DB.usuarios||[]).length; } }
function th(c,t){ return '<th onclick="membrosOrdem(\''+c+'\')" class="'+(F.ord===c?'on':'')+'">'+t+(F.ord===c?(F.asc?' ▲':' ▼'):'')+'</th>'; }
function tabela(){
  const us=lista(); const eu=(usuarioAtual()||{}).email;
  if(!us.length) return '<div class="mb-vazio">Nenhum membro encontrado.</div>';
  return '<table class="mb-tab"><thead><tr>'+th('nome','Membro')+th('status','Cadastro')+th('idade','Nasc. / idade')+'<th>Telefone</th>'+th('email','E-mail')+'<th>Vocal</th><th>Instrumentos</th><th>Acesso</th><th>Ações</th></tr></thead><tbody>'+
    us.map(u=>{ const f=camposFaltando(u); const id=idade(u.nasc); const t=soDig(u.tel);
      const foto=u.foto?'<img src="'+e(u.foto)+'" alt="" loading="lazy">':'<span class="ini">'+e((u.nome||'?').trim().charAt(0).toUpperCase())+'</span>';
      return '<tr class="'+(f.length?'inc':'')+'">'+
        '<td class="nm"><div class="mb-pes">'+foto+'<div><b>'+e(u.nome||'(sem nome)')+'</b>'+(u.admin?' <span class="admin-tag">ADM</span>':'')+(aniversMes(u)?' <span title="Aniversariante do mês">🎂</span>':'')+'<small>'+(u.origem==='google'?'Google':'E-mail')+'</small></div></div></td>'+
        '<td>'+(f.length?'<span class="mb-st no" title="'+e(f.join(', '))+'">Falta: '+e(f.join(', '))+'</span>':'<span class="mb-st ok">Completo</span>')+'</td>'+
        '<td>'+(u.nasc?fmtNasc(u.nasc)+(id!=null?'<small>'+id+' anos</small>':''):'<span class="mb-x">—</span>')+'</td>'+
        '<td class="tel">'+(t?e(u.tel)+(u.wpp?' <a class="wa" href="https://wa.me/55'+t+'" target="_blank" rel="noopener" title="Abrir WhatsApp">WhatsApp</a>':' <a class="lg" href="tel:'+t+'">ligar</a>'+(soDig(u.wpp_num)?'<small>WhatsApp: '+e(u.wpp_num)+' <a class="wa" href="https://wa.me/55'+soDig(u.wpp_num)+'" target="_blank" rel="noopener">abrir</a></small>':(u.wpp_num==='nao'?'<small>não tem WhatsApp</small>':'<small>WhatsApp não informado</small>'))):'<span class="mb-x">—</span>')+'</td>'+
        '<td class="em"><a href="mailto:'+e(u.email)+'">'+e(u.email)+'</a></td>'+
        '<td>'+((u.vocal||[]).map(v=>'<span class="mb-ch">'+e(v)+'</span>').join('')||'<span class="mb-x">—</span>')+'</td>'+
        '<td>'+((u.instr||[]).map(v=>'<span class="mb-ch i">'+e(v)+'</span>').join('')||'<span class="mb-x">—</span>')+'</td>'+
        '<td>'+(u.admin?'Administrador':'Membro')+'</td>'+
        '<td class="ac"><button onclick="membroEditar(\''+e(u.id)+'\')">✏️ Editar</button>'+(u.email!==eu?'<button onclick="membroAdm(\''+e(u.id)+'\')">'+(u.admin?'Tirar ADM':'Tornar ADM')+'</button><button class="del" onclick="membroExcluir(\''+e(u.id)+'\')">🗑️ Excluir</button>':'')+'</td></tr>'; }).join('')+
    '</tbody></table>';
}
function resumo(){
  const us=DB.usuarios||[]; const inc=us.filter(u=>camposFaltando(u).length).length;
  const voc=us.filter(u=>(u.vocal||[]).length).length, ins=us.filter(u=>(u.instr||[]).length).length;
  const c=(n,t,f)=>'<button class="mb-kpi '+(F.filtro===f?'on':'')+'" onclick="membrosFiltro(\''+f+'\')"><b>'+n+'</b><span>'+t+'</span></button>';
  return '<div class="mb-kpis">'+c(us.length,'membros','todos')+c(us.length-inc,'completos','completos')+c(inc,'incompletos','incompletos')+c(us.filter(u=>u.admin).length,'ADM','adm')+c(us.filter(aniversMes).length,'aniversariantes','aniver')+'</div>'+
    '<div class="mb-sub">🎤 '+voc+' no vocal · 🎸 '+ins+' em instrumentos</div>';
}
if(typeof ROTAS!=='undefined'){
  ROTAS.membros=function(){
    if(!ehAdmin()) return '<div class="page"><div class="empty">Acesso restrito ao ADM.</div></div>';
    const fn=[...new Set([...(typeof VOCAL!=='undefined'?VOCAL:[]),...(typeof INSTR!=='undefined'?INSTR:[])])];
    return '<div class="page mb-page"><div class="page-ttl">👥 Membros</div>'+resumo()+
      '<div class="mb-bar"><input class="mb-busca" type="search" placeholder="🔍 Buscar nome, e-mail, telefone ou função" value="'+e(F.q)+'" oninput="membrosBusca(this.value)">'+
      '<select onchange="membrosFiltro(this.value)"><option value="todos">Todos</option><option value="incompletos" '+(F.filtro==='incompletos'?'selected':'')+'>Cadastro incompleto</option><option value="completos" '+(F.filtro==='completos'?'selected':'')+'>Cadastro completo</option><option value="adm" '+(F.filtro==='adm'?'selected':'')+'>Administradores</option><option value="aniver" '+(F.filtro==='aniver'?'selected':'')+'>Aniversariantes do mês</option>'+
      fn.map(f=>'<option value="f:'+e(f)+'" '+(F.filtro==='f:'+f?'selected':'')+'>'+e(f)+'</option>').join('')+'</select>'+
      '<button class="mb-xls" onclick="membrosExcel()">⬇️ Excel</button></div>'+
      '<div class="mb-info"><span id="mbCont">'+lista().length+' de '+(DB.usuarios||[]).length+'</span> · toque no título da coluna para ordenar · arraste a tabela para os lados</div>'+
      '<div class="mb-wrap" id="mbTabela">'+tabela()+'</div></div>';
  };
}
window.membroAdm=function(id){ const u=(DB.usuarios||[]).find(x=>x.id===id); if(!u) return;
  if(!confirm((u.admin?'Tirar o acesso de ADM de ':'Dar acesso de ADM para ')+u.nome+'?')) return;
  toggleAdmin(u.email).then(()=>{ go('membros'); }); };
window.membroExcluir=async function(id){
  const u=(DB.usuarios||[]).find(x=>x.id===id); if(!u) return;
  if(u.email===(usuarioAtual()||{}).email) return toast('Você não pode excluir a si mesmo.');
  if(!confirm('Excluir '+u.nome+' do app?\n\nOs dados do cadastro, favoritos, presenças e notificações dessa pessoa serão apagados.')) return;
  if(!confirm('Tem certeza? Esta ação não pode ser desfeita.')) return;
  /* 1º: função do banco que apaga também o login (a pessoa não consegue mais entrar com essa conta) */
  const rpc=await sb.rpc('excluir_membro',{p_id:u.id});
  if(rpc.error){
    const {error}=await sb.from('perfis').delete().eq('id',u.id);
    if(error) return toast('Não foi possível excluir: '+error.message+' (rode a seção 11 do SQL).');
  }
  const chk=await sb.from('perfis').select('id').eq('id',u.id).maybeSingle();
  if(chk && chk.data) return toast('O banco não permitiu excluir. Rode a seção 11 do SQL no Supabase.');
  try{ await Promise.all([sb.from('notificacoes').delete().eq('destino_email',u.email), sb.from('presencas').delete().eq('email',u.email), sb.from('favoritos').delete().eq('user_id',u.id), sb.from('cantor_favoritos').delete().eq('user_id',u.id)]); }catch(_){}
  DB.usuarios=(DB.usuarios||[]).filter(x=>x.id!==u.id);
  toast(u.nome.split(' ')[0]+' foi excluído(a).'); go('membros');
};
window.membroEditar=function(id){
  const u=(DB.usuarios||[]).find(x=>x.id===id); if(!u) return;
  const ck=(lista,cls,marc)=>lista.map(v=>'<label class="check-inline" style="color:var(--verde-escuro)"><input type="checkbox" class="'+cls+'" value="'+e(v)+'" '+(marc.includes(v)?'checked':'')+'> '+e(v)+'</label>').join('');
  abrirModal('<h3>Editar membro</h3><div id="mbErr"></div>'+
    '<div class="field"><label>E-mail (login)</label><input value="'+e(u.email)+'" disabled></div>'+
    '<div class="field"><label>Nome completo <span class="req">*</span></label><input id="mbNome" value="'+e(u.nome)+'"></div>'+
    '<div class="field"><label>Data de nascimento <span class="req">*</span></label><input type="date" id="mbNasc" value="'+e(String(u.nasc||'').slice(0,10))+'"></div>'+
    '<div class="field"><label>Telefone <span class="req">*</span></label><input id="mbTel" value="'+e(u.tel||'')+'" oninput="maskTel(this)">'+radiosWpp('mbWpp',telOk(u.tel)?!!u.wpp:null,false,u.wpp_num)+'</div>'+
    '<div class="field"><label>Função no Ministério <span class="req">*</span></label><div style="font-size:12px;font-weight:700;margin-top:4px">🎤 Vocalista</div>'+ck(VOCAL,'mbVocal',u.vocal||[])+'<div style="font-size:12px;font-weight:700;margin-top:8px">🎸 Instrumentista</div>'+ck(INSTR,'mbInstr',u.instr||[])+'</div>'+
    '<div class="modal-acts"><button class="btn btn-dark" onclick="fecharModal()">Cancelar</button><button class="btn btn-primary" onclick="membroSalvar(\''+e(u.id)+'\')">Salvar</button></div>');
  ligaCap(['mbNome']);
};
window.membroSalvar=async function(id){
  const u=(DB.usuarios||[]).find(x=>x.id===id); if(!u) return;
  const d=comWpp({nome:limpaNome($id('mbNome').value),nasc:$id('mbNasc').value,tel:$id('mbTel').value.trim(),
    vocal:[...document.querySelectorAll('.mbVocal:checked')].map(c=>c.value),instr:[...document.querySelectorAll('.mbInstr:checked')].map(c=>c.value)},'mbWpp');
  const msg=validar(d); if(msg){ $id('mbErr').innerHTML='<div class="err-msg">'+e(msg)+'</div>'; return; }
  const {error}=await gravaPerfil(u.id,d);
  if(error){ $id('mbErr').innerHTML='<div class="err-msg">Não foi possível salvar: '+e(error.message)+'<br>Rode a seção 10 do SQL (permite o ADM editar membros).</div>'; return; }
  delete d.sem_wpp; Object.assign(u,d); fecharModal(); toast('Dados de '+u.nome.split(' ')[0]+' atualizados.'); go('membros');
};
window.membrosExcel=function(){
  const us=lista();
  const linhas=us.map(u=>({'Nome':u.nome,'E-mail':u.email,'Nascimento':fmtNasc(u.nasc),'Idade':idade(u.nasc)??'','Telefone':u.tel||'','WhatsApp':u.wpp?(u.tel||'Sim'):(u.wpp_num==='nao'?'Não tem':(u.wpp_num||'Não informado')),
    'Vocal':(u.vocal||[]).join(', '),'Instrumentos':(u.instr||[]).join(', '),'Acesso':u.admin?'Administrador':'Membro','Cadastro':camposFaltando(u).length?'Incompleto: '+camposFaltando(u).join(', '):'Completo','Entrou por':u.origem==='google'?'Google':'E-mail'}));
  const nome='membros-mmibnm-'+new Date().toISOString().slice(0,10);
  if(window.XLSX && XLSX.utils && XLSX.utils.json_to_sheet){
    const ws=XLSX.utils.json_to_sheet(linhas); ws['!cols']=[{wch:28},{wch:28},{wch:12},{wch:6},{wch:18},{wch:9},{wch:22},{wch:22},{wch:13},{wch:30},{wch:10}];
    const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'Membros'); XLSX.writeFile(wb,nome+'.xlsx');
  } else {
    const cols=Object.keys(linhas[0]||{Nome:''}); const csv=[cols.join(';')].concat(linhas.map(l=>cols.map(c=>'"'+String(l[c]).replace(/"/g,'""')+'"').join(';'))).join('\n');
    const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv'})); a.download=nome+'.csv'; a.click();
  }
  toast('Planilha de membros gerada.');
};
/* Painel do ADM: a lista simples de membros vira um atalho para a tabela */
if(typeof ROTAS!=='undefined' && ROTAS.admin){
  const _ad=ROTAS.admin;
  ROTAS.admin=function(){ let h=_ad.apply(this,arguments); if(!ehAdmin()) return h;
    const i=h.indexOf('<div class="card"><h3>Membros ('); if(i<0) return h;
    const j=h.indexOf('<div class="card"><h3>Resumo</h3>',i); if(j<0) return h;
    const us=DB.usuarios||[]; const inc=us.filter(u=>camposFaltando(u).length).length;
    return h.slice(0,i)+'<div class="card"><h3>👥 Membros ('+us.length+')</h3><p style="font-size:13px;color:#556;margin-bottom:10px">'+(inc?'<b style="color:#b3261e">'+inc+' com cadastro incompleto.</b> ':'Todos os cadastros completos. ')+'Veja todos os dados, edite e exporte para Excel.</p><button class="mini-btn" onclick="go(\'membros\')">Abrir tabela de membros</button></div>'+h.slice(j);
  };
}

/* ---------------- estilos ---------------- */
const css=`
.req{color:#d64545;font-weight:800}
#authScreens .wpp-q,#authScreens .wpp-q .check-inline,#authScreens .wpp-num label{color:#fff}
.wpp-q .check-inline{display:inline-flex;align-items:center;gap:4px;margin:0}
.ver-foot{position:static;padding:14px 0 18px}
.wpp-num{margin-top:8px;display:flex;flex-direction:column;gap:6px}
.wpp-num>label:first-child{font-size:13px;font-weight:700}
.wpp-num input:disabled{opacity:.45}
.wpp-q{font-size:13px;font-weight:600;margin-top:8px;display:flex;flex-wrap:wrap;align-items:center;gap:4px 12px}
.sm-modo{margin:4px 10px 10px;padding:10px;border-radius:12px;background:rgba(255,255,255,.08)}
.sm-modo .lb{font-size:10.5px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#9fc4b4;margin:0 0 6px 2px}
.sm-modo .sw{display:flex;background:rgba(0,0,0,.25);border-radius:10px;padding:3px;gap:3px}
.sm-modo .sw button{flex:1;border:0;border-radius:8px;height:38px;background:none;color:#cfe3da;font-weight:800;font-size:13px}
.sm-modo .sw button.on{background:var(--dourado);color:#3a2f00}
.modo-pill{position:absolute;left:50%;bottom:-13px;transform:translateX(-50%);z-index:5;border:0;background:#fff;color:var(--verde-escuro);font-size:11px;font-weight:800;border-radius:20px;padding:4px 12px;box-shadow:0 3px 10px rgba(0,0,0,.2);white-space:nowrap}
.topbar{position:sticky}
.cad-gate{position:fixed;inset:0;z-index:11000;background:linear-gradient(160deg,#0b3d2e,#145c44);overflow:auto;padding:24px 14px calc(30px + env(safe-area-inset-bottom,0px))}
.cg-card{max-width:520px;margin:0 auto;background:#fff;border-radius:18px;padding:22px 18px;box-shadow:0 10px 40px rgba(0,0,0,.3);color:var(--verde-escuro)}
.cg-card .cg-ic{font-size:40px;text-align:center}
.cg-card h2{text-align:center;margin:4px 0 6px;font-size:21px}
.cg-card p{font-size:13.5px;color:#556;text-align:center;margin-bottom:14px}
.cg-card .field label,.cg-card .check-inline,.cg-card #authScreens .wpp-q,#authScreens .wpp-q .check-inline,#authScreens .wpp-num label{color:#fff}
.wpp-q .check-inline{display:inline-flex;align-items:center;gap:4px;margin:0}
.ver-foot{position:static;padding:14px 0 18px}
.wpp-num{margin-top:8px;display:flex;flex-direction:column;gap:6px}
.wpp-num>label:first-child{font-size:13px;font-weight:700}
.wpp-num input:disabled{opacity:.45}
.wpp-q{color:var(--verde-escuro)}
.cg-card input:not([type=checkbox]):not([type=radio]){background:#f4f7f5;color:var(--verde-escuro);border:1px solid #cfdad4}
.cg-box{background:#f4f7f5;border-radius:10px;padding:10px 12px;margin-top:4px}
.cg-box b{display:block;font-size:13px;margin:6px 0 2px}
.mb-kpis{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-bottom:6px}
.mb-kpi{border:1px solid #d6e2dc;background:#fff;border-radius:12px;padding:8px 2px;text-align:center;color:var(--verde-escuro)}
.mb-kpi b{display:block;font-size:20px;font-weight:900;line-height:1.1}
.mb-kpi span{display:block;font-size:10px;font-weight:700;color:#6b8378}
.mb-kpi.on{background:var(--verde-med);border-color:var(--verde-med)}
.mb-kpi.on b,.mb-kpi.on span{color:#fff}
.mb-sub{font-size:12px;color:#6b8378;text-align:center;margin-bottom:10px}
.mb-bar{display:flex;gap:6px;flex-wrap:wrap;position:sticky;top:var(--ibnm-topbar,64px);z-index:30;background:var(--cinza,#eef4f1);margin:0 -14px;padding:8px 14px}
.mb-busca{flex:1 1 100%;height:42px;border:1px solid #cfdad4;border-radius:10px;padding:0 12px;font-size:14.5px;background:#fff}
.mb-bar select{flex:1;height:40px;border:1px solid #cfdad4;border-radius:10px;padding:0 8px;font-size:13.5px;background:#fff;color:var(--verde-escuro);min-width:0}
.mb-xls{height:40px;border:0;border-radius:10px;padding:0 14px;background:var(--verde-med);color:#fff;font-weight:800}
.mb-info{font-size:11.5px;color:#7a8f86;margin:6px 0 8px}
.mb-wrap{overflow:auto;max-height:calc(100dvh - var(--ibnm-topbar,64px) - 120px);background:#fff;border-radius:14px;box-shadow:0 2px 10px rgba(0,0,0,.06);-webkit-overflow-scrolling:touch;overscroll-behavior:contain}
.mb-tab{border-collapse:separate;border-spacing:0;min-width:1060px;width:100%;font-size:14px}
.mb-tab th{position:sticky;top:0;z-index:2;background:var(--verde-escuro);color:#fff;text-align:left;font-size:12px;font-weight:800;padding:10px;white-space:nowrap;cursor:pointer}
.mb-tab th.on{background:#145c44}
.mb-tab td{padding:10px;border-bottom:1px solid #edf2ef;vertical-align:top;color:#1f3a30}
.mb-tab td small{display:block;font-size:11.5px;color:#7a8f86;margin-top:2px}
.mb-tab tr.inc td{background:#fff8f6}
.mb-tab td.nm{position:sticky;left:0;z-index:1;background:#fff;min-width:200px;box-shadow:4px 0 6px -4px rgba(0,0,0,.15)}
.mb-tab tr.inc td.nm{background:#fff8f6}
.mb-pes{display:flex;gap:10px;align-items:center}
.mb-pes img,.mb-pes .ini{width:38px;height:38px;border-radius:50%;object-fit:cover;flex:none;background:var(--verde-med);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:900}
.mb-pes b{font-size:14.5px}
.mb-st{display:inline-block;font-size:11.5px;font-weight:800;border-radius:12px;padding:3px 9px;max-width:200px}
.mb-st.ok{background:#e1f4ea;color:#1c6b47}
.mb-st.no{background:#fde4df;color:#a1301c}
.mb-ch{display:inline-block;background:#e9f5ef;color:#0b3d2e;font-size:12px;font-weight:700;border-radius:12px;padding:2px 8px;margin:0 4px 4px 0}
.mb-ch.i{background:#eef0fb;color:#2b3a7a}
.mb-x{color:#bbb}
.mb-tab .tel{white-space:nowrap}
.mb-tab a.wa{display:inline-block;margin-left:4px;background:#25d366;color:#fff;font-size:11px;font-weight:800;border-radius:10px;padding:2px 7px;text-decoration:none}
.mb-tab a.lg{font-size:12px;margin-left:4px}
.mb-tab .em a{color:#1f6f50;font-size:13px}
.mb-tab .ac{white-space:nowrap}
.mb-tab .ac button.del{color:#b3261e;border-color:#efc2ba;background:#fff5f3}
.mb-tab .ac button{border:1px solid #c9d6cf;background:#f4f7f5;border-radius:8px;height:32px;padding:0 10px;font-size:12.5px;font-weight:700;color:var(--verde-escuro);margin:0 4px 4px 0}
.mb-vazio{padding:30px;text-align:center;color:#8a9}
@media (max-width:420px){ .mb-kpi b{font-size:17px} .mb-kpi span{font-size:9px} }
`;
const st=document.createElement('style'); st.id='ibnmMembros'; st.textContent=css; document.head.appendChild(st);
})();
