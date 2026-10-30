# Navigation audit corrections — 29 October 2026

The public library consumes simLAB's canonical catalog and player. This change
corrects the twelve findings from the navigation red-team review; it does not
withdraw resources, alter source assets, loosen authentication or change CI jobs.

| Finding | Correction and verification |
| --- | --- |
| NAV-01 — collections truncated at 50 items or 2,000 ID characters | Versioned, bounded compact public links retain order and exact saved views. Clean-browser tests cover 35 long IDs and 61 items; codec tests cover 1,944 items. Legacy `ids=` links still work. Invalid/oversized links and unavailable IDs are explicit. |
| NAV-02 — mobile failed-player recovery covered by the frame | The host owns visible loading/failure controls: Back to page, Retry, and Open full view. Retry replaces the source window. Controls hide after trusted readiness. Tests exercise the 25-second failure, replacement and exit. |
| NAV-03 — search/filter/scroll lost on refresh or Back | Search/filter URL replacement and per-history-entry list state preserve filters, expanded groups, result limit, focus and scroll. No entry per keystroke. Browser tests include reload and returning from a resource. |
| NAV-04 — competing anatomy navigation levels | Source Region → Focus → Action owns anatomy selection. The outer breadcrumb follows the shown region/topic; its duplicate workspace/atlas selector is removed. The separate atlas remains searchable and directly launchable. |
| NAV-05 — region changes silently switch the learner's task | Companion simLAB change preserves supported focus, side and cohort; unavailable tasks explicitly fall back to Anatomy. Native and actual DevPT tests cover Manual therapy and Single muscle across regions. |
| NAV-06 — saved resource discards actual anatomy view | Save current view / Update saved view / Remove saved view are explicit. Side, cohort and practice are preserved in Saved, Copy all links, sharing and Save all. Resource identity is validated independently of supplied view settings. |
| NAV-07 — Escape leaves fullscreen before closing Explore | Companion source change consumes Escape at the top open navigation surface, including when focus has left it. Native/mobile DevPT tests cover this. |
| NAV-08 — dialog opener detached by a source update | Semantic action identity restores focus to the current connected header control after a trusted view update. Real navigation does not steal focus back to an old page. |
| NAV-09 — Forward creates phantom fullscreen history | Back and Forward replay app fullscreen symmetrically without adding extra entries. Existing exact-view and retained-iframe history tests remain intact. |
| NAV-10 — global mobile menu ignores Escape | Escape dismisses the menu and restores its toggle; outside clicks dismiss it. |
| NAV-11 — tablet horizontal overflow | The header's decorative glow is bounded to its band. Viewport assertions pass at 768/1,024 pixels; no global overflow clipping was added. |
| NAV-12 — unknown route pretends to be Home | Unknown hashes show Page not found with Search recovery. Existing resource/taxonomy/collection aliases remain supported. |

The adversarial retest also exposed a pre-existing clipped collection action
menu. Collection actions now use the same accessible modal as other site actions.

## Local evidence

- 104 desktop/mobile anatomy, teaching-library and navigation browser tests pass;
  two desktop-only skips correspond to phone-specific cases.
- A further 94 product/workspace and adversarial browser checks pass, including
  altered shared-view identity, retaining unknown IDs while re-sharing, and reload
  scroll restoration. These use explicit protocol/failure fixtures, not model
  rendering substitutes.
- Four companion simLAB browser tests pass against actual layered models: native
  and DevPT, desktop and touch layouts. Software WebGL is functional evidence,
  not physical-device/FPS qualification.
- Six collection codec tests, normal `npm test`, syntax validation and explicit
  public-site export pass. The existing hosted check runs codec tests as part of
  `test:ui`; no additional hosted job or runner tier is introduced.

Compact links are self-contained public navigation data, capped at 4,096 items,
512 KiB decoded content and 100,000 token characters. Very large links can exceed
QR capacity; the UI then explicitly offers Copy link. No shortening service,
account, private learner state, or additional hosting is required.
