import type { ReactNode } from "react";
import type { TextProps } from "@chakra-ui/react";

export interface WeightEntry {
  label: string;
  value: number;
}

export interface WeightsDisplayProps {
  weights: WeightEntry[];
}

export interface StatItemProps {
  label: string;
  value: string | number;
  /** Highlights the item green when true (e.g. training accuracy threshold met) */
  highlight?: boolean;
  /** "block" = label on top of value (default), "compact" = label + value stacked centered */
  variant?: "block" | "compact";
}

export interface TrainingControlsProps {
  label?: string;
  epocas: string;
  setEpocas: (v: string) => void;
  onTrain: () => void;
  loading: boolean;
  shortcuts?: number[];
}

export interface DetailsBoxProps {
  summary: string;
  children: ReactNode;
}

export interface TableCellProps extends TextProps {
  children: ReactNode;
}
