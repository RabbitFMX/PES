import 'dotenv/config'
import { createApp } from './app'

const port = process.env.PORT ? Number(process.env.PORT) : 3001

const app = createApp()

app.listen(port, () => {
  console.log(`PES backend listening on port ${port}`)
})
