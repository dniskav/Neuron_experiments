import type { GlobalProvider } from '@ladle/react'
import { ChakraProvider, defaultSystem } from '@chakra-ui/react'

export const Provider: GlobalProvider = ({ children }) => (
  <ChakraProvider value={defaultSystem}>
    <div style={{ background: '#0f172a', minHeight: '100vh', padding: '32px' }}>{children}</div>
  </ChakraProvider>
)
