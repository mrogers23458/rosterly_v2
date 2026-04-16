# Rosterly — Project Development Rules

## Responsive Design: Mobile-First

All pages and components must be designed mobile-first. Start with the smallest
screen experience and progressively enhance as viewport width increases.

### Breakpoints (Tailwind defaults)

| Prefix | Min width | Typical device |
|--------|-----------|----------------|
| _(none)_ | 0px     | Mobile phone (portrait) — base styles |
| `sm`   | 640px     | Large mobile / small tablet |
| `md`   | 768px     | Tablet / small laptop |
| `lg`   | 1024px    | Laptop / desktop |
| `xl`   | 1280px    | Large desktop |
| `2xl`  | 1536px    | Wide monitor |

### Rules

1. **Design mobile first.** Write base styles for `xs`. Add `sm`, `md`, `lg`,
   `xl` overrides only to enhance — never to fix a broken desktop design.

2. **Stack on small screens, expand on large ones.**
   - Single-column layouts on `xs`/`sm`
   - Multi-column grids from `md` / `lg` upward
   - Secondary panels, sidebars, and decorative elements visible only from `md`+

3. **Navigation adapts by breakpoint.**
   - Mobile (`xs`/`sm`): fixed top AppBar + hamburger → temporary drawer
   - Desktop (`md`+): permanent sidebar

4. **Touch-friendly interactions on mobile.**
   - Tap targets ≥ 44×44 px
   - Avoid hover-only affordances for core actions
   - No horizontal scrolling for normal use

5. **Typography and spacing scale up.**
   - Use `{ xs: ..., sm: ..., md: ..., lg: ... }` for `fontSize`, `px`, `py`,
     `gap`, and `maxWidth` values that benefit from scaling
   - Tighter spacing on mobile, more breathing room on larger screens

6. **Forms are full-width on mobile.**
   - Multi-column form rows (`sm: "row"`) only from `sm`+ upward
   - Input labels and helper text always visible — no tooltip-only patterns

7. **Cards / grids follow this column pattern** (default; adjust if content warrants):
   ```
   xs  → 1 column
   sm  → 2 columns
   lg  → 3 columns
   xl  → 4 columns (only if density makes sense)
   ```

8. **Essential actions always visible.** Primary CTAs (submit, create, save)
   must be reachable without scrolling on any breakpoint.

9. **No fixed-width containers that overflow.** Use `maxWidth` + `width: "100%"`
   rather than fixed pixel widths on content boxes.

10. **Page padding scales.**
    ```
    xs: px 2  (16px)
    sm: px 3  (24px)
    md: px 4  (32px)
    lg: px 5  (40px)  — only if content benefits
    ```

### Implementation checklist (per component)

Before shipping any page or component, answer:

- [ ] What is the best smallest-screen (mobile) version?
- [ ] How does it expand at `sm`, `md`, `lg`?
- [ ] Is any content hidden or deprioritised on mobile that should still be
      accessible (not just invisible)?
- [ ] Are all tap targets large enough?
- [ ] Is there any horizontal overflow on mobile viewport?
- [ ] Do forms stack correctly on mobile?

---

_This file is the canonical responsive design reference for this project.
Consult it before implementing any new page, layout, or component._
