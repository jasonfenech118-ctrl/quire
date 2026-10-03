# Quire for Windows with ChatGPT

This personal test build connects Quire to an eligible ChatGPT plan through OpenAI's official Sign in with ChatGPT SDK. Quire sends requests and saves completed replies automatically; copying prompts and answers between apps is unnecessary. Plan eligibility, consent, available models and usage limits are controlled by OpenAI.

## Start on Windows

1. Download `Quire-Windows-0.1.0.exe` and open it on a Windows 10/11 x64 computer. This portable build does not need Node.js installed.
2. Choose **ChatGPT assistant → Connection & model → Continue with ChatGPT**.
3. Complete sign-in and consent in your normal browser, then return to Quire. Credentials are protected using Windows storage encryption. Quire can reconnect on subsequent launches while the authorization remains valid.
4. Choose an available model if needed. Enter your question and press **Ask ChatGPT**. Answers are saved with the active project after completion. **Stop** discards an unfinished answer.
5. In the PDF reader, the existing analysis, question and passage-explanation controls use the connected account automatically. Writing-review requests open the assistant with the selected paragraph and return suggestions separately from the manuscript.

This executable is an unsigned personal test build. Windows launch, browser consent and account eligibility still require a live check. Internet access is required for AI requests and the existing external PDF/OCR libraries.

## Bring existing research into the desktop app

The desktop app has its own local workspace. In the browser version, use **Account & cloud → Download backup**. In the desktop app, use **Restore backup** to import that JSON. Restoring replaces the current structured workspace, so first export any desktop work you want to keep. PDF binaries are not in the JSON backup; attach your PDFs again to the corresponding articles.

## Context and controls

The general assistant receives selected text plus a bounded subset of the current project's setup, objectives, article metadata/abstracts, research notes and highlights. The notes/highlights checkbox can exclude those items from the next request; earlier saved conversation turns can still contain material from prior requests. Clinical analysis datasets are excluded from automatically assembled context. Large projects supply a subset, and the assistant is told when that subset is reduced to fit the request.

Article answers receive passages retrieved from the open PDF. Only returned IDs belonging to those passages can become page-evidence links. Researchers must still check whether the quoted evidence supports the generated claim.

Use **Manage ChatGPT usage** to inspect account limits. **Disconnect** revokes/removes the selected connection; it does not erase saved Quire research or replies. This integration does not activate a Supabase backend or configure API billing.

## Build and checks

```sh
npm ci
npm test
npm run build:win
```

The executable is produced in `desktop-release/`. `npm start` launches a development build on a supported desktop with protected credential storage.

Seven automated tests passed: native request validation, trusted sender checks, source-ID validation, project/context boundaries and size budget, SDK completion/late-limit handling, assistant DOM workflows, and browser compatibility. The DOM workflow uses synthetic account and response data; it is not a live OAuth, graphical Electron or Windows test. Graphical checks could not run in the build environment.

Pending Windows acceptance checks: launch the executable; sign in with the intended account; obtain a completed reply; restart and verify connection/reply persistence; open a real PDF and follow a generated page link; cancel a request; review a paragraph without changing the manuscript; disconnect and verify the connection is removed. The existing Step 56 frontend validation gate remains open.

SDK source is pinned in `desktop/vendor/siwc-local/UPSTREAM.md`; upstream source files are unmodified and its license is included. References: [OpenAI integration guide](https://developers.openai.com/cookbook/articles/sign-in-with-chatgpt), [local/open-source documentation](https://developers.openai.com/siwc/token-sharing-open-source/sign-in), and [official SDK](https://github.com/openai/sign-in-with-chatgpt-devkit).
