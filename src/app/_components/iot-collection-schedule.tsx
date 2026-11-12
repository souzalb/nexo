'use client';

import { useEffect, useState } from 'react';
import { Clock3 } from 'lucide-react';
import { isIotCollectionWindow } from '../_lib/iot/schedule';

export function IotCollectionSchedule() {
  const [active, setActive] = useState<boolean | null>(null);
  useEffect(() => {
    const update = () => setActive(isIotCollectionWindow());
    update();
    const timer = setInterval(update, 10000);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="bg-muted/30 flex flex-wrap items-center justify-between gap-4 rounded-xl border px-5 py-4">
      <div className="flex items-center gap-3">
        <Clock3 className="text-muted-foreground size-5 shrink-0" />
        <div>
          <p className="text-sm font-medium">
            {active === null
              ? 'Programação da coleta'
              : active
                ? 'Dentro do horário de coleta'
                : 'Fora do horário de coleta'}
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            Horário previsto; o estado do serviço está em Configurações.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs">
        {[
          ['Manhã', '07h25–08h'],
          ['Tarde', '12h55–13h30'],
          ['Noite', '18h25–19h'],
        ].map(([period, hours]) => (
          <div key={period}>
            <span className="text-muted-foreground block">{period}</span>
            <span className="mt-1 block font-medium tabular-nums">{hours}</span>
          </div>
        ))}
        <span className="text-muted-foreground self-end">São Paulo</span>
      </div>
    </div>
  );
}
