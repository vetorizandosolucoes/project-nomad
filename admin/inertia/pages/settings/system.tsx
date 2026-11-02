import { Head } from '@inertiajs/react'
import SettingsLayout from '~/layouts/SettingsLayout'
import { SystemInformationResponse } from '../../../types/system'
import { formatBytes } from '~/lib/util'
import { getAllDiskDisplayItems } from '~/hooks/useDiskDisplayData'
import CircularGauge from '~/components/systeminfo/CircularGauge'
import HorizontalBarChart from '~/components/HorizontalBarChart'
import InfoCard from '~/components/systeminfo/InfoCard'
import Alert from '~/components/Alert'
import GpuPassthroughAlert from '~/components/GpuPassthroughAlert'
import { useSystemInfo } from '~/hooks/useSystemInfo'
import StatusCard from '~/components/systeminfo/StatusCard'
import { IconCpu, IconDatabase, IconServer, IconDeviceDesktop, IconComponents } from '@tabler/icons-react'

export default function SettingsPage(props: {
  system: { info: SystemInformationResponse | undefined }
}) {
  const { data: info } = useSystemInfo({
    initialData: props.system.info,
  })

  // Use (total - available) to reflect actual memory pressure.
  // mem.used includes reclaimable buff/cache on Linux, which inflates the number.
  const memoryUsed = info?.mem.total && info?.mem.available != null
    ? info.mem.total - info.mem.available
    : info?.mem.used || 0
  const memoryUsagePercent = info?.mem.total
    ? ((memoryUsed / info.mem.total) * 100).toFixed(1)
    : 0

  const swapUsagePercent = info?.mem.swaptotal
    ? ((info.mem.swapused / info.mem.swaptotal) * 100).toFixed(1)
    : 0

  const uptimeSeconds = info?.uptime.uptime || 0
  const uptimeDays = Math.floor(uptimeSeconds / 86400)
  const uptimeHours = Math.floor((uptimeSeconds % 86400) / 3600)
  const uptimeMinutes = Math.floor((uptimeSeconds % 3600) / 60)
  const uptimeDisplay = uptimeDays > 0
    ? `${uptimeDays}d ${uptimeHours}h ${uptimeMinutes}m`
    : uptimeHours > 0
      ? `${uptimeHours}h ${uptimeMinutes}m`
      : `${uptimeMinutes}m`

  // Build storage display items - fall back to fsSize when disk array is empty
  const storageItems = getAllDiskDisplayItems(info?.disk, info?.fsSize)

  return (
    <SettingsLayout>
      <Head title="Informações do sistema" />
      <div className="xl:pl-72 w-full">
        <main className="px-6 lg:px-4 py-6 md:px-8 lg:py-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-desert-green mb-2">Informações do sistema</h1>
            <p className="text-desert-stone-dark">
              Monitoramento e diagnóstico em tempo real • Atualizado em {new Date().toLocaleString()} •
              Atualizando os dados a cada 30 segundos
            </p>
          </div>
          {Number(memoryUsagePercent) > 90 && (
            <div className="mb-6">
              <Alert
                type="error"
                title="Uso de memória muito alto"
                message="O uso de memória do sistema passou de 90%. O desempenho pode cair."
                variant="bordered"
              />
            </div>
          )}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-desert-green mb-6 flex items-center gap-2">
              <div className="w-1 h-6 bg-desert-green" />
              Uso de recursos
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="bg-desert-white rounded-lg p-6 border border-desert-stone-light shadow-sm hover:shadow-lg transition-shadow">
                <CircularGauge
                  value={info?.currentLoad.currentLoad || 0}
                  label="Uso de CPU"
                  size="lg"
                  variant="cpu"
                  subtext={`${info?.cpu.cores || 0} cores`}
                  icon={<IconCpu className="w-8 h-8" />}
                />
              </div>
              <div className="bg-desert-white rounded-lg p-6 border border-desert-stone-light shadow-sm hover:shadow-lg transition-shadow">
                <CircularGauge
                  value={Number(memoryUsagePercent)}
                  label="Uso de memória"
                  size="lg"
                  variant="memory"
                  subtext={`${formatBytes(memoryUsed)} / ${formatBytes(info?.mem.total || 0)}`}
                  icon={<IconDatabase className="w-8 h-8" />}
                />
              </div>
              <div className="bg-desert-white rounded-lg p-6 border border-desert-stone-light shadow-sm hover:shadow-lg transition-shadow">
                <CircularGauge
                  value={Number(swapUsagePercent)}
                  label="Uso de swap"
                  size="lg"
                  variant="disk"
                  subtext={`${formatBytes(info?.mem.swapused || 0)} / ${formatBytes(info?.mem.swaptotal || 0)}`}
                  icon={<IconServer className="w-8 h-8" />}
                />
              </div>
            </div>
          </section>
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-desert-green mb-6 flex items-center gap-2">
              <div className="w-1 h-6 bg-desert-green" />
              Detalhes do sistema
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <InfoCard
                title="Sistema operacional"
                icon={<IconDeviceDesktop className="w-6 h-6" />}
                variant="elevated"
                data={[
                  { label: 'Distribuição', value: info?.os.distro },
                  { label: 'Versão do kernel', value: info?.os.kernel },
                  { label: 'Arquitetura', value: info?.os.arch },
                  { label: 'Nome do host', value: info?.os.hostname },
                  { label: 'Plataforma', value: info?.os.platform },
                ]}
              />
              <InfoCard
                title="Processador"
                icon={<IconCpu className="w-6 h-6" />}
                variant="elevated"
                data={[
                  { label: 'Fabricante', value: info?.cpu.manufacturer },
                  { label: 'Marca', value: info?.cpu.brand },
                  { label: 'Núcleos', value: info?.cpu.cores },
                  { label: 'Núcleos físicos', value: info?.cpu.physicalCores },
                  {
                    label: 'Virtualização',
                    value: info?.cpu.virtualization ? 'Ativada' : 'Desativada',
                  },
                ]}
              />
              {info?.gpuHealth?.status === 'passthrough_failed' && (
                <div className="lg:col-span-2">
                  <GpuPassthroughAlert gpuHealth={info.gpuHealth} assistantName="AI Assistant" />
                </div>
              )}
              {info?.graphics?.controllers && info.graphics.controllers.length > 0 && (
                <InfoCard
                  title="Gráficos"
                  icon={<IconComponents className="w-6 h-6" />}
                  variant="elevated"
                  data={info.graphics.controllers.map((gpu, i) => {
                    const prefix = info.graphics.controllers.length > 1 ? `GPU ${i + 1} ` : ''
                    return [
                      { label: `${prefix}Modelo`, value: gpu.model },
                      { label: `${prefix}Fabricante`, value: gpu.vendor },
                      { label: `${prefix}VRAM`, value: gpu.vram ? `${gpu.vram} MB` : 'N/A' },
                    ]
                  }).flat()}
                />
              )}
            </div>
          </section>
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-desert-green mb-6 flex items-center gap-2">
              <div className="w-1 h-6 bg-desert-green" />
              Alocação de memória
            </h2>
            <div className="bg-desert-white rounded-lg p-8 border border-desert-stone-light shadow-sm hover:shadow-lg transition-shadow">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                <div className="text-center">
                  <div className="text-3xl font-bold text-desert-green mb-1">
                    {formatBytes(info?.mem.total || 0)}
                  </div>
                  <div className="text-sm text-desert-stone-dark uppercase tracking-wide">
                    RAM total
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-desert-green mb-1">
                    {formatBytes(memoryUsed)}
                  </div>
                  <div className="text-sm text-desert-stone-dark uppercase tracking-wide">
                    RAM em uso
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-desert-green mb-1">
                    {formatBytes(info?.mem.available || 0)}
                  </div>
                  <div className="text-sm text-desert-stone-dark uppercase tracking-wide">
                    RAM disponível
                  </div>
                </div>
              </div>
              <div className="relative h-12 bg-desert-stone-lighter rounded-lg overflow-hidden border border-desert-stone-light">
                <div
                  className="absolute left-0 top-0 h-full bg-desert-orange transition-all duration-1000"
                  style={{ width: `${memoryUsagePercent}%` }}
                ></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-bold text-white drop-shadow-md z-10">
                    {memoryUsagePercent}% em uso
                  </span>
                </div>
              </div>
            </div>
          </section>
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-desert-green mb-6 flex items-center gap-2">
              <div className="w-1 h-6 bg-desert-green" />
              Dispositivos de armazenamento
            </h2>

            <div className="bg-desert-white rounded-lg p-8 border border-desert-stone-light shadow-sm hover:shadow-lg transition-shadow">
              {storageItems.length > 0 ? (
                <HorizontalBarChart
                  items={storageItems}
                  progressiveBarColor={true}
                  statuses={[
                    {
                      label: 'Normal',
                      min_threshold: 0,
                      color_class: 'bg-desert-olive',
                    },
                    {
                      label: 'Aviso - Uso alto',
                      min_threshold: 75,
                      color_class: 'bg-desert-orange',
                    },
                    {
                      label: 'Crítico - disco quase cheio',
                      min_threshold: 90,
                      color_class: 'bg-desert-red',
                    },
                  ]}
                />
              ) : (
                <div className="text-center text-desert-stone-dark py-8">
                  Nenhum dispositivo de armazenamento detectado
                </div>
              )}
            </div>
          </section>
          <section>
            <h2 className="text-2xl font-bold text-desert-green mb-6 flex items-center gap-2">
              <div className="w-1 h-6 bg-desert-green" />
              Status do sistema
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatusCard title="Tempo ligado" value={uptimeDisplay} />
              <StatusCard title="CPU Núcleos" value={info?.cpu.cores || 0} />
              <StatusCard title="Dispositivos de armazenamento" value={storageItems.length} />
            </div>
          </section>
        </main>
      </div>
    </SettingsLayout>
  )
}
