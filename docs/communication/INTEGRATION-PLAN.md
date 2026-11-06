# Communication integration plan

Add a dedicated Spring Boot communication package and React Communication pages. Reuse users/employee links, JWT, endpoint_management grants, PageService, and FileSuiteService. Add /communication and group/admin subroutes, shared navigation/unread indicator, and Share via Communication on selected managed files. Keep unrelated module logic unchanged.

Additive database objects: communication_conversations, communication_participants, communication_messages, communication_policy, communication_audit, communication_backups. Per-conversation sequence numbers and participant read positions provide pagination/unread state. Message content and attachment metadata are AES-256-GCM encrypted with an external server-only key. Device attachments are encrypted managed-file containers; existing files remain references subject to current ACLs. Shared managed files require all recipients to already have access, or an explicit separately authorized File Management sharing action; sending never creates silent grants.

Real-time transport: a separate authenticated account event WebSocket, with a JWT authentication frame, no public conversation subscriptions, and database reads enforcing membership. Push only refresh/typing metadata; durable messages are acknowledged by transactional REST APIs after persistence. Reconnection reloads state. Existing WebSockets are left unchanged.

Privileged review requires ROLE_ADMIN plus explicit enabled COMMUNICATION_ADMIN and action-specific endpoint-management grants, a reason, and audit entries. No review grants are assigned automatically. Deletion defaults off; enabled deletion retains encrypted content with a retention deadline and audited restore. Encrypted backup archives include communication rows and immutable managed-file content, with integrity verification and selective restoration that never overwrites existing messages.

Use isolated database tests for participants, policies, deletion/recovery, attachments, encryption, deduplication, and privileged access; compile both projects and visually verify the UI using actual local accounts without seeding mock chats.
