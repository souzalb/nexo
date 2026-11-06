import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '../_lib/auth';
import { SidebarInset, SidebarProvider } from '../_components/ui/sidebar';
import { AppSidebar } from '../_components/app-sidebar';
import { SiteHeader } from '../_components/site-header';
import { MqttMonitorPanel } from '../_components/mqtt-monitor-panel';

export default async function MqttPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  if (session.user.role !== 'ADMIN') redirect('/calendar');

  return (
    <SidebarProvider
      style={
        {
          '--sidebar-width': 'calc(var(--spacing) * 72)',
          '--header-height': 'calc(var(--spacing) * 12)',
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <main className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
          <div>
            <h1 className="text-2xl font-bold">Monitoramento ESP32</h1>
            <p className="text-muted-foreground text-sm">
              Comunicação MQTT e leituras do sensor de movimento PIR.
            </p>
          </div>
          <MqttMonitorPanel />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
