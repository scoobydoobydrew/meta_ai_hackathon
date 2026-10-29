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

- Where the JSON appears in the reply (`output_text`?) is not documented on the pages read. UNVERIFIED until the first live call.
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

## Usage fields

`input_tokens`, `input_tokens_details.cached_tokens`, `output_tokens`,
`output_tokens_details.reasoning_tokens`, `total_tokens`.

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

## Not read yet

Agent patterns, pricing and rate limits, error handling, image understanding, tool calling.
