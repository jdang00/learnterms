# Question image uploads

Manual question creation and editing use private Cloudflare R2 storage. Existing
UploadThing attachments keep their original URLs and metadata; this change does
not migrate or delete them. Keep the legacy UploadThing account/files available.

## Upload and storage lifecycle

- Browse, drag/drop, or paste PNG, JPEG, WebP, or GIF images into the question
  editor. Each image is limited to 8 MiB; a question can have up to 12 images.
- The server derives the cohort and class from the selected module. Only an
  authenticated curator/admin in that cohort (or a platform developer) can upload.
  Upload sessions belong to the initiating user and module.
- Object keys are server-generated, not client filenames:
  `cohorts/{cohortId}/classes/{classId}/modules/{moduleId}/question-media/{pending|images}/{uuid}.{extension}`.
- A signed PUT uploads to a temporary key. Completion reads a bounded byte stream,
  detects the actual file type, and checks the declared size/type. SVG and non-image
  files are rejected. Verified bytes are stored at a separate final key, so replaying
  the temporary PUT cannot overwrite an attached image.
- Question saves attach verified uploads in the same database transaction as the
  question. Failed saves cannot leave a partially created question. Upload initiation
  is rate-limited per user (60/hour, burst 20).
- Unattached uploads expire after 24 hours. A scheduled cleanup removes staging
  objects and unattached final objects after a further 15-minute in-flight grace
  period. Attached final objects survive cleanup. Removing an attachment is a soft
  delete and retains the stored file for recovery.

## Quiz rendering and access

- Reads check the question's current cohort and the stored R2 cohort. R2 keys, not
  expiring URLs, are persisted in attachment records. Authorized reads generate
  one-hour signed URLs. These are bearer URLs: anyone holding one can use it until
  it expires. Do not enable a public bucket/custom-domain endpoint.
- The shared media hook refreshes URLs every five minutes and when the tab regains
  focus/visibility, including URLs in open viewers. Legacy URLs pass through unchanged.
- Desktop quiz thumbnails retain the zoom/pan viewer. Mobile retains the attachments
  viewer. Rationale-only images follow the existing desktop reveal rules and are
  excluded from mobile attachments until the answer/rationale is revealed.
- Alt text, optional captions, ordering, and the rationale-only setting work for
  both storage providers. This is attachment support, not inline rich-text images.

## Deployment configuration

Uses the existing `@convex-dev/r2` component and `R2_BUCKET`, `R2_ENDPOINT`,
`R2_ACCESS_KEY_ID`, and `R2_SECRET_ACCESS_KEY` deployment variables. Credentials
stay on the server. Restrict the R2 API token to the intended bucket. The bucket
must allow browser PUT requests from the intended app origins via CORS, including
the `Content-Type` header; use explicit development/production origins, not `*`.
Do not apply a lifecycle rule to the final `images/` prefix.

Deploy the backwards-compatible Convex schema/functions before the frontend.
No legacy data migration is needed. Production deployment requires separate
confirmation; development verification is not evidence of a production release.

## Verification

- `bun run test`: includes cohort/role/ownership denial, file-content validation,
  atomic attachment saves, legacy URL reads, and cleanup lifecycle tests.
- `bun run check`
- `bunx tsc --noEmit -p src/convex/tsconfig.json`
- `bun run build`
- Development browser verification: paste image, save question, reopen saved R2
  image, desktop quiz viewer, mobile quiz viewer, and rationale-only reveal.
