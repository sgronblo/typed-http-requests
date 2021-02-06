import { CloseCallback, startServer } from '../test-support/mock-server'
import * as t from 'io-ts'
import { createFetchAdapter, requestCodecFactory } from '../src/request-builder'

const responseC = t.type({
  foo: t.string,
})

const PORT = 3333

describe('request-builder', () => {
  let closeCallback: CloseCallback
  beforeAll(async () => {
    closeCallback = await startServer(PORT)
  })

  afterAll(async () => await closeCallback())

  describe('requestCodeFactory', () => {
    describe('with fetch adapter', () => {
      it('should be possible to create and perform POST request', async () => {
        // Set up adapter using `fetch` and accessing localhost
        const localhostFetchRequestFactory = requestCodecFactory(
          createFetchAdapter({
            host: 'localhost',
            port: PORT,
          })
        )

        // Create a request for the test route
        const testRequest = localhostFetchRequestFactory<{ test: number }>()(
          'POST',
          '/test/:hello',
          responseC
        )

        // Perform the request
        const response = await testRequest({ hello: 'world' }, { test: 42 })

        expect(response).toEqual({ foo: 'bar' })
      })
    })
  })
})
