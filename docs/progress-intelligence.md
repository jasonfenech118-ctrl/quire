# Quire Progress Intelligence — Step 19

Step 19 replaces prototype progress counters and manually entered writing pace with metrics derived from the active project's real records.

## Principle

Quire no longer asks the researcher to maintain a second set of progress numbers.

Progress is calculated from the work already stored in Quire:

- thesis sections
- article reading status
- chapter status and content
- highlights and notes
- evidence links
- objectives and themes
- milestones
- Study Setup
- dated progress snapshots

This reduces drift between what the researcher has actually done and what the dashboard says has been done.

## Live metrics

### Words written

Current words are the sum of `currentWordCount` across persisted thesis sections in the active project.

The old manually editable current-word-count field is no longer used.

### Research reviewed

A paper counts as reviewed only when its article record has:

`readingStatus = "reviewed"`

Opening an unread PDF automatically changes it to **Reading**.

The Article Reader now has a **Mark reviewed** control, which can also return a reviewed paper to Reading if needed.

### Chapters developed

A chapter counts as developed when:

- its status is **Review** or **Complete**; or
- it contains written words and its status is **Outlined** or **In progress**.

The default chapter shell alone therefore does not count as completed work.

### Milestones

Milestone totals and completion counts come from the project's real milestone records.

Deadlines saved in Study Setup create/update milestone records for:

- proposal
- ethics
- data collection / screening start
- data collection / screening end
- first full draft
- final submission

A submission deadline edited from **My Research** now updates the same milestone model.

Dashboard milestone checkboxes write back to those records rather than acting as visual-only tasks.

### Evidence coverage

Evidence coverage combines four real ratios where those entities exist:

1. papers used in evidence links / papers in the library;
2. thesis sections with linked evidence / thesis sections;
3. objectives with linked evidence / objectives;
4. themes with linked evidence / themes.

The average of the applicable ratios is the Evidence Coverage component.

A highlight by itself is research activity, but it does not count as a paper being used in the thesis until an evidence relationship exists.

## Overall progress score

The current overall score uses the following transparent weights:

| Component | Weight |
| --- | ---: |
| Writing toward saved word target | 35% |
| Research papers reviewed | 15% |
| Evidence coverage | 15% |
| Chapters developed | 15% |
| Milestones completed | 10% |
| Study Setup completeness | 10% |

The Overview displays the component percentages and weights so the overall percentage is inspectable rather than a hidden score.

The score can move down if the scope of the project grows—for example, adding several unread papers increases the amount of research still to review. That is expected behaviour for a live ratio.

## Daily progress history

Quire maintains at most one **derived** progress snapshot per project per local calendar day.

When project data changes, today's snapshot is updated rather than creating repeated points.

A snapshot stores:

- current words
- observed words/week
- papers total/reviewed
- chapters total/developed
- milestones total/completed
- highlights
- notes
- evidence-link count
- sections total
- sections with evidence
- overall progress
- source = `derived`

Old prototype/manual snapshots are retained as `legacy` data but are not used for Step 19 pace calculations.

## Writing velocity

Quire does not invent a writing pace.

Observed writing pace is calculated from the change in real section word count between today and an earlier derived snapshot, preferring history from approximately the last five weeks.

For example:

- 800 words one week ago
- 1,500 words today
- observed pace = 700 words/week

Negative word-count changes are treated as zero growth for pace estimation rather than as negative writing speed.

## Completion forecast

A writing completion date appears only when Quire has:

- a saved thesis word target; and
- at least one earlier dated derived snapshot from which a real pace can be calculated.

Until then the interface explicitly says **Building history**.

The forecast compares:

- remaining words;
- observed writing pace;
- final submission date;
- required words/week to reach the target by that date.

Possible project-health states include:

- Add a submission date
- Timeline needs review
- Writing target reached
- Add a word target
- Collecting real pace data
- Writing pace needs attention
- Writing pace is ahead
- Writing pace is aligned

These are planning signals, not guarantees of thesis completion.

## Progress history display

The Overview now shows recent dated snapshots with:

- words added
- papers reviewed
- evidence links added
- number of dated snapshots
- word-count bars
- overall-progress markers

The history intentionally starts from Step 19's derived snapshots rather than treating old prototype figures as genuine historical activity.

## Active-project isolation

All metrics are scoped to the active thesis project.

Dashboard article/highlight/note/theme counts, My Research project percentages and Thesis Overview values now use the same active-project data rather than separate prototype counters.

## Cloud schema

The Supabase-ready progress snapshot schema now also supports:

- `evidence_links`
- `sections_total`
- `sections_with_evidence`
- `overall_progress`
- `source`

Existing Supabase databases should run the latest `supabase/schema.sql` before using this version of cloud sync.

## Interpretation

Progress Intelligence measures recorded work and structural coverage.

It does not determine:

- whether a thesis is academically strong;
- whether a paper is high quality;
- whether a chapter is ready for submission;
- whether evidence is interpreted correctly;
- how long supervisor revision will take.

Those remain researcher and supervisor judgements.
