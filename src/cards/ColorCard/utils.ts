import { NeuronN } from "@dniskav/neuron";
import { loadWeightsN } from "../../data/storage";

export const CLAVE_N1 = "neurona_color_claro";
export const CLAVE_N2 = "neurona_color_oscuro";

// Limpia datos del formato antiguo (peso_r/peso_g/peso_b) si existen
export function limpiarFormatoViejo() {
  [CLAVE_N1, CLAVE_N2].forEach(clave => {
    const raw = localStorage.getItem(clave);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed.weights)) localStorage.removeItem(clave);
    } catch {
      localStorage.removeItem(clave);
    }
  });
}

export const MUESTRAS: { r: number; g: number; b: number; label: string }[] = [
  { r: 1,    g: 1,    b: 1,    label: "blanco"     },
  { r: 0.9,  g: 0.9,  b: 0.9,  label: "gris claro" },
  { r: 1,    g: 1,    b: 0,    label: "amarillo"   },
  { r: 0,    g: 1,    b: 0,    label: "verde"      },
  { r: 0,    g: 1,    b: 1,    label: "cyan"       },
  { r: 1,    g: 0.75, b: 0.8,  label: "rosa"       },
  { r: 1,    g: 0.5,  b: 0,    label: "naranja"    },
  { r: 0.5,  g: 0.5,  b: 0.5,  label: "gris"       },
  { r: 1,    g: 0,    b: 0,    label: "rojo"       },
  { r: 0,    g: 0.7,  b: 0.3,  label: "verde med"  },
  { r: 0,    g: 0,    b: 1,    label: "azul"       },
  { r: 0.5,  g: 0,    b: 0.5,  label: "púrpura"    },
  { r: 0.6,  g: 0.3,  b: 0,    label: "café"       },
  { r: 0,    g: 0.5,  b: 0,    label: "verde osc"  },
  { r: 0.15, g: 0.15, b: 0.15, label: "gris osc"   },
  { r: 0,    g: 0,    b: 0,    label: "negro"       },
];

export function hexToRgb(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function rgbToHex(r: number, g: number, b: number) {
  const h = (v: number) => Math.round(v * 255).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

export function crearNeuronaN(clave: string): NeuronN {
  const n = new NeuronN(3);
  const g = loadWeightsN(clave);
  // Validate that the saved format is compatible (weights array)
  if (g && Array.isArray(g.weights) && g.weights.length === 3) {
    n.weights = g.weights;
    n.bias = g.bias;
  }
  return n;
}

export const CLASE_ESTILO = {
  claro:  { texto: "#854d0e", badge: "#ca8a04" },
  neutro: { texto: "#0c4a6e", badge: "#0284c7" },
  oscuro: { texto: "#e0e7ff", badge: "#818cf8" },
};
