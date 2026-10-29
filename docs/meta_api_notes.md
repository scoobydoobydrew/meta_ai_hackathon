# Meta Model API: notes from the official docs

Read on 2026-10-29 at dev.meta.ai. Where a doc page and `Claude.md` disagree, the doc page wins.
"UNVERIFIED" marks anything the docs did not state and that we have not yet seen in a live response.

## Structured output (Responses API)

Source: https://dev.meta.ai/docs/structured-output and https://dev.meta.ai/docs/api-reference/responses/schemas

- Parameter is `text.format`, not `response_format`. The docs warn that the Chat Completions parameter
  "does not configure structured output" on the Responses endpoint, even though it is accepted.
- Shape (field names from the `TextResponseFormatJsonSchema` schema):

```python
text={"format": {
    "type": "json_schema",
    "name": "claims",          # a-z A-Z 0-9 _ -, max 64 chars, required
    "schema": {...},           # JSON Schema object, required
    "strict": True,            # optional, default false
    "description": "...",      # optional
}}
```

- Where the JSON appears in the reply is not documented on the pages read. **Verified live on 2026-10-29**
  (one call, `strict: true`, `reasoning.effort: minimal`): the JSON string is in `output_text`
  and `json.loads` parses it.
- Schema limits: no recursive schemas (HTTP 400), nesting depth at most 10, at most 5,000 properties.
  With `strict: true`: root must be a plain object, no `allOf`/`oneOf`, every object needs
  `additionalProperties: false`, and `required` must list every property.
  The docs say output is always schema-constrained, so `strict: false` currently behaves like `strict: true`.
- The pydantic `parse()` helper is documented for Chat Completions only. Not documented for Responses.

## Reasoning

Source: https://dev.meta.ai/docs/reasoning

- Parameter: `reasoning={"effort": "..."}`.
- Values: `minimal`, `low`, `medium`, `high`, `xhigh`, `max`. `none` is rejected with HTTP 400 on
  Muse Spark and Muse Wonder. `max` is not available on `muse-spark-1.3-contributor`.
- Omitted: the model still reasons at a model-determined level (no documented default).
- Reasoning tokens count toward `max_output_tokens`, are billed as output tokens, and are reported in
  `usage.output_tokens_details.reasoning_tokens`. A large reasoning budget can truncate the visible answer.
- To keep reasoning across stateless turns: `include=["reasoning.encrypted_content"]` and replay the
  reasoning item, or chain turns with `previous_response_id`.

- Observed once (trivial prompt, `effort: minimal`): 85 output tokens, of which 67 were reasoning tokens.
  Even the lowest effort spends most output tokens on reasoning, so extraction cost must be measured, not assumed.

## Usage fields

`input_tokens`, `input_tokens_details.cached_tokens`, `output_tokens`,
`output_tokens_details.reasoning_tokens`, `total_tokens`.
The live response also carried `input_tokens_details.cache_write_tokens` (not in the schema page).

## Live checks done (2026-10-29)

- `cellproof smoke` returned `ok` from `muse-spark-1.3`; the second identical call came from the local cache.
- Structured output through `text.format` and `reasoning.effort` are accepted by the endpoint (see above).
- Not yet tested: `muse-wonder-1.0`, PDF input, rate limits, error codes.

## PDF and files

Source: https://dev.meta.ai/docs/file-handling

- Three ways, all as an `input_file` content block inside a `message` input item:
  `file_data` (a `data:application/pdf;base64,...` URL), `file_url` (http/https only), or
  `file_id` (from `client.files.create(purpose="user_data", ...)`).
- Limits: 50 MB inline, 1 GiB per upload. Text is read from the first 100 pages only;
  only the first 50 pages are rendered as images.
- Plain text files are not documented as Responses inputs.

Consequence for the design: send Europe PMC full text as `input_text`, which is cheaper and has no page cap.
Use PDF input only for the optional figure-to-edges stage.

## Rate limits and pricing

Source: https://dev.meta.ai/docs/pricing-rate-limits (read 2026-10-29, through a page-summarising fetch tool)

- Limits are per team, not per key: `muse-spark-1.3` and `muse-wonder-1.0` both 3,000 RPM and 4,000,000 TPM. The
  `-contributor` variants are lower (150 RPM). Nothing stated about how limits scale.
- Per 1M tokens, Standard: `muse-spark-1.3` cached input $0.15, input $1.25, output $4.25;
  `muse-wonder-1.0` cached input $0.20, input $4.00, output $20.00. Wonder costs about 3x Spark on input and 5x on output.
- Batch and flex pricing: not stated. Web search grounding is $2.50 per 1,000 queries on top (not used).

## Errors

Source: https://dev.meta.ai/docs/error-handling (same reading)

- Retry with exponential backoff and jitter (start 0.5 to 1 s, 3 to 5 attempts): 429 (honour `Retry-After`), 500, 503.
- Do not retry: 400, 401, 402 (billing), 403, 404, 413.
- 504 means a non-streaming request exceeded the server time limit; the docs say not to retry it unchanged but to use
  `background: true`, streaming, or less work. The OpenAI SDK retries 5xx on its own, so a 504 may be retried by the SDK
  once or twice before it reaches us; the extractor must treat a 504 as "split the paper", not "try again".

## Not read yet

Agent patterns, image understanding, tool calling.
