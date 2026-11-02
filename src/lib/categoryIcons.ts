import { Atom, Brain, Code, Cpu, Globe, Sparkles } from 'lucide-vue-next'
import type { Component } from 'vue'

// Kategorinin `icon` alanı (API) → ikon bileşeni. Bilinmeyen ad için varsayılan ikon.
const icons: Record<string, Component> = {
  code: Code,
  brain: Brain,
  cpu: Cpu,
  globe: Globe,
  atom: Atom,
}

export function categoryIcon(name: string): Component {
  return icons[name] ?? Sparkles
}
