FROM public.ecr.aws/docker/library/node:24-slim AS runner
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    tini curl \
    && rm -rf /var/lib/apt/lists/*
RUN groupadd -r nextjs && useradd -r -g nextjs nextjs

COPY .next/standalone ./
COPY public ./public
COPY .next/static ./.next/static
COPY content ./content

ENV PORT=3000
ENV NODE_ENV=production

EXPOSE 3000

USER nextjs
ENTRYPOINT ["tini", "--"]
CMD ["node", "-e", "process.env.HOSTNAME='0.0.0.0'; require('./server.js')"]
