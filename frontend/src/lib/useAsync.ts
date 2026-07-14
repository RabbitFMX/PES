import { useCallback, useEffect, useState } from 'react'

export interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: unknown
  reload: () => void
}

/**
 * Runs an async loader and tracks loading/error state, with a `reload()` for
 * retry buttons. Standardises the loading → data / empty / error handling
 * every data-driven screen needs. Fetching in an effect legitimately
 * synchronises React state with an async source.
 */
export function useAsync<T>(loader: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const [state, setState] = useState<{ data: T | null; loading: boolean; error: unknown }>({
    data: null,
    loading: true,
    error: null,
  })
  const [tick, setTick] = useState(0)

  const reload = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    let active = true
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncs state to an async fetch
    setState((s) => ({ ...s, loading: true, error: null }))
    loader()
      .then((result) => {
        if (active) setState({ data: result, loading: false, error: null })
      })
      .catch((err) => {
        if (active) setState({ data: null, loading: false, error: err })
      })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loader intentionally excluded; re-run on caller deps + reload
  }, [tick, ...deps])

  return { ...state, reload }
}
