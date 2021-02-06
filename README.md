# typed-http-requests

This library allows you to specify the input types required for making HTTP requests to an API. It's main innovation is the use of TypeScript's template literal types to allow you to infer the URL parameters for the request, by parsing the URL template.

Currently typed-http-requests is based on building intermediate "generic HTTP requests" which can then be converted to the request format by various libraries (ie. fetch, axios, etc.). The library also relies on io-ts types for parsing the response to make sure the response from the API matches the expected interface.

## Who should use this library?

Developers of web applications that need to access an API. If you already have some sort of auto generated client (Swagger/OpenAPI for example) you don't need this library.

## How do I use this library?

Start by defining a request adapter. Currently `typed-http-requests` only includes a bundled adapter for fetch. But it should be relatively easy to add an adapter for your own library.

```
const fetchAdapter = createFetchAdapter({
  host: 'localhost',
  port: PORT,
})
```

Next create a `RequestCodecFactory` using the adapter

```
const localhostFetchRequestFactory = requestCodecFactory(fetchAdapter)
```

Then create your final `RequestCodec` using the factory.

Note the empty parameter function call after specifying the request body type. This is needed to be able to specify the request body type explicitly as a type parameter while type inference to determine the type of the URL path parameters from the URL template.

```
type UpdateLightBulbReqBody = { state: 'on' | 'off' }

const bulbResponseC = t.type({ batteryRemaining: t.number })
type BulbResponse = t.TypeOf<typeof bulbResponseC>

const updateLightBulb = localhostFetchRequestFactory<UpdateLightBulbReqBody>()(
  'PUT',
  '/light-bulbs/:bulbId',
  bulbResponseC
)
```

Finally you can now just use your request function and get a Promise that contains the decoded response. Your URL parameters and request body should be type checked.

```
async function doSomething() {
  const response: BulbResponse = await updateLightBulb({ bulbId: 123 }, { state: 'on' })
}
```

## Work in progress warning

The API for how to piece together requests and adapters is likely to change over time.
