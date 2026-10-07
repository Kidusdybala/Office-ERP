"""Builds dist/workforce-erp.html: one self-contained file (no mock) for publishing."""
import pathlib
r=pathlib.Path(__file__).parent
css=(r/"src/styles.css").read_text(encoding="utf-8")
js="\n".join((r/"src"/f).read_text(encoding="utf-8") for f in ["globals.js", "firebase-init.js", "utils.js", "api.js", "components/shared.js", "components/employee.js", "components/manager.js", "components/people.js", "components/detail.js", "components/device.js", "main.js"])
body=(r/"src/body.html").read_text(encoding="utf-8")
html=f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>WorkTime ERP</title>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<style>{css}</style></head><body>
{body}
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js"></script>
<script>
{js}
</script></body></html>
"""
(r/"dist").mkdir(exist_ok=True)
(r/"dist/workforce-erp.html").write_text(html, encoding="utf-8")
print("built dist/workforce-erp.html")
