FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY collaboration/server.mjs ./collaboration/server.mjs
COPY src/pages/Files/collaborationModel.js ./src/pages/Files/collaborationModel.js
COPY src/pages/Files/collaborationValidation.js ./src/pages/Files/collaborationValidation.js
COPY src/pages/Files/editors/documentFormat.js src/pages/Files/editors/workbookFormat.js src/pages/Files/editors/presentationFormat.js src/pages/Files/editors/archiveSafety.js ./src/pages/Files/editors/
COPY src/pages/Files/editors/documentExtensions.js ./src/pages/Files/editors/documentExtensions.js
RUN mkdir -p /var/lib/eac/collaboration && chown -R node:node /var/lib/eac
USER node
ENV EAC_COLLABORATION_HOST=0.0.0.0 EAC_COLLABORATION_ROOT=/var/lib/eac/collaboration
EXPOSE 1234
CMD ["node","collaboration/server.mjs"]
