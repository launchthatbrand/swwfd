# LaunchThat Support Widget Integration

The support chat widget now uses a Convex-native transport by default.

## Required Setup For Standalone Apps

1. Mount a `SupportConvexProvider` with a `support` binding that includes:
   - `support.widget.queries.bootstrap`
   - `support.widget.queries.getSettings`
   - `support.widget.queries.resolveThread`
   - `support.widget.queries.listMessages`
   - `support.widget.queries.listHelpdeskArticles`
   - `support.widget.queries.listPresence`
   - `support.widget.mutations.createThread`
   - `support.widget.mutations.captureContact`
   - `support.widget.mutations.sendMessage`
   - `support.widget.mutations.presenceHeartbeat`
   - `support.widget.mutations.presenceDisconnect`
2. Render `SupportChatWidget` with:
   - `organizationId`
   - `widgetKey`
   - optional `tenantName`
3. Keep `transportMode` as the default (`"convex"`), unless temporarily testing legacy behavior.

## Legacy Route Deprecation

Portal Next.js routes under `/api/support-chat/*` are hard-deprecated and now return `410`.
Use the Convex-native support widget APIs instead.

## Minimal Example

```tsx
<SupportConvexProvider bindings={supportConvexBindings}>
  <SupportChatWidget
    organizationId={organizationId}
    widgetKey={widgetKey}
    tenantName="LaunchThat"
  />
</SupportConvexProvider>
```
