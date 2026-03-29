// Minimal mutable ref interface — framework agnostic.
// React's MutableRefObject<T> satisfies this automatically.
export interface Ref<T> { current: T }
