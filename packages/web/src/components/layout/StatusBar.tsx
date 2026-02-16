import { Signal, Wifi, BatteryFull } from 'lucide-react'

export function StatusBar() {
  return (
    <div className="flex items-center justify-between h-11 px-4">
      <span className="text-[15px] font-semibold text-text-primary font-primary">
        9:41
      </span>
      <div className="flex items-center gap-1.5">
        <Signal className="w-4 h-4 text-text-primary" />
        <Wifi className="w-4 h-4 text-text-primary" />
        <BatteryFull className="w-[22px] h-4 text-text-primary" />
      </div>
    </div>
  )
}
