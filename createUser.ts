import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as readline from 'readline';

// Inicializa o cliente Prisma
const prisma = new PrismaClient();

// Cria uma interface para fazer perguntas no terminal
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Função auxiliar para fazer uma pergunta e obter uma resposta
const question = (query: string): Promise<string> => {
  return new Promise((resolve) => rl.question(query, resolve));
};

async function main() {
  console.log('--- Ferramenta de Criação de Utilizador ---');

  // 1. Pede os dados do novo utilizador de forma interativa
  const name = await question('Nome do utilizador: ');
  const email = await question('Email do utilizador: ');
  const password = await question('Palavra-passe do utilizador: ');
  const roleInput = await question(
    `Permissão (${Object.values(Role).join('/')}): `,
  );

  // Valida a permissão
  const role = roleInput.toUpperCase() as Role;
  if (!Object.values(Role).includes(role)) {
    console.error(
      `Erro: A permissão "${role}" é inválida. Use uma das opções: ${Object.values(Role).join(', ')}.`,
    );
    return;
  }

  if (!name || !email || !password) {
    console.error('Erro: Nome, email e palavra-passe são obrigatórios.');
    return;
  }

  // 2. Criptografa (hash) a palavra-passe
  const hashedPassword = await bcrypt.hash(password, 10);
  console.log('A criptografar a palavra-passe...');

  // 3. Cria o utilizador na base de dados
  try {
    console.log('A criar o utilizador na base de dados...');
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
      },
    });
    console.log('✅ Utilizador criado com sucesso!');
    console.log(user);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    // Trata erros comuns, como um email duplicado
    if (error.code === 'P2002') {
      console.error(`❌ Erro: Já existe um utilizador com o email "${email}".`);
    } else {
      console.error('❌ Erro inesperado ao criar o utilizador:', error);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    // 4. Garante que a ligação à base de dados é fechada
    await prisma.$disconnect();
    rl.close();
  });
