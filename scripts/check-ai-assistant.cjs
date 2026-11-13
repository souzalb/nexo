// Provider connectivity only: no database, no user data and no booking actions.
require('@next/env').loadEnvConfig(process.cwd());
const { GoogleGenAI } = require('@google/genai');
async function main() {
  if (!process.env.GEMINI_API_KEY) {
    console.log('GEMINI_API_KEY não configurada.');
    process.exitCode = 1;
    return;
  }
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: { timeout: 25000 },
  });
  try {
    if (process.argv.includes('--list')) {
      const models = await ai.models.list({ config: { pageSize: 100 } });
      for await (const model of models)
        if (model.supportedActions?.includes('generateContent'))
          console.log(model.name);
      return;
    }
    if (process.argv.includes('--tools')) {
      const model = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
      const tools = [
        {
          functionDeclarations: [
            {
              name: 'consultar_teste',
              description: 'Retorna o estado de um teste sintético.',
            },
          ],
        },
      ];
      const contents = [
        {
          role: 'user',
          parts: [
            {
              text: 'Use consultar_teste para consultar o resultado do teste.',
            },
          ],
        },
      ];
      const first = await ai.models.generateContent({
        model,
        contents,
        config: { tools },
      });
      const candidate = first.candidates?.[0]?.content;
      const calls = candidate?.parts?.filter((part) => part.functionCall) || [];
      if (
        !calls.length ||
        calls.some((part) => part.functionCall.name !== 'consultar_teste')
      )
        throw new Error('Não houve a chamada de ferramenta esperada.');
      contents.push(candidate);
      contents.push({
        role: 'user',
        parts: calls.map((part) => ({
          functionResponse: {
            name: part.functionCall.name,
            response: { result: 'OK' },
          },
        })),
      });
      const second = await ai.models.generateContent({
        model,
        contents,
        config: { tools },
      });
      if (!second.text?.trim())
        throw new Error('Sem resposta após resultado da ferramenta.');
      console.log(
        'Chamada de ferramenta e resposta final confirmadas, sem acesso ao banco.',
      );
      return;
    }
    const result = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite',
      contents: 'Responda somente OK.',
      config: { maxOutputTokens: 128 },
    });
    console.log(
      result.text?.trim()
        ? 'Provedor respondeu ao teste de conexão.'
        : 'Provedor respondeu sem texto.',
    );
    if (!result.text?.trim()) process.exitCode = 1;
  } catch (error) {
    console.log(
      'Falha no teste do provedor. Código:',
      error.status || error.code || 'rede/timeout',
    );
    console.log('Tipo:', error.name || 'desconhecido');
    const detail = String(error.message || '')
      .split(process.env.GEMINI_API_KEY)
      .join('[credencial]')
      .replace(/AIza[\w-]+/g, '[credencial]')
      .replace(/https?:\/\/\S+/g, '[endpoint]');
    console.log('Diagnóstico:', detail.slice(0, 600));
    process.exitCode = 1;
  }
}
void main();
