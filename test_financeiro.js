/* Teste isolado da lógica do financeiro.js (PIX / QR / permissões), sem navegador real.
   Roda com: node test_financeiro.js
*/
const assert = require('assert');

// ---------- stubs mínimos do ambiente do app ----------
const inputs = {}; // simula os <input> do formulário de configuração
function makeInput(id, value){ inputs[id] = { value: value||'' }; }

global.window = global;
global.document = {
  querySelector(sel){
    const m = sel.match(/#([\w-]+)/);
    if(m && inputs[m[1]] !== undefined) return inputs[m[1]];
    return null;
  },
  createElement(){ return { style:{}, classList:{add(){}}, addEventListener(){} , appendChild(){} }; },
  head: { appendChild(){} },
  addEventListener(){}
};
global.localStorage = { getItem(){return null;}, setItem(){} };
global.navigator = {};

let CFG_SALVO = null; // última chamada salvarConfig
global.salvarConfig = async function(chave, valor){ CFG_SALVO = { chave, valor }; global.APP_CFG = global.APP_CFG||{}; global.APP_CFG[chave]=valor; };
global.APP_CFG = { financeiro_cfg: {} };

let USUARIO_ATUAL = { id:'u-wendell', nome:'WENDELL PEREIRA CARNEIRO', admin:true };
global.usuarioAtual = function(){ return USUARIO_ATUAL; };
global.ehAdmin = function(){ return true; };
global.podeSetor = function(){ return true; };
global.toast = function(msg){ global.__ultimoToast = msg; };
global.ROTAS = {};
global.go = function(){};

// stub do Supabase (upload de arquivo para o QR)
let SUPABASE_UPLOADS = [];
global.sb = {
  from(tabela){
    return {
      select(){ return Promise.resolve({data:[]}); },
      order(){ return this; },
    };
  },
  storage: {
    from(bucket){
      return {
        upload: async (path, body, opts) => { SUPABASE_UPLOADS.push({bucket,path,opts}); return {error:null}; },
        getPublicUrl: (path) => ({ data: { publicUrl: 'https://fake.supabase.co/storage/v1/object/public/'+bucket+'/'+path } })
      };
    }
  },
  channel(){ return { on(){ return this; }, subscribe(){} }; }
};
global.reduzImagem = async (blob) => blob; // não reduz de verdade no teste

require('./financeiro.js');

(async () => {
  console.log('--- Teste 1: o campo PIX NÃO pode ser reduzido ao salvar ---');
  const copiaECola = '00020126580014br.gov.bcb.pix0136b5540cdc-c519-456a-9858-a7fafe3b86475204000053039865802BR5913WENDELL PC6009SAO PAULO62070503***63041D3D';
  makeInput('cfgPix', copiaECola);
  makeInput('cfgWpp', '85999794049');
  makeInput('cfgNome', ''); // vazio -> deve puxar o nome do ADM logado
  makeInput('cfgCidade', 'Caucaia');
  await window.finCfgSalvar();
  assert.strictEqual(CFG_SALVO.valor.pix, copiaECola, 'O campo pix deve ficar EXATAMENTE igual ao colado, sem reduzir');
  assert.strictEqual(CFG_SALVO.valor.pix_copia, copiaECola, 'pix_copia deve guardar o mesmo código, sem alterar estrutura');
  console.log('OK: pix salvo sem redução:', CFG_SALVO.valor.pix === copiaECola);

  console.log('\n--- Teste 2: nome do recebedor preenchido automaticamente com o nome do ADM ---');
  assert.strictEqual(CFG_SALVO.valor.nome, 'WENDELL PEREIRA CARNEIRO', 'Nome deve ser preenchido automaticamente com o nome do ADM logado');
  console.log('OK: nome automático =', CFG_SALVO.valor.nome);

  console.log('\n--- Teste 3: finAutoNome atualiza o campo nome ao digitar a chave PIX ---');
  makeInput('cfgNome', '');
  USUARIO_ATUAL = { id:'u-adaias', nome:'ADAIAS CEARA TAIANA', admin:true };
  window.finAutoNome();
  assert.strictEqual(inputs.cfgNome.value, 'ADAIAS CEARA TAIANA');
  console.log('OK: campo nome virou', inputs.cfgNome.value);

  console.log('\n--- Teste 4: reabrir a configuração mantém o código intacto (sem reduzir em uma 2ª rodada) ---');
  const cfgAtual = global.APP_CFG.financeiro_cfg;
  makeInput('cfgPix', cfgAtual.pix); // simula reabrir o formulário com o valor salvo
  makeInput('cfgNome', cfgAtual.nome);
  makeInput('cfgWpp', cfgAtual.wpp);
  makeInput('cfgCidade', cfgAtual.cidade);
  await window.finCfgSalvar();
  assert.strictEqual(CFG_SALVO.valor.pix, copiaECola, 'Depois de salvar de novo, o código continua idêntico');
  console.log('OK: código permanece idêntico após salvar novamente');

  console.log('\n--- Teste 5: upload da foto do QR usa bucket público (não cai no espaço privado de comprovantes) ---');
  makeInput('cfgQrImg', '');
  // simula arquivo escolhido
  inputs.cfgQrImg.files = [{ name:'qr.jpg', type:'image/jpeg' }];
  await window.finCfgQrEnviar();
  const upload = SUPABASE_UPLOADS.find(u=>u.bucket==='anexos');
  assert.ok(upload, 'Deveria ter feito upload no bucket anexos');
  assert.ok(upload.path.startsWith('pix_qr/'), 'O caminho deve começar com pix_qr/ (não financeiro/) para não cair no espaço privado');
  assert.strictEqual(global.APP_CFG.financeiro_cfg.qr_img.indexOf('pix_qr/')>=0, true);
  console.log('OK: QR enviado para', upload.path);

  console.log('\n--- Teste 6: tela de doação usa o código EXATO (sem valor embutido) e a imagem do QR enviada ---');
  // simula abrir o modal de doação com cfgPix já configurado
  global.abrirModal = function(){};
  global.$ = sel => document.querySelector(sel);
  const boxHTML = { innerHTML: '' };
  document.querySelector = (sel) => {
    if (sel === '#finPixBox') return boxHTML;
    const m = sel.match(/#([\w-]+)/);
    if (m && inputs[m[1]] !== undefined) return inputs[m[1]];
    return null;
  };
  let copiado = '';
  const origExecCommand = null;
  global.navigator.clipboard = { writeText: (t) => { copiado = t; return Promise.resolve(); } };
  window.finPixAuto('50');
  assert.strictEqual(copiado, copiaECola, 'O código copiado deve ser EXATAMENTE o copia-e-cola salvo, sem valor embutido');
  assert.ok(boxHTML.innerHTML.indexOf(global.APP_CFG.financeiro_cfg.qr_img) >= 0, 'Deve exibir a imagem do QR enviada pelo ADM');
  assert.ok(boxHTML.innerHTML.indexOf('R$')>=0, 'Deve mostrar o valor digitado para o doador conferir no banco');
  console.log('OK: código copiado sem alterações e imagem do QR exibida');

  console.log('\n--- Teste 7: ADM secundário com setor liberado enxerga o card de configuração (bug do Wendell) ---');
  // simula a tela inteira: antes usava ehAdmin(); agora usa podeSetor('financeiro').
  // Importante: financeiro.js define sua PRÓPRIA window.podeSetor ao carregar
  // (igual acontece no app real); no app real, papeis.js carrega DEPOIS e
  // sobrescreve window.podeSetor com a lógica de permissões. Aqui simulamos
  // esse "depois" sobrescrevendo só agora, após o require já ter rodado.
  global.ehAdmin = function(){ return false; }; // Wendell: não é ADM completo
  global.podeSetor = function(p){ return p==='financeiro'; }; // mas tem o setor financeiro liberado (como papeis.js faria)
  const html = window.ROTAS.financeiro();
  assert.ok(html.indexOf('Configuração da doação') >= 0, 'Card de configuração deve aparecer para quem tem o setor financeiro liberado, mesmo sem ser ADM completo');
  console.log('OK: card de configuração aparece para o ADM de setor (Wendell)');

  console.log('\n✅ TODOS OS TESTES PASSARAM');
  process.exit(0);
})().catch(err => { console.error('❌ FALHA:', err); process.exit(1); });
