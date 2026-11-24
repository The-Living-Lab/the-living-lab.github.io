# Penn Web Identity

Source: https://branding.web-resources.upenn.edu/web-identity and Brand Guidelines pp. 38. Web questions: ucomms-web@upenn.edu.

## Scope — read this first

The **central web identity** (the upenn.edu homepage look, redesigned winter 2021) is reserved for top-level pages of the domain and University Communications sites. **Do not replicate the homepage's look and feel on other sites.** Schools and departments that want to participate in the central identity should apply the color and typographic standards below — not the homepage layout.

## Web color palette

Official palette (in the order Penn's color-copier script lists them):

| Hex | Name / role |
|---|---|
| `#011F5B` | Penn Blue — dominant |
| `#990000` | Penn Red — one of the two dominant brand colors; emphasis, links, CTAs |
| `#000000` | Black |
| `#82AFD3` | Light blue accent |
| `#F2C100` | Gold accent |
| `#FFFFFF` | White |
| `#F7F7F7` | Light gray |
| `#F2F2F2` | Light gray |

Accent caution: gold and light blue are web-only accents with no print values, and both are low-contrast on white — use them for rules, borders, and highlights, not body text on light backgrounds.

Approximate color usage across the central web identity (from Penn's "Web Color Percentages" figure):

- **Penn Blue ≈ half** of all color usage — headers, footers, primary surfaces
- **Neutrals** (white, light grays, black text) carry most of the page
- **Penn Red** a distinct but smaller share — emphasis, links, CTAs
- **Light blue and gold** only as small accents

Practical guidance for building a page: white/light-gray background, black body text, Penn Blue for headers/footer/nav and primary buttons, Penn Red for links/emphasis/urgent CTAs, gold and light blue as thin accent details only.

Consistent, accurate use of Penn red and blue is **required** across all schools and departments.

## Web typography

Two typefaces, both free via Google Fonts:

- **EB Garamond** — primary; used most frequently (headings and body text on Penn's central identity)
- **Roboto** — used less often, reserved for style and contrast (UI labels, buttons, metadata). Weights in use: 400, 400 italic, 500, 700, 700 italic

Embed (as used by Penn's own pages):

```html
<link href="https://fonts.googleapis.com/css?family=EB+Garamond|Roboto:400,400i,500,700,700i&display=swap" rel="stylesheet">
```

CSS stacks:

```css
--font-serif: "EB Garamond", Georgia, "Times New Roman", serif;
--font-sans: "Roboto", "Helvetica Neue", Arial, sans-serif;
```

Font licensing: EB Garamond and Roboto are free, but any other fonts brought in must comply with their licenses — Penn's guide stresses this.

## Required elements on every Penn webpage

1. A link back to the University homepage (https://www.upenn.edu)
2. The Penn logo
3. Links to the five global resources (footer convention):

```html
<footer>
  <a href="https://www.upenn.edu/about/privacy-policy">Privacy Policy</a>
  <a href="https://accessibility.web-resources.upenn.edu/get-help">Report Accessibility Issues and Get Help</a>
  <a href="https://www.upenn.edu/about/disclaimer">Disclaimer</a>
  <a href="https://www.publicsafety.upenn.edu/contact/">Emergency Services</a>
  <a href="https://www.upenn.edu/about/report-copyright-infringement">Report Copyright Infringement</a>
</footer>
```

## Digital assets

- Logo files: RGB EPS/PNG/JPG from the download page; never use the CMYK print files on screen.
- On Penn Blue or dark headers/footers, use the **reversed (white) logo variant**.
- In generated code, reference the logo as a local file (e.g. `assets/img/penn-logo-reversed.png`). There is no official hotlinkable logo URL — if the asset can't be bundled, insert a clearly marked placeholder rather than a traced or text-drawn approximation.
- Simplified Shield (favicon-sized): permission required — ucomms-web@upenn.edu.
- The favicon pattern used by Penn's own site is a simplified shield `.ico`.
