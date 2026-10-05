# SEO Indexation Registry — Frozen Baseline

Status classes:
- INDEX = public, complete, strategically useful and eligible for sitemap inclusion.
- NOINDEX = publicly accessible utility/transactional/preview route that must stay out of search.
- PRIVATE = confidential/unreleased material that must require authentication when deployed.

## INDEX — English
- `/en/` — INDEX
- `/en/about/` — INDEX
- `/en/research/` — INDEX
- `/en/publications/` — INDEX
- `/en/books/` — INDEX
- `/en/teaching/` — INDEX
- `/en/academic-engagements/` — INDEX
- `/en/golden-talent/` — INDEX
- `/en/educational-philosophy/` — INDEX

- `/en/language-education/` — INDEX

- `/en/teacher-education/` — INDEX

- `/en/projects/` — INDEX

- `/en/news-insights/` — INDEX

- `/en/contact/` — INDEX

- `/en/collaboration/` — INDEX

- `/en/academic-profile/` — INDEX

- `/en/student-guidance/` — INDEX

- `/en/golden-talent/methodology/` — INDEX

## INDEX — Persian
- `/fa/` — INDEX
- `/fa/darbare-man/` — INDEX
- `/fa/falsafe-amoozeshi/` — INDEX
- `/fa/estedaadyabi/` — INDEX
- `/fa/moshavere-tahsili/` — INDEX
- `/fa/entekhab-reshteh/` — INDEX
- `/fa/moshavere-konkur/` — INDEX
- `/fa/danesh-amoozan/` — INDEX
- `/fa/ketab-ha/` — INDEX
- `/fa/tadris/` — INDEX
- `/fa/faaliat-haye-elmi/` — INDEX
- `/fa/golden-talent/` — INDEX
- `/fa/akhbar/` — INDEX

- `/fa/amoozesh-zaban/` — INDEX

- `/fa/tamas/` — INDEX

- `/fa/entesharat-elmi/` — INDEX

- `/fa/rahnamaha/` — INDEX

- `/fa/rahnamaha/moshavere-tahsili-baraye-tasmim/` — INDEX

- `/fa/rahnamaha/che-reshteyi-baraye-man-monaseb-ast/` — INDEX

- `/fa/pajouhesh/` — INDEX

- `/fa/golden-talent/ravesh-shenasi/` — INDEX

## INDEX — News
- `/fa/akhbar/entekhab-reshteh-1405/` — INDEX
- `/fa/akhbar/moshavere-tahsili-baraye-tasmim/` — INDEX
- `/fa/akhbar/che-reshteyi-baraye-man-monaseb-ast/` — INDEX
- `/fa/akhbar/farakhvan-jhela/` — INDEX

## INDEX — Independent public
- `/` — INDEX
- `/publisher/` — INDEX
- `/journal/call-for-reviewers/` — INDEX
- `/journal/founding-collaborators/` — INDEX

## NOINDEX — Legacy English transition routes
- `/about/`
- `/research/`
- `/publications/`
- `/books/`
- `/teaching/`
- `/academic-engagements/`
- `/golden-talent/`
- `/educational-philosophy/`

## NOINDEX — Student / transaction / utility surfaces
- `/login/`, `/register/`
- `/en/login/`, `/en/register/`
- `/fa/login/`, `/fa/register/`
- `/app/**`, `/fa/app/**`
- `/assessments/**`, `/fa/assessments/**`
- `/shop/**`, `/fa/shop/**`
- `/fa/darkhast-moshavere/`
- privacy/policy utility pages where currently marked noindex

## PRIVATE — mandatory firewall
- Humanability
- TESTLY
- Teacher Humanization
- unpublished manuscripts
- unreleased theoretical/IP material
- individual student results and counselling records

Private material must not be added to the public repository as crawlable content. NOINDEX is not considered security.

## Domain migration rule
Until the owned production domain is active, public canonicals use the current GitHub Pages host. At domain cutover, canonical, hreflang, Open Graph URL, structured-data IDs, sitemap locations and robots sitemap declaration must migrate atomically to `https://drjavadrezazadeh.com/`.

- `/fa/akhbar/moshavere-tahsili-baraye-tasmim/` — NOINDEX transition to evergreen guide

- `/fa/akhbar/che-reshteyi-baraye-man-monaseb-ast/` — NOINDEX transition to evergreen guide
