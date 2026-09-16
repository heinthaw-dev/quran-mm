import type { AppPrefs } from '../../data/types.ts'

// Ports: ReaderScreen composable
interface Props {
  prefs: AppPrefs
}

export function ReaderScreen({ prefs: _prefs }: Props) {
  return <div data-screen="reader">Reader (placeholder)</div>
}
