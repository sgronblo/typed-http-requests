import express from 'express'

const expressInstance = express()

expressInstance.post('/test/:message', (req, res) => {
  res.json({ foo: 'bar' })
})

export type CloseCallback = () => Promise<void>

export function startServer(port: number): Promise<CloseCallback> {
  return new Promise((resolveListening, rejectListening) => {
    const server = expressInstance.listen(port, () => {
      resolveListening(
        () =>
          new Promise((resolveClosed, rejectClosed) => {
            server.close((err) => (err ? rejectClosed(err) : resolveClosed()))
          })
      )
    })
    server.on('error', rejectListening)
  })
}
