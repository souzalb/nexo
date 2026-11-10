require('@next/env').loadEnvConfig(process.cwd());
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: { module: 'CommonJS', moduleResolution: 'node' },
});
require('../src/app/_lib/iot/worker.ts')
  .runWorker()
  .catch(() => {
    console.error(
      'Não foi possível iniciar o coletor IoT. Verifique o banco e a configuração.',
    );
    process.exitCode = 1;
  });
