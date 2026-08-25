import si from 'systeminformation'

/**
 * Hardware probing is a local-substitutable dependency: imported directly
 * here, mockable at the module boundary if tests ever need it.
 */
export async function getHardware() {
  const [osInfo, cpu, mem, fsSize, load, time] = await Promise.all([
    si.osInfo(),
    si.cpu(),
    si.mem(),
    si.fsSize(),
    si.currentLoad(),
    si.time(),
  ])

  // Prefer the root filesystem on Unix systems.
  // On Windows systeminformation normally reports
  // the available drive as well.
  const rootDisk =
    fsSize.find(
      (disk) => disk.mount === '/' || disk.mount === 'C:\\',
    ) ?? fsSize[0]

  const uptimeSeconds = time.uptime

  const days = Math.floor(uptimeSeconds / 86400)
  const hours = Math.floor((uptimeSeconds % 86400) / 3600)
  const minutes = Math.floor((uptimeSeconds % 3600) / 60)
  const seconds = Math.floor(uptimeSeconds % 60)

  return {
    hostname: osInfo.hostname,
    platform: osInfo.platform,
    distro: osInfo.distro,
    release: osInfo.release,
    arch: osInfo.arch,
    kernel: osInfo.kernel,
    nodeVersion: process.version,

    uptime: { days, hours, minutes, seconds },

    cpu: {
      model: cpu.brand || 'N/A',
      manufacturer: cpu.manufacturer || 'N/A',
      cores: cpu.cores,
      physicalCores: cpu.physicalCores,
      speed: cpu.speed,
      loadPercent: Math.round(load.currentLoad),
      userPercent: Math.round(load.currentLoadUser),
      systemPercent: Math.round(load.currentLoadSystem),
    },

    memory: {
      total: mem.total,
      used: mem.used,
      free: mem.free,
      available: mem.available,
      percent: Math.round((mem.used / mem.total) * 100),
    },

    disk: rootDisk
      ? {
          filesystem: rootDisk.fs,
          mount: rootDisk.mount,
          total: rootDisk.size,
          used: rootDisk.used,
          free: rootDisk.available,
          percent: Math.round(rootDisk.use),
        }
      : null,
  }
}
