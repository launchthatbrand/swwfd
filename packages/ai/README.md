# @swwfd/ai

## AI chat UI usage

Use the reusable chat UI components from the `frontend` or `admin` entrypoints.
The components are data-agnostic and can be wired to any chat backend.

```tsx
"use client";

import { useChat } from "@ai-sdk/react";
import { AdminAiChatScreen } from "@swwfd/ai/admin";

export default function AdminAiPage() {
  const { messages, status, stop, append } = useChat();

  return (
    <AdminAiChatScreen
      messages={messages}
      onStop={stop}
      onSend={(input) => append({ role: "user", content: input })}
      status={status}
      title="AI Assistant"
      subtitle="Ask about trades, risk, and daily market context."
    />
  );
}
```

If you want to compose your own layout, use the primitives from
`@swwfd/ai/frontend`:

```tsx
import {
  AiChatComposer,
  AiChatHeader,
  AiChatMessageList,
  AiChatPanel,
} from "@swwfd/ai/frontend";
```
