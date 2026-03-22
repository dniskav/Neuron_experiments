import { Text } from "@chakra-ui/react";
import type { TableCellProps } from "./types";

/**
 * Flex table cell: fixed padding, xs font, variable color via props.
 * Used in NormalizationBox comparison table and OutputRulesBox.
 */
export function TableCell({ children, ...props }: TableCellProps) {
  return (
    <Text flex={1} px={2} py={1} fontSize="xs" color="gray.600" {...props}>
      {children}
    </Text>
  );
}
