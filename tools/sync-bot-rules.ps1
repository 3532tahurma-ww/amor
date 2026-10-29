# Carmen'in bot kurallarini (js/data/bot-rules.js, Stories.BOT_RULES) Amor'a birebir aktarir (Amor.BOT_RULES),
# soru-cevap verisini de (Carmen/js/app.js: BOT_ASK, BOT_ANS...) js/data/carmen-bot.js olarak uretir.
# Kurallar degismez; sadece namespace ve baslik satiri degisir. Eski dosya js/data/bot-rules.backup.js olarak saklanir.
# Calistirma (Amor klasorunde): powershell -ExecutionPolicy Bypass -File tools\sync-bot-rules.ps1
param([string]$Source = "$PSScriptRoot\..\..\Carmen\js\data\bot-rules.js")

$ErrorActionPreference = 'Stop'
$target = Join-Path $PSScriptRoot '..\js\data\bot-rules.js'
$utf8 = New-Object System.Text.UTF8Encoding($false)

$src = [IO.File]::ReadAllText((Resolve-Path $Source), $utf8)
$i = $src.IndexOf('Stories.BOT_RULES = {')
if ($i -lt 0) { throw "Stories.BOT_RULES bulunamadi: $Source" }
$body = $src.Substring($i + 'Stories.BOT_RULES = '.Length)

# Gecerli JSON mu (bozuk dosyayi aktarma)
$json = $body.Substring(0, $body.LastIndexOf('}') + 1)
$data = $json | ConvertFrom-Json

if (Test-Path $target) { Copy-Item $target (Join-Path $PSScriptRoot '..\js\data\bot-rules.backup.js') -Force }

$head = "/* bot-editoru.bat ile duzenlenir (tools/bot-editor.html). Bicim: docs/BOT-KURALLARI.md. Carmen'den aktarildi: tools/sync-bot-rules.ps1 */`n" +
        "window.Amor = window.Amor || {};`n" +
        "Amor.BOT_RULES = "
[IO.File]::WriteAllText((Resolve-Path $target), $head + $body, $utf8)

"Aktarildi: $($data.rules.Count) kural, $($data.groups.Count) grup, $($data.verbs.Count) fiil, $($data.addons.Count) ek"

# Soru-cevap verisi ve hazir cevaplar ({cevap:...}): Carmen/js/app.js'ten bloklar birebir -> js/data/carmen-bot.js
# Bloklar baslangic / bitis satirlariyla bulunur (bitis satiri dahil degil). Carmen'in yardimci fonksiyonlari js/params.js'ten gelir.
$app = [IO.File]::ReadAllLines((Resolve-Path (Join-Path (Split-Path $Source) '..\app.js')), $utf8)
function Block($from, $to) {
  $a = [Array]::FindIndex($app, [Predicate[string]]{ param($l) $l.StartsWith($from) })
  if ($a -lt 0) { throw "Carmen app.js: bulunamadi: $from" }
  $b = [Array]::FindIndex($app, $a + 1, [Predicate[string]]{ param($l) $l.StartsWith($to) })
  if ($b -lt 0) { throw "Carmen app.js: bulunamadi: $to" }
  ($app[$a..($b - 1)] -join "`n")
}
$blocks = @(
  (Block '  const BOT_ASK = {' '  /* '),
  (Block '  const BOT_ANS = {' '  const relV ='),
  (Block '  function trEk(' '  // ')
)
$cb = "/* Otomatik uretilir: tools/sync-bot-rules.ps1 (Carmen/js/app.js'ten birebir). Elle duzenleme. */`n" +
      "window.Amor = window.Amor || {};`n" +
      "// H: Carmen'in yardimci fonksiyonlarinin Amor karsiliklari (js/params.js -> Params.helpers())`n" +
      "Amor.CarmenBot = H => {`n" +
      "  const { relV, traitVal, evAllowed, evDenied, likedTitles, likesTag, dislikesTag, hitapOf, pickOne, S, outfitItems, clItem, outfitOf, slotLine } = H;`n" +
      ($blocks -join "`n") + "`n" +
      "  return { BOT_ASK, SEX_CATS, QPRIVATE, QCOUNTER, QFRAME, yesNo, BOT_ANS, trEk };`n};`n"
[IO.File]::WriteAllText((Join-Path $PSScriptRoot '..\js\data\carmen-bot.js'), $cb, $utf8)
"Soru-cevap verisi aktarildi: js/data/carmen-bot.js"
