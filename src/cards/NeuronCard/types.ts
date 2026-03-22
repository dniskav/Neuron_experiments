export interface NeuronTrainingProps {
  titulo: string;
  umbral: number;
  datos: [number, number][];
}

export interface DetectorNeuronProps {
  titulo: string;
  umbral: number;
  datos: [number, number][];
  edadesVisualizacion: number[];
  colorPositivo: { fondo: string; barra: string; texto: string };
  colorNegativo: { fondo: string; barra: string; texto: string };
  etiquetaPositivo: string;
  etiquetaNegativo: string;
}

export interface NormalizationBoxProps {
  normalizar: boolean;
  toggleNormalizar: () => void;
  umbral: number;
  media: number;
  std: number;
  umbralNorm: string;
  edades: number[];
}

export interface HeatmapCell {
  edad: number;
  confianza: number;
  esPositivo: boolean;
}

export interface PredictionHeatmapProps {
  mapa: HeatmapCell[];
  edadesRange: [number, number];
  etiquetaPositivo: string;
  etiquetaNegativo: string;
}
