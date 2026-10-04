# Quire for Windows with ChatGPT

This personal test build connects Quire to an eligible ChatGPT plan through OpenAI's official Sign in with ChatGPT SDK. Quire sends requests and saves completed replies automatically; copying prompts and answers between apps is unnecessary. Plan eligibility, consent, available models and usage limits are controlled by OpenAI.

## Start on Windows

1. Download `Quire-Windows-0.1.1.exe` and open it on a Windows 10/11 x64 computer. This is the actual portable app; it does not need Node.js installed.
2. The first-open guide appears automatically. Choose **Sign in with ChatGPT**, complete sign-in/consent in your browser, and Quire brings its window forward and moves to the research step when an available model is returned. Sign-in and research choices remain yours. **Connect later** lets you prepare research without AI.
3. Continue the current project, start a thesis/paper/assignment through the existing guided form, or choose a Quire workspace backup to import. You may also choose an additional PC/pen-drive folder for article copies. The guide returns after project setup or import and opens your research when finished.
4. Choose **Ask ChatGPT** or use the sidebar assistant. A model is selected from your account automatically; you can change it in **Connection & model**. Questions are sent and completed answers saved automatically. **Stop** discards an unfinished answer. The guide does not repeat after completion; **Run setup guide** reopens it from connection settings.
5. In the PDF reader, existing analysis, question and passage-explanation controls use the connected account automatically. Writing-review requests open the assistant with the selected paragraph and return suggestions separately from the manuscript.

This executable is an unsigned personal test build. Windows launch, browser consent and account eligibility still require a live check. Internet access is required for AI requests and the existing external PDF/OCR libraries.

## Bring existing research into the desktop app

The desktop app has its own local workspace. In the browser version, use **Account & cloud → Download backup**. Import that JSON through the first-open guide or **Restore backup**. Importing validates the backup and asks before replacing the structured workspace, so first export desktop work you want to keep. PDF binaries are not in the JSON backup. Attach browser PDFs again to the corresponding articles, or select an existing native article-copy folder containing the same article IDs.

## Articles on the PC and a pen drive

Imported PDFs are stored as ordinary files under the current user's `AppData/Quire/articles` folder. **Article storage · PC / pen drive → Open PC folder** opens the exact location. Previously cached PDFs from version 0.1.0 are migrated into this folder without deleting the old cache.

Choose a folder on the PC or pen drive in the guide or article-storage screen. Quire creates a `Quire-article-library` subfolder there and copies existing/new PDFs into it. The PC copy stays in place. If the pen drive is unplugged, new PDFs still save on the PC. While Quire is open, it checks the chosen folder every 30 seconds and copies pending PDFs when the folder returns. **Update copies now** retries immediately. If Windows assigns the pen drive a different letter, choose its folder again.

PDFs have readable filenames containing their Quire article ID, plus small companion JSON files that preserve filenames and integrity checks. Keep the whole subfolder together and leave these names unchanged. The app retrieves its imported PDFs from the PC folder; if one is missing, it can retrieve the matching file from the chosen folder and restore the PC copy. PDFs already sitting elsewhere on a drive must first be imported/attached in Quire.

On another PC: restore the same Quire workspace backup, select the pen-drive folder that contains `Quire-article-library`, then open the saved article. Its matching ID links the article record to the PDF. Projects, writing, notes and highlights remain in the structured workspace/backup, separately from PDF files. Folder copying is a backup from this PC, not a two-way multi-PC workspace sync. **Use PC only** stops future copying and preserves existing folder copies. **Start fresh** clears the structured workspace but keeps article-folder files.

The native library accepts PDFs up to 100 MB and rejects invalid IDs, non-PDF headers and symbolic-link files. Credentials are never placed in the article folders. PDF files can be opened from disk without an AI call; initial PDF/OCR libraries and AI requests still need internet access.

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

Seventeen automated tests passed: the original native request/source/context/SDK and assistant checks; first-open progression and completion persistence; real guided-project and backup handoffs including cancellation/failure; native PDF adapter and legacy migration; real file persistence/restart; simulated drive removal/reconnection; retrieval on a second PC; outside-file/symlink rejection; and preservation when copying stops. The DOM workflow uses synthetic account and response data. Filesystem tests use temporary directories to simulate a removable drive; these are not live OAuth, physical USB, graphical Electron or Windows tests. Graphical checks could not run in the build environment.

Pending Windows acceptance checks: launch and follow the first-open guide; sign in with the intended account; obtain a completed reply; restart and verify connection/reply persistence; open a real PDF and follow a generated page link; choose a physical pen drive and check PDF copies; unplug/reconnect it and check pending copies; restore the workspace and retrieve its matching PDF on another PC; cancel a request; review a paragraph without changing the manuscript; disconnect and verify the connection is removed. The existing Step 56 frontend validation gate remains open.

SDK source is pinned in `desktop/vendor/siwc-local/UPSTREAM.md`; upstream source files are unmodified and its license is included. References: [OpenAI integration guide](https://developers.openai.com/cookbook/articles/sign-in-with-chatgpt), [local/open-source documentation](https://developers.openai.com/siwc/token-sharing-open-source/sign-in), and [official SDK](https://github.com/openai/sign-in-with-chatgpt-devkit).
