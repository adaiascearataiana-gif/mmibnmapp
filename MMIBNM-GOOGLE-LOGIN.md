# Login com Google — passo a passo (5 minutos)

O app já está **pronto** para login com Google (código + banco).
O que falta é **ativar o provedor Google no Supabase** — isso não
é SQL, é configuração de painel, e precisa de um **Client ID** que
só você pode criar no Google Cloud (é gratuito).

---

## 1. Criar o Client ID no Google Cloud Console

1. Abra <https://console.cloud.google.com/> (com a conta Google do ministério).
2. No topo, crie um projeto novo (ex.: `MM IBNM`) — ou use um existente.
3. Menu lateral → **APIs e serviços** → **Credenciais**.
4. **+ CRIAR CREDENCIAIS** → **ID do cliente OAuth**.
   - Tipo de aplicativo: **Aplicativo da Web**.
   - Nome: `MM IBNM App`.
   - **Origens JavaScript autorizadas** → **+ ADICIONAR URI**:
     ```
     https://adaiascearataiana-gif.github.io
     ```
   - **URIs de redirecionamento autorizados** → **+ ADICIONAR URI**:
     ```
     https://whtbzermbyuxicswyvsy.supabase.co/auth/v1/callback
     ```
   - Salve e **copie o Client ID e o Client Secret** (guarde-os).
5. Se aparecer aviso sobre tela de consentimento: em
   **APIs e serviços → Tela de consentimento OAuth**, escolha
   **Externo** e, enquanto o app estiver em modo "Teste", adicione
   os e-mails do ministério como **testadores** (ou publique em produção).

> Testando em `localhost`? Adicione também:
> origem `http://localhost:8013` e nada mais no redirect (o redirect
> continua sendo o do Supabase acima).

## 2. Ativar o provedor no Supabase

1. Abra <https://supabase.com/dashboard/project/whtbzermbyuxicswyvsy>
   (projeto **mmibnm**).
2. **Authentication** → **Sign In / Providers** → **Google**.
3. Ative **Enable Sign in with Google**.
4. Cole o **Client ID** e o **Client Secret** do passo 1.
5. **Save**.

## 3. Conferir as URLs (já estão corretas)

**Authentication** → **URL Configuration**:
- Site URL: `https://adaiascearataiana-gif.github.io/mmibnmapp/` ✓
- Redirect URLs: `https://adaiascearataiana-gif.github.io/mmibnmapp/**` ✓

Não precisa mexer — só confira se não foram alteradas.

## 4. Testar

1. Abra o app publicado: <https://adaiascearataiana-gif.github.io/mmibnmapp/>
2. Toque em **Entrar com Google** → escolha a conta.
3. Volta ao app logado, com o nome e a foto do Google preenchidos
   no perfil (o primeiro usuário da conta vira **ADM**).

---

## O que já foi corrigido/feito automaticamente (não precisa fazer)

- ✅ Política de INSERT em `perfis` (usuários novos ficavam presos no login).
- ✅ Coluna `perfis.origem` (conta Google × e-mail/senha).
- ✅ Tabelas `musicas_cantadas` e `cantor_links` criadas com RLS
  ("Somente o ADM pode editar" vale até no banco).
- ✅ Tabelas novas no Realtime.
- ✅ Nome e foto da conta Google passam a ser usados no perfil.
- ✅ Mensagem clara quando o provedor Google ainda não está ativado.
- Backup completo do SQL: `MMIBNM-SQL-completo.sql`.

## Problemas comuns

| Erro | Causa | Solução |
|------|-------|---------|
| "Login Google ainda nao esta ativado no servidor" | Provedor desligado no Supabase | Faça o passo 2 |
| "redirect_uri_mismatch" no Google | URI errada no Client ID | Confira o passo 1 (redirect do Supabase) |
| "Access blocked: app not verified" | App em modo Teste | Adicione o e-mail como testador (passo 1.5) ou publique o app |
| Volta ao app e nada acontece | Redirect URL fora da lista | Confira o passo 3 |
