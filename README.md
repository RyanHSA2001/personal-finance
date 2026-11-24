# PersonalControl

Aplicativo pessoal de controle financeiro. O projeto contém a tela de login,
conectada à API de autenticação
[PersonalControl.Api](https://github.com/RyanHSA2001/personal-finance-API).

## Executar o projeto

Antes de tudo, suba a API (veja o README do repositório da API) em
`http://localhost:5168`. Depois, instale as dependências e inicie o front:

```bash
npm install
npm run dev
```

As chamadas para `/auth` são encaminhadas à API pelo proxy do Vite
(`vite.config.ts`), então não é preciso configurar CORS.

Para verificar o TypeScript, gerar a versão de produção e executar o lint:

```bash
npm run build
npm run lint
```

## Estrutura do código

```text
src/
├── components/
│   ├── Brand.tsx          # Marca exibida no topo da tela
│   ├── Brand.css
│   ├── LoginForm.tsx      # Campos, validação básica e visibilidade da senha
│   └── LoginForm.css
├── pages/
│   ├── LoginPage.tsx      # Monta a tela de login
│   └── LoginPage.css
├── styles/
│   └── global.css         # Estilos gerais compartilhados pelo aplicativo
├── App.tsx                # Componente principal do React
└── main.tsx               # Inicializa o React na página
```

Os componentes ficam em `components`, as telas em `pages` e os estilos globais
em `styles`. Cada componente visual tem seu próprio arquivo de estilos.

## Sobre o formulário

Os campos são obrigatórios e a senha pode ser mostrada ou ocultada. Ao enviar,
o formulário chama `POST /auth/login` com e-mail e senha:

- Credenciais válidas: o token JWT é guardado em `sessionStorage` (chave
  `personalcontrol.token`) até o fechamento da aba.
- Credenciais inválidas: a mensagem "E-mail ou senha incorretos." é exibida.
- API fora do ar: a mensagem "Não foi possível conectar ao servidor." é exibida.

Para testar localmente, use o usuário `demo@teste.com` com a senha `Senha@123`
(criado pela API somente em ambiente Development).
