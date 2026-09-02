import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SampleLabelPrintConfig } from '@/api/types'
import {
  readSampleLabelPrintPreference,
  resolveInitialSampleLabelDeviceName,
  saveSampleLabelPrintPreference,
} from '@/utils/desktopPrintPreferences'
import { filterPrintersByPatterns } from '@/constants/sampleLabelConfig'

export function useSampleLabelPrinterSelection(
  labelPrintConfig: SampleLabelPrintConfig,
  osPrinters: DesktopPrinter[],
) {
  const savedPreference = useMemo(() => readSampleLabelPrintPreference(), [])
  const [selectedDeviceName, setSelectedDeviceName] = useState('')

  const matchPatterns = labelPrintConfig.printer_name_patterns

  const deviceOptions = useMemo(() => {
    if (osPrinters.length === 0) return []
    return osPrinters
  }, [osPrinters])

  const preferredPrinters = useMemo(
    () => filterPrintersByPatterns(osPrinters, matchPatterns),
    [matchPatterns, osPrinters],
  )

  useEffect(() => {
    if (deviceOptions.length === 0) {
      setSelectedDeviceName('')
      return
    }
    setSelectedDeviceName((current) => {
      if (current && deviceOptions.some((printer) => printer.name === current)) return current
      const autoPickPool = preferredPrinters.length > 0 ? preferredPrinters : deviceOptions
      return resolveInitialSampleLabelDeviceName(autoPickPool, matchPatterns, savedPreference)
    })
  }, [deviceOptions, matchPatterns, preferredPrinters, savedPreference])

  const handleDeviceChange = useCallback((deviceName: string) => {
    setSelectedDeviceName(deviceName)
    if (!deviceName.trim()) return
    saveSampleLabelPrintPreference({ deviceName })
  }, [])

  const selectedDeviceDisplayName = useMemo(() => {
    const matched = osPrinters.find((printer) => printer.name === selectedDeviceName)
    return matched?.displayName || selectedDeviceName
  }, [osPrinters, selectedDeviceName])

  return {
    selectedDeviceName,
    deviceOptions,
    selectedDeviceDisplayName,
    handleDeviceChange,
  }
}
