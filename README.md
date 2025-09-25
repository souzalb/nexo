<div align="center">
<br />
<h1><b>Sistema de Agendamento de Salas</b></h1>
<p>Uma plataforma full-stack completa para a gestão de reservas em instituições de ensino.</p>
<br />

<p>
<a href="https://www.google.com/search?q=https://seu-site.vercel.app">
<img src="https://www.google.com/search?q=https://img.shields.io/website%3Fdown_message%3Doffline%26label%3Ddeploy%26up_message%3Donline%26url%3Dhttps%253A%252F%252Fseusite.vercel.app" alt="Status do Deploy" />
</a>
<img src="https://www.google.com/search?q=https://img.shields.io/badge/Next.js-15%2B-black%3Flogo%3Dnextdotjs" alt="Next.js" />
<img src="https://www.google.com/search?q=https://img.shields.io/badge/TypeScript-5%2B-blue%3Flogo%3Dtypescript" alt="TypeScript" />
<img src="https://www.google.com/search?q=https://img.shields.io/badge/Prisma-5%2B-blueviolet%3Flogo%3Dprisma" alt="Prisma" />
<img src="https://www.google.com/search?q=https://img.shields.io/badge/licen%25C3%25A7a-MIT-blue" alt="Licença MIT" />
</p>
</div>

<br />

Este é um projeto Next.js construído com o create-next-app, desenhado para ser uma solução completa, segura e eficiente para o agendamento de salas.

🚀 Tecnologias Utilizadas
A aplicação foi construída com um stack de tecnologias moderno, focado em performance e na experiência do desenvolvedor.

Categoria

Tecnologia

Framework Principal

Next.js (com App Router)

Linguagem

TypeScript

Base de Dados & ORM

PostgreSQL & Prisma

Autenticação

NextAuth.js

Estilização

Tailwind CSS & shadcn/ui

Formulários & Validação

React Hook Form & Zod

Gráficos e Relatórios

Recharts & jsPDF

Serviços Externos

Cloudinary, Resend

✨ Funcionalidades Principais

<details>
<summary><b>Para Administradores (ADMIN)</b></summary>

O painel de administração é o centro de controlo do sistema, oferecendo uma visão completa e ferramentas de gestão poderosas.

Dashboard de Análises: Uma página inicial com widgets e gráficos que exibem métricas-chave, como a taxa de ocupação, as salas mais populares e as tendências de reserva ao longo do tempo.

Gestão Completa de Salas: CRUD (Criar, Ler, Atualizar, Apagar) de salas, com a capacidade de associar recursos (ex: Projetor) e fotos (com upload de imagens via Cloudinary).

Gestão de Utilizadores: CRUD de utilizadores, com a capacidade de definir permissões (ADMIN ou TEACHER) e de resetar a palavra-passe de um utilizador.

Gestão de Recursos: Um painel dedicado para criar e gerir os recursos que podem ser associados às salas.

Sistema de Solicitação de Reservas: Uma interface centralizada para visualizar e aprovar ou recusar os pedidos de reserva feitos pelos professores, com a opção de fornecer uma justificação.

Bloqueio de Salas: Ferramenta para bloquear períodos de tempo em salas específicas para manutenção ou eventos.

Relatórios e Exportação: Uma página para gerar relatórios de reservas com base em múltiplos filtros (data, utilizador, sala) e exportar os resultados para CSV e PDF (com logo e cabeçalho personalizados).

Logs de Auditoria: Um registo detalhado de todas as ações importantes realizadas no sistema, com filtros para fácil consulta.

Notificações: Recebe notificações na aplicação e por email sempre que uma nova solicitação é criada.

<details>
<summary><b>Para Professores (TEACHER)</b></summary>

A interface para o professor é focada na simplicidade e na eficiência do seu fluxo de trabalho diário.

Visualização de Salas: Uma página pública para explorar todas as salas disponíveis, com um sistema de filtros avançado para encontrar o espaço ideal por nome, capacidade, localização ou disponibilidade num determinado período.

Solicitação de Reservas: Um fluxo de trabalho intuitivo para solicitar o agendamento de uma sala para uma turma, escolhendo os horários, os dias da semana e um intervalo de datas.

Página "As Minhas Reservas": Uma área pessoal onde o utilizador pode ver uma lista clara de todas as suas reservas futuras e passadas, com a opção de cancelar os agendamentos futuros.

Edição de Perfil: Capacidade de atualizar as suas próprias informações, como nome e palavra-passe.

Notificações (In-App e por Email): Recebe notificações na aplicação e por email quando as suas solicitações são aprovadas ou recusadas (com a justificação do administrador).

🔧 Como Começar (Getting Started)
Primeiro, clone o repositório e instale as dependências:

git clone [https://github.com/seu-usuario/seu-repositorio.git](https://github.com/seu-usuario/seu-repositorio.git)
cd seu-repositorio
npm install

Em seguida, configure a sua base de dados local com o Docker (certifique-se de que o tem instalado):

docker-compose up -d

Depois, configure as suas variáveis de ambiente. Copie o ficheiro .env.example para .env.local e preencha todas as chaves de API e URLs necessários.

cp .env.example .env.local

Finalmente, aplique as migrações da base de dados e inicie o servidor de desenvolvimento:

npx prisma migrate dev
npm run dev
