ARG NODE_IMAGE
FROM ${NODE_IMAGE} AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
COPY offline-npm/ /offline-npm/
RUN --network=none npm ci --offline --include=dev --no-audit --no-fund --cache=/offline-npm \
    && node -e 'require("sharp"); require("@next/swc-linux-x64-gnu"); require("esbuild").transformSync("let x=1")'

FROM ${NODE_IMAGE}
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY app-source/ ./
COPY image-tools/ ./verification/
ARG SOURCE_HASH
ARG HARNESS_HASH
ARG BUILD_INPUT_HASH
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
# Next inlines NEXT_PUBLIC_* variables present at build time. Keep both Supabase
# settings absent here so the server resolves the fresh local values at runtime.
RUN --network=none node verification/local-supabase/font-response-map.cjs \
    && NEXT_FONT_GOOGLE_MOCKED_RESPONSES=/tmp/viewflo-font-responses.cjs npm run build -- --webpack \
    && node -e 'const id=require("node:fs").readFileSync(".next/BUILD_ID","utf8").trim(); if (!/^[A-Za-z0-9_-]{10,80}$/.test(id)) process.exit(1); console.log("VIEWFLO_BUILD_ID="+id)' \
    && rm /tmp/viewflo-font-responses.cjs
LABEL viewflo.verification.source=${SOURCE_HASH} viewflo.verification.harness=${HARNESS_HASH} viewflo.verification.inputs=${BUILD_INPUT_HASH}
USER node
CMD ["node", "verification/growth-runtime/supervisor.mjs"]
