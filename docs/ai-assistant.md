# Quire AI Assistant — setup guide for beginners

This guide gets the AI Assistant working in Quire with **ChatGPT, Claude, Gemini and/or Copilot**. You do not need to know how to code. Allow about 30–45 minutes the first time. A computer is easier than a phone.

You can start with **just one AI** and add the others later. Gemini has a free tier, which makes it a good one to try first.

---

## How it works

```
Quire (your browser)  →  quire-ai function (your Supabase)  →  ChatGPT / Claude / Gemini / Copilot
```

- To use an AI from an app you need an **API key**. It works like a password and is billed to your account.
- If a key were placed in the Quire website, anyone could copy it and spend your money. So the keys are stored in **Supabase**, where nobody can read them. A small piece of server code called the **`quire-ai` function** passes your questions to the AI and the answers back.
- Only people signed in to *your* Quire can use the function. You can limit it to your own email address (step 5).

**What it costs:**
- Supabase's free plan is enough.
- AI providers charge per use, separately from ChatGPT Plus or Claude Pro subscriptions. A long conversation usually costs a few cents.
- Set a monthly spending limit on each provider's billing page.

---

## Step 1 — Set up Supabase (once)

Skip this step if Quire already says **Signed in** under *Account & cloud*.

1. Go to <https://supabase.com>, sign in and open your **Quire** project. If you don't have one, create a new project.
2. Open **SQL Editor** in the left menu and click **New query**.
3. Open `supabase/schema.sql` from your Quire repository. Copy **all** of it, paste it in, and click **Run**.
   - Lines saying "skipping" are normal. A line starting with **ERROR** is a problem; see *Troubleshooting* below.
4. Click **Connect** (top of the page), or go to **Project Settings → API**. Copy:
   - the **Project URL** (looks like `https://abcdxyz.supabase.co`)
   - the **anon / publishable key** (a long text)
   - ⚠️ Never use the `service_role` / secret key in Quire.
5. In Quire, click the **Local** button in the top bar to open **Account & cloud**. Paste the URL and key, then create an account with your email and a password.
6. If Supabase sends a confirmation email, click the link, then sign in to Quire.

---

## Step 2 — Get an API key for each AI you want

You only need one to begin. Copy each key straight into a note somewhere safe, because most sites only show it once.

### Gemini (Google) — free tier available
1. Go to <https://aistudio.google.com> and sign in with a Google account.
2. Click **Get API key → Create API key**.
3. Copy the key. It starts with `AIza…`.

### ChatGPT (OpenAI)
1. Go to <https://platform.openai.com>. This is separate from chatgpt.com.
2. Under **Settings → Billing**, add a payment method and a small credit, for example $5. Set a usage limit.
3. Go to **API keys → Create new secret key**.
4. Copy the key. It starts with `sk-…`.

### Claude (Anthropic)
1. Go to <https://console.anthropic.com>. This is separate from claude.ai.
2. Under **Settings → Billing**, add credit, for example $5. Set a spend limit.
3. Go to **API Keys → Create Key**.
4. Copy the key. It starts with `sk-ant-…`.

### Copilot (Microsoft, through Azure OpenAI)
Microsoft does not offer a general "Copilot API" for apps. The equivalent is **Azure OpenAI**, which runs the same GPT models that Copilot uses inside your Microsoft Azure account. This is the most involved option, so leave it for last.

1. Go to <https://portal.azure.com> and sign in. Your university or work Microsoft account may already have Azure access.
2. Search for **Azure OpenAI** and click **Create**. Choose a subscription, a resource group, a region and a name, then click **Review + create**.
3. Open the new resource and go to **Go to Azure AI Foundry portal**, then **Deployments → Deploy model**. Pick a GPT model and give the deployment a name, for example `quire-gpt`.
4. Back in the Azure resource, go to **Keys and Endpoint** and copy:
   - **KEY 1**
   - the **Endpoint** (looks like `https://your-name.openai.azure.com/`)
   - the **deployment name** from step 3

---

## Step 3 — Create the `quire-ai` function in Supabase

### Option A — in the browser (no installs)
1. In Supabase, open **Edge Functions** in the left menu.
2. Click **Deploy a new function**, then choose **Via Editor**.
3. Name the function exactly **`quire-ai`**.
4. Delete the sample code. Paste in **all** of `supabase/functions/quire-ai/index.ts` from your Quire repository.
5. Click **Deploy function** and wait for it to finish.
6. Leave **Verify JWT** turned **on**. This is the default, and it is part of what keeps the function private to signed-in users.

### Option B — with the Supabase CLI (if you're comfortable with a terminal)
```bash
npm install -g supabase            # or: brew install supabase/tap/supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF   # the "abcdxyz" part of your project URL
supabase functions deploy quire-ai
```

---

## Step 4 — Add your keys as Supabase secrets

1. In Supabase, go to **Edge Functions → Secrets**. On some layouts it is under **Project Settings → Edge Functions**.
2. Click **Add new secret** for each key you have. The **name must match exactly**:

| AI | Secret name | Value |
| --- | --- | --- |
| ChatGPT | `OPENAI_API_KEY` | your `sk-…` key |
| Claude | `ANTHROPIC_API_KEY` | your `sk-ant-…` key |
| Gemini | `GEMINI_API_KEY` | your `AIza…` key |
| Copilot | `AZURE_OPENAI_API_KEY` | Azure KEY 1 |
| Copilot | `AZURE_OPENAI_ENDPOINT` | e.g. `https://your-name.openai.azure.com/` |
| Copilot | `AZURE_OPENAI_DEPLOYMENT` | e.g. `quire-gpt` |

3. Click **Save**. The secrets take effect within a minute; you don't need to redeploy.

### Optional: choose specific models
Quire uses sensible default models. To pick a different one, add one of these secrets:

| Secret | Default | Example |
| --- | --- | --- |
| `OPENAI_MODEL` | `gpt-5` | another model from OpenAI's model list |
| `ANTHROPIC_MODEL` | `claude-sonnet-5-5` | `claude-opus-5-5` (most capable), `claude-haiku-4-5-20251001` (fastest, cheapest) |
| `GEMINI_MODEL` | `gemini-2.5-pro` | a model shown in Google AI Studio |

If an AI replies with "model not found", the model name has changed. Set the matching `…_MODEL` secret to a model listed on that provider's website.

---

## Step 5 — Keep it private (recommended)

Anyone who signs up to your Quire could otherwise use your AI keys. Do at least one of these:

- Add a secret **`QUIRE_AI_ALLOWED_EMAILS`** containing your email address. List several addresses separated by commas. Only these accounts can then use the AI.
- In **Authentication → Sign In / Providers**, turn off **Allow new users to sign up** after you have created your own account.

---

## Step 6 — Use it in Quire

1. Open Quire and make sure you are signed in. The top-bar button shows your cloud status instead of **Local**.
2. Click **✦ AI Assistant** in the top bar. The **AI** menu lists every AI you added a key for. If it shows "AI is not connected yet", the message says which step is missing. Click **Refresh** after adding a new key.
3. Optional: the ⚙ button in the article reader's Copilot panel shows each AI's status and model, and lets you choose the **Default AI** used for article analysis.
4. Type your idea in your own words, for example *"I want to study the behaviour of patients adapting to a stoma"*, and press **Send** (or Ctrl+Enter).
5. Choose which AI answers from the **AI** menu. **Compare all** asks every AI you set up and shows their answers one after another.
6. Under any answer, click one of these to keep it:
   - **Save as idea**
   - **Use as research question**
   - **Use as aim**
   - **Add as objective**

   You can edit the text before saving. Nothing goes into your project unless you click **Save**.

**Where else the AI appears:**
- **Guided setup.** *Develop this idea with AI* is on the first-idea step, and *Shape question, aim & objectives with AI* is on the next step. Answers you save go straight into the setup form.
- **Ideas page.** Click *Develop with AI*.
- **Article reader Copilot.** When you are signed in, its summaries, methods and critiques use your default AI. Each statement stays linked to the exact passage in the PDF.

The conversation is saved with your project, so you can come back to it. Use **Clear conversation** to start a new one; anything you saved stays in your project.

---

## Troubleshooting

| Message | What to do |
| --- | --- |
| "AI is not connected yet / Sign in under Account & cloud" | Do step 1, then sign in to Quire. |
| "The quire-ai function is not deployed" | Do step 3. Check the function name is exactly `quire-ai`. |
| "Could not reach the quire-ai function" | Check your internet, then confirm the function shows as deployed in Supabase. |
| "ChatGPT/Claude/Gemini is not set up yet" | Add that AI's key in step 4 and check the secret name is exact. Then click **Refresh** in the Assistant. |
| "… returned 401" | The API key is wrong or was revoked. Create a new key and update the secret. |
| "… returned 429" or "insufficient quota" | Add billing credit, or wait. Free tiers have rate limits. |
| "model not found" | Set the matching `…_MODEL` secret (see step 4). |
| SQL error "relation … does not exist" | Run the whole `schema.sql`, not individual lines. |
| Assistant works for you but not a co-author | Add their email to `QUIRE_AI_ALLOWED_EMAILS`. |

For more detail on failures, open **Edge Functions → quire-ai → Logs** in Supabase.

---

## Privacy

- **What is sent:** your messages and a short summary of your project go to the AI provider you choose. The summary covers the title, question, ideas, objectives, paper titles and assignment brief. For article analysis, the relevant PDF passages are sent too.
- **What is not sent:** your Supabase data, passwords and keys.
- **How providers use it:** check each provider's API data policy. OpenAI, Anthropic and Google don't train on API data by default, but terms can change.
- **Clinical or personal data:** don't paste identifiable patient or participant information into the AI.
