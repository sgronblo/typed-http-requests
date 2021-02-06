import { pipe } from 'fp-ts/lib/function'
import * as Either from 'fp-ts/Either'
import * as t from 'io-ts'
import fetch, { RequestInit } from 'node-fetch'
import reporter from 'io-ts-reporters'

export function decodeOrThrow<T>(
  decoder: t.Decoder<unknown, T>,
  value: unknown
): T {
  return pipe(
    decoder.decode(value),
    Either.fold(
      (errors) => {
        throw new Error(reporter.report(Either.left(errors)).join('\n'))
      },
      (parsedObject) => parsedObject
    )
  )
}

interface GenericRequest {
  url: string
  requestInit: RequestInit
}

interface Ok {
  type: 'ok'
  body: object
}
interface Failure {
  type: 'failure'
  code: number
  explanation: string
}
type GenericResponse = Ok | Failure

type ParamsFromPath<
  Path extends string
> = Path extends `${infer Prefix}/:${infer Param}/${infer Rest}`
  ? Record<Param, PathValue> & ParamsFromPath<`/${Rest}`>
  : Path extends `${infer Prefix}/:${infer Param}`
  ? Record<Param, PathValue>
  : {}

type Id<T> = { [K in keyof T]: T[K] }

type Method = 'GET' | 'POST'

type RequestBuilder<Path extends string, Body> = (
  params: ParamsFromPath<Path>,
  body: Body
) => GenericRequest

function interpolate(
  urlTemplate: string,
  params: Record<string, PathValue>
): string {
  return Object.entries(params).reduce(
    (url: string, [paramName, value]) =>
      url.replace(
        `:${paramName}`,
        typeof value === 'string' ? value : value.toString()
      ),
    urlTemplate
  )
}

type Abc = Id<ParamsFromPath<`/sites/:siteId`>>

type PathValue = string | number

export const createRequest = <ReqBody>() => <Path extends string>(
  method: Method,
  urlTemplate: Path
) => {
  // urlTemplate: Path,
  // urlParams: ParamsFromPath<Path>,
  // reqBody: Body
  // ): GenericRequest {
  return (urlParams: ParamsFromPath<Path>, reqBody: ReqBody) => {
    const requestInit: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(reqBody),
      method,
    }
    return {
      url: interpolate(urlTemplate, urlParams),
      requestInit,
    }
  }
}

interface SampleBody {
  foo: string
}

const resC = t.type({ bar: t.number })

type RequestCodec<Path extends string, Body, Res> = (
  urlParams: ParamsFromPath<Path>,
  body: Body
) => Promise<Res>

type RequestAdapter = (
  genericRequest: GenericRequest
) => Promise<GenericResponse>

type FetchAdapterConfig = {
  protocol?: 'http' | 'https'
  host: string
  port?: number
}

export const createFetchAdapter: (
  config: FetchAdapterConfig
) => RequestAdapter = (config) => {
  const baseUrl = `${config.protocol ?? 'http'}://${config.host}${
    config.port !== undefined ? `:${config.port}` : ''
  }`
  return async (genericRequest) => {
    try {
      const url = baseUrl + genericRequest.url
      const response = await fetch(url, {
        ...genericRequest.requestInit,
        headers: { 'Content-type': 'application/json' },
      })
      if (response.ok) {
        const json = await response.json()
        return { type: 'ok', body: json }
      } else {
        return {
          type: 'failure',
          code: response.status,
          explanation: response.statusText,
        }
      }
    } catch (error) {
      return { type: 'failure', code: 500, explanation: error }
    }
  }
}

export const requestCodecFactory = (requestAdapter: RequestAdapter) => <
  Body
>() => <Path extends string, Res>(
  method: Method,
  pathTemplate: Path,
  resDecoder: t.Decoder<unknown, Res>
): RequestCodec<Path, Body, Res> => {
  const requestCodec: RequestCodec<Path, Body, Res> = async (
    urlParams,
    body
  ) => {
    const request = createRequest<Body>()(method, pathTemplate)(urlParams, body)
    const genericResponse = await requestAdapter(request)
    if (genericResponse.type === 'failure') {
      throw new Error(
        `Failed to execute request ${genericResponse.code}, ${genericResponse.explanation}`
      )
    }
    return decodeOrThrow(resDecoder, genericResponse.body)
  }
  return requestCodec
}

const siteRequestCreator = createRequest<SampleBody>()('GET', '/sites/:siteId')
const sampleGenericRequest = siteRequestCreator({ siteId: 5 }, { foo: 'bar' })
