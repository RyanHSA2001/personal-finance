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
│   ├── Brand.tsx              # Marca exibida no topo da tela
│   ├── login/                 # Peças específicas da tela de login
│   │   ├── AmbientBackground  # Fundo com luz que segue o cursor, orbes e estrelas
│   │   ├── LoginCard          # Cartão com borda iluminada e inclinação 3D
│   │   ├── LoginHeading       # Selo e título
│   │   ├── LoginForm          # Junta os campos, a validação e o envio
│   │   ├── PasswordField      # Senha com mostrar/ocultar e aviso de Caps Lock
│   │   ├── SubmitButton       # Botão com estados de envio e sucesso
│   │   ├── StatusMessage      # Mensagem de sucesso ou erro (anunciada a leitores de tela)
│   │   └── LoginFooter
│   └── ui/                    # Componentes genéricos reutilizáveis
│       ├── TextField          # Campo com ícone, erro e estado válido
│       └── Icons              # Ícones SVG
├── hooks/                     # Lógica de React reutilizável
│   ├── useLogin.ts            # Estados do envio (idle, submitting, success, error)
│   ├── usePointerLight.ts     # Luz e inclinação seguindo o cursor (só mouse)
│   └── useCapsLock.ts
├── services/
│   └── authService.ts         # Chamada à API e armazenamento do token (sem React)
├── lib/
│   └── validation.ts          # Regras do formulário (funções puras)
├── pages/
│   ├── LoginPage.tsx          # Monta a tela e liga o formulário ao hook de login
│   └── LoginPage.css
├── styles/
│   └── global.css             # Estilos gerais compartilhados pelo aplicativo
├── App.tsx                    # Componente principal do React
└── main.tsx                   # Inicializa o React na página
```

Os componentes visuais ficam em `components`, a lógica em `hooks`, `services` e
`lib` (que não dependem da interface), e as telas em `pages`. Cada componente tem
seu próprio arquivo de estilos.

## Sobre o formulário

Os campos são obrigatórios e a senha pode ser mostrada ou ocultada. Ao enviar,
o formulário chama `POST /auth/login` com e-mail e senha:

- Credenciais válidas: o token JWT é guardado em `sessionStorage` (chave
  `personalcontrol.token`) até o fechamento da aba.
- Credenciais inválidas: a mensagem "E-mail ou senha incorretos." é exibida.
- API fora do ar: a mensagem "Não foi possível conectar ao servidor." é exibida.

Para testar localmente, use o usuário `demo@teste.com` com a senha `Senha@123`
(criado pela API somente em ambiente Development).
