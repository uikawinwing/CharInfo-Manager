import fs from "node:fs";
const t = fs.readFileSync("dist/char_info_viewer_preview/index.html", "utf8");
const marker = '<script type="module">';
const start = t.indexOf(marker) + marker.length;
const end = t.indexOf("</script>", start);
const mod = t.slice(start, end);
fs.writeFileSync("verify_inline_module.mjs", mod);
console.log(JSON.stringify({ moduleChars: mod.length, firstLineEnd: mod.indexOf("\n") }));
