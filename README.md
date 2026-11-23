# Meu Financeiro

Aplicativo pessoal de controle financeiro. Por enquanto, o projeto contém a
tela inicial de login; a autenticação ainda não está conectada a um servidor.

## Executar o projeto

Instale as dependências e inicie o servidor local:

```bash
npm install
npm run dev
```

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

Os campos são obrigatórios, o usuário tem limite de tamanho e a senha pode ser
mostrada ou ocultada. O formulário ainda não verifica credenciais nem cria uma
sessão: para isso, será necessário implementar um backend de autenticação.
