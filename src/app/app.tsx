import { AppProviders } from "./providers"
import { AppRouters } from "./routers"

export default function App() {
  return (
    <AppProviders>
      <AppRouters />
    </AppProviders>
  )
}
