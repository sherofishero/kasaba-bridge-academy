const fs = require("fs");
/* UTF-8 -> latin1 yanlış okuma kaynaklı çift kodlamayı onarır.
   Mojibake alfabesindeki karakterlerin 2+ uzunluktaki dizileri
   latin1'e çevrilip UTF-8 olarak yeniden çözülür; sonuç bozuk
   (U+FFFD) çıkarsa dizi olduğu gibi bırakılır. */
const ALPHA = "ÃÂÄÅâ€œžŸ†‡‹›˜™¯°±§¿½¼¾µ¸­";
const files = [
  "app/components/Table.tsx",
  "app/components/Auction.tsx",
];
/* GÖREV: "AÇIKLAMA STE" -> "AÇIKLAMA İSTEĞİ" (hedefli, iki satır). */
for (const f of files) {
  const s = fs.readFileSync(f, "utf8");
  const out = s.split("A\u00c7IKLAMA STE").join("A\u00c7IKLAMA \u0130STE\u011e\u0130");
  if (out !== s) {
    fs.writeFileSync(f, out, "utf8");
    console.log(f, "targeted fix applied");
  }
}
for (const f of files) {
  const s = fs.readFileSync(f, "utf8");
  const re = new RegExp("[" + ALPHA.replace(/[^\S]/g, "") + "]{2,}", "g");
  const before = (s.match(re) || []).length;
  console.log(f, "| kalan mojibake run:", before);
}