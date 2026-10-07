"""Builds dist/workforce-erp.html: one self-contained file (no mock) for publishing as a Claude Artifact."""
import pathlib
r=pathlib.Path(__file__).parent
css=(r/"src/styles.css").read_text(encoding="utf-8"); js="\n".join((r/"src"/f).read_text(encoding="utf-8") for f in ["globals.js", "utils.js", "api.js", "components/shared.js", "components/employee.js", "components/manager.js", "components/people.js", "components/detail.js", "components/device.js", "main.js"]); body=(r/"src/body.html").read_text(encoding="utf-8")
html=f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>WorkTime ERP</title>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<style>{css}</style></head><body>
{body}
<script>
{js}
</script></body></html>
"""
(r/"dist").mkdir(exist_ok=True); (r/"dist/workforce-erp.html").write_text(html); print("built dist/workforce-erp.html")
